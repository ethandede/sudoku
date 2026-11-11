// Where the teaching solver stops on AI Escargot and Inkala's 2012 grid.
// Same grader as the site. No timings.
//
//   node articles/data/solver-stops/analyze.mjs
//   node articles/data/solver-stops/analyze.mjs --db /path/to/nyt-sudoku.db
//
// Writes articles/data/solver-stops/summary.json.

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");
const outPath = join(here, "summary.json");
const DB_URL = "https://github.com/vivrao9/nyt-sudoku/raw/master/data-collection/nyt-sudoku.db";
const WINDOW_END = "2024-03-02";

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return fallback;
  return process.argv[index + 1];
}

const dbPath = argValue("--db", "/tmp/nyt-sudoku.db");

function ensureDb() {
  if (spawnSync("test", ["-s", dbPath]).status === 0) return;
  const download = spawnSync("curl", ["-fsSL", "-o", dbPath, DB_URL], { stdio: "inherit" });
  if (download.status !== 0) throw new Error(`Could not download ${DB_URL}`);
}

function parseDate(value) {
  if (value.includes("-")) return value.slice(0, 10);
  const [month, day, year] = value.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function loadSolver() {
  const context = { console, Math, performance };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(readFileSync(join(root, "assets/js/solver.js"), "utf8"), context);
  return context.SudokuSolver;
}

function fromDigits(digits) {
  if (digits.length !== 81) throw new Error(`expected 81 digits, got ${digits.length}`);
  return [...digits].map((ch) => (ch === "0" || ch === "." ? 0 : Number(ch)));
}

function report(name, digits, grade, countSolutions) {
  const puzzle = fromDigits(digits);
  const graded = grade(puzzle);
  const filled = graded.values.filter(Boolean).length;
  return {
    name,
    clues: puzzle.filter(Boolean).length,
    solutionsAtMost2: countSolutions(puzzle, 2),
    solved: graded.solved,
    corrupt: graded.corrupt,
    cellsPlaced: filled - puzzle.filter(Boolean).length,
    cellsFilled: filled,
    cellsEmpty: 81 - filled,
    steps: graded.steps,
    stalls: graded.stalls,
    hardestName: graded.hardestName,
    techniques: graded.techniques,
    path: graded.path,
    used: graded.used,
  };
}

ensureDb();
const { grade, countSolutions } = loadSolver();

const famous = [
  report(
    "AI Escargot (2006)",
    "100007090030020008009600500005300900010080002600004000300000010040000007007000300",
    grade,
    countSolutions
  ),
  report(
    "Inkala 2012",
    "800000000003600000070090200050007000000045700000100030001000068008500010090000400",
    grade,
    countSolutions
  ),
];

const db = new DatabaseSync(dbPath);
const nyt = {};
for (const level of ["easy", "medium", "hard"]) {
  const rows = db.prepare(`SELECT date, puzzle, solution FROM doks_${level}`).all();
  let n = 0;
  let solved = 0;
  let corrupt = 0;
  let multi = 0;
  for (const row of rows) {
    if (parseDate(row.date) > WINDOW_END) continue;
    n++;
    const puzzle = JSON.parse(row.puzzle);
    const solution = JSON.parse(row.solution);
    const graded = grade(puzzle, { solution });
    if (graded.solved) solved++;
    if (graded.corrupt) corrupt++;
    if (countSolutions(puzzle, 2) !== 1) multi++;
  }
  nyt[level] = { n, solved, corrupt, notUnique: multi };
}

const summary = {
  solver: "assets/js/solver.js",
  famous,
  nyt: {
    source: "https://github.com/vivrao9/nyt-sudoku",
    file: "data-collection/nyt-sudoku.db",
    window: "2021-08-30 through 2024-03-02",
    levels: nyt,
  },
};

writeFileSync(outPath, JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
