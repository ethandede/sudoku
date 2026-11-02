// Technique-step counts for the "order you'll actually need them" article.
//
// NYT window: vivrao9/nyt-sudoku, data-collection/nyt-sudoku.db,
// August 30, 2021 through March 2, 2024 (495 Easy, 494 Medium, 494 Hard).
// Generated puzzles: SudokuGenerator.generate, skipping fromPool.
//
//   node articles/data/technique-order/analyze.mjs
//   node articles/data/technique-order/analyze.mjs --n 300 --db /path/to/nyt-sudoku.db
//
// Writes articles/data/technique-order/summary.json. Seeds are fixed, so a
// rerun with the same solver writes the same generated counts.

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const outPath = join(dirname(fileURLToPath(import.meta.url)), "summary.json");
const DB_URL = "https://github.com/vivrao9/nyt-sudoku/raw/master/data-collection/nyt-sudoku.db";
const WINDOW_END = "2024-03-02";

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return fallback;
  return process.argv[index + 1];
}

const perLevel = Number(argValue("--n", "300"));
const dbPath = argValue("--db", "/tmp/nyt-sudoku.db");

function loadSolver() {
  const context = { console, Math, performance };
  context.globalThis = context;
  vm.createContext(context);
  const source = readSolver().replace(
    `        info.steps++;
        info.techniques.push(tech.name);
        info.used[tech.name] = (info.used[tech.name] || 0) + 1;`,
    `        info.steps++;
        info.techniques.push(hits[0].type);
        info.used[hits[0].type] = (info.used[hits[0].type] || 0) + 1;`
  );
  if (!source.includes("info.techniques.push(hits[0].type)")) {
    throw new Error("Could not record hit.type. solver.js grade loop changed.");
  }
  vm.runInContext(source, context);
  vm.runInContext(readFile("assets/js/pools.js"), context);
  vm.runInContext(readFile("assets/js/generator.js"), context);
  return context;
}

function readFile(relative) {
  return readFileSync(join(root, relative), "utf8");
}

function readSolver() {
  return readFile("assets/js/solver.js");
}

function ensureDb() {
  const probe = spawnSync("test", ["-s", dbPath]);
  if (probe.status === 0) return;
  const download = spawnSync("curl", ["-fsSL", "-o", dbPath, DB_URL], { stdio: "inherit" });
  if (download.status !== 0) throw new Error(`Could not download ${DB_URL}`);
}

function parseDate(value) {
  if (value.includes("-")) return value.slice(0, 10);
  const [month, day, year] = value.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function emptyTally() {
  return { steps: {}, puzzles: {}, first: {}, singlePlacements: 0, techniqueSteps: 0, solved: 0, corrupt: 0 };
}

function addGrade(tally, graded) {
  if (graded.solved) tally.solved++;
  if (graded.corrupt) tally.corrupt++;
  const seen = new Set();
  for (const name of graded.techniques) {
    tally.steps[name] = (tally.steps[name] || 0) + 1;
    tally.techniqueSteps++;
    seen.add(name);
  }
  for (const name of seen) tally.puzzles[name] = (tally.puzzles[name] || 0) + 1;
  const first = graded.techniques[0] || "none";
  tally.first[first] = (tally.first[first] || 0) + 1;
  tally.singlePlacements +=
    (graded.used.single || 0) + (graded.used.hidden_box || 0) + (graded.used.hidden_line || 0);
}

function sorted(object) {
  return Object.fromEntries(Object.entries(object).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));
}

function finishTally(tally, n) {
  return {
    n,
    solved: tally.solved,
    corrupt: tally.corrupt,
    techniqueSteps: tally.techniqueSteps,
    singlePlacements: tally.singlePlacements,
    steps: sorted(tally.steps),
    puzzles: sorted(tally.puzzles),
    first: sorted(tally.first),
  };
}

ensureDb();
const { SudokuSolver, SudokuGenerator } = loadSolver();
const { grade } = SudokuSolver;
const { generate } = SudokuGenerator;
const db = new DatabaseSync(dbPath);

const nyt = {};
for (const level of ["easy", "medium", "hard"]) {
  const rows = db.prepare(`SELECT date, puzzle, solution FROM doks_${level}`).all();
  const tally = emptyTally();
  let n = 0;
  for (const row of rows) {
    if (parseDate(row.date) > WINDOW_END) continue;
    n++;
    const puzzle = JSON.parse(row.puzzle);
    const solution = JSON.parse(row.solution);
    addGrade(tally, grade(puzzle, { solution }));
  }
  nyt[level] = finishTally(tally, n);
}

const generated = {};
for (const level of ["hard", "expert", "mental"]) {
  const tally = emptyTally();
  let seeds = 0;
  let fromPool = 0;
  let offSpec = 0;
  let relaxed = 0;
  let keptRelaxed = 0;
  while (tally.solved < perLevel) {
    if (seeds > perLevel * 40) throw new Error(`${level} did not yield ${perLevel} fresh puzzles`);
    const result = generate(level, `technique-order:${level}:${seeds}`);
    seeds++;
    if (result.metadata.fromPool) {
      fromPool++;
      continue;
    }
    if (result.metadata.offSpec) {
      offSpec++;
      continue;
    }
    const graded = grade(result.puzzle, { solution: result.solution });
    if (!graded.solved || graded.corrupt) continue;
    if (result.metadata.relaxedClues) {
      relaxed++;
      keptRelaxed++;
    }
    addGrade(tally, graded);
  }
  generated[level] = {
    ...finishTally(tally, perLevel),
    seeds,
    skippedFromPool: fromPool,
    skippedOffSpec: offSpec,
    relaxedClues: keptRelaxed,
  };
  console.error(`${level}: kept ${perLevel} after ${seeds} seeds (pool ${fromPool}, off spec ${offSpec}, relaxed ${relaxed})`);
}

const summary = {
  solver: "assets/js/solver.js",
  nyt: {
    source: "https://github.com/vivrao9/nyt-sudoku",
    file: "data-collection/nyt-sudoku.db",
    window: "2021-08-30 through 2024-03-02",
    levels: nyt,
  },
  generated: {
    perLevel,
    seed: "technique-order:${level}:${i}",
    excluded: ["fromPool", "offSpec"],
    levels: generated,
  },
};

writeFileSync(outPath, JSON.stringify(summary, null, 2) + "\n");
console.log(outPath);
console.log(JSON.stringify({
  nyt: Object.fromEntries(Object.entries(nyt).map(([level, row]) => [level, { n: row.n, steps: row.steps, first: row.first }])),
  generated: Object.fromEntries(Object.entries(generated).map(([level, row]) => [level, { n: row.n, steps: row.steps, puzzles: row.puzzles, singles: row.singlePlacements, techniqueSteps: row.techniqueSteps, relaxed: row.relaxedClues }])),
}, null, 2));
