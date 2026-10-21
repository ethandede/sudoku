// Generate N puzzles per difficulty and print the grade distribution.
// Optional: node scripts/test-grader.mjs --nyt <dir-of-doks-csvs>
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const context = { console, Math, performance };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/solver.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/pools.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/generator.js"), "utf8"), context);
const { grade, countSolutions } = context.SudokuSolver;
const { generate, difficulties } = context.SudokuGenerator;

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return fallback;
  return process.argv[index + 1];
}

const perLevel = Number(argValue("--n", "50"));
const nytDir = argValue("--nyt", "");

function quantile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo);
}

function stats(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    min: sorted[0],
    p10: quantile(sorted, 0.1),
    p25: quantile(sorted, 0.25),
    p50: quantile(sorted, 0.5),
    p75: quantile(sorted, 0.75),
    p90: quantile(sorted, 0.9),
    p95: quantile(sorted, 0.95),
    max: sorted[sorted.length - 1],
    mean,
  };
}

function hist(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([key, count]) => `${key}:${count}`)
    .join(" ");
}

function num(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function fits(level, graded, clues) {
  if (!graded.solved || graded.corrupt) return false;
  if (level === "quick") return graded.rank <= 1 && graded.steps === 0 && clues >= 40 && clues <= 45;
  if (level === "easy") return graded.rank <= 2 && graded.steps === 0 && clues >= 36 && clues <= 38;
  if (level === "not easy") {
    return (
      graded.rank === 3 &&
      graded.steps >= 1 &&
      graded.steps <= 3 &&
      graded.stalls <= 2 &&
      graded.bottlenecks >= 3 &&
      graded.bottlenecks <= 11 &&
      clues >= 22 &&
      clues <= 27
    );
  }
  if (level === "hard") {
    return (
      (graded.rank === 4 || graded.rank === 5) &&
      graded.steps >= 4 &&
      graded.steps <= 16 &&
      graded.bottlenecks >= 5 &&
      graded.bottlenecks <= 21 &&
      clues >= 22 &&
      clues <= 27
    );
  }
  if (level === "expert") return graded.rank >= 6 && graded.rank <= 9 && clues >= 22 && clues <= 26;
  if (level === "mental") return graded.rank === 10 && clues >= 17 && clues <= 24;
  return false;
}

function validSolution(puzzle, solution) {
  if (!solution || solution.length !== 81) return false;
  const seen = (indexes, digit) => {
    let count = 0;
    for (const index of indexes) if (solution[index] === digit) count++;
    return count === 1;
  };
  for (let i = 0; i < 81; i++) {
    if (puzzle[i] && puzzle[i] !== solution[i]) return false;
    const digit = solution[i];
    if (digit < 1 || digit > 9) return false;
  }
  for (let r = 0; r < 9; r++) {
    for (let d = 1; d <= 9; d++) {
      const row = [];
      const col = [];
      for (let c = 0; c < 9; c++) {
        row.push(r * 9 + c);
        col.push(c * 9 + r);
      }
      if (!seen(row, d) || !seen(col, d)) return false;
    }
  }
  for (let b = 0; b < 9; b++) {
    const cells = [];
    const br = Math.floor(b / 3) * 3;
    const bc = (b % 3) * 3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cells.push((br + i) * 9 + bc + j);
    for (let d = 1; d <= 9; d++) if (!seen(cells, d)) return false;
  }
  return true;
}

const failures = [];
console.log(`Generating ${perLevel} puzzles per level\n`);
console.log("level      n   median   p95   clues                 hardest                         steps        stalls    bottlenecks          placedBeforeStall");

for (const level of difficulties) {
  const rows = [];
  for (let i = 0; i < perLevel; i++) {
    const started = performance.now();
    const result = generate(level);
    const ms = performance.now() - started;
    const fresh = grade(result.puzzle, {
      solution: result.solution,
      boxOnly: level === "quick",
    });
    const clues = result.puzzle.filter(Boolean).length;
    const problems = [];
    if (result.metadata.relaxedClues) problems.push("relaxed clues");
    if (result.metadata.offSpec) problems.push("off spec");
    if (countSolutions(result.puzzle, 2) !== 1) problems.push("not unique");
    if (!validSolution(result.puzzle, result.solution)) problems.push("bad solution");
    if (fresh.corrupt) problems.push("eliminated a solution digit");
    if (!fresh.solved) problems.push(`unsolved (${fresh.hardestName})`);
    if (level === "quick") {
      const open = grade(result.puzzle, { solution: result.solution });
      if (!open.solved || open.corrupt || open.steps !== 0 || open.rank > 2) {
        problems.push("quick is not solvable by singles");
      }
    }
    if (!fits(level, fresh, clues)) problems.push(`outside ${level} (${fresh.hardestName}, steps ${fresh.steps}, stalls ${fresh.stalls}, bn ${fresh.bottlenecks}, clues ${clues})`);
    for (const other of difficulties) {
      if (other !== level && fits(other, fresh, clues)) problems.push(`also fits ${other}`);
    }
    if (fresh.steps !== result.metadata.steps || fresh.bottlenecks !== result.metadata.bottlenecks) {
      problems.push("metadata drifted from a fresh grade");
    }
    if (problems.length && failures.length < 12) {
      failures.push({ level, problems, metadata: result.metadata });
    }
    rows.push({
      ms,
      clues,
      name: fresh.hardestName,
      steps: fresh.steps,
      stalls: fresh.stalls,
      bottlenecks: fresh.bottlenecks,
      placed: fresh.placedBeforeStall,
      pool: Boolean(result.metadata.fromPool),
      failed: problems.length > 0,
    });
  }

  const time = stats(rows.map((row) => row.ms));
  const clueStats = stats(rows.map((row) => row.clues));
  const bn = stats(rows.map((row) => row.bottlenecks));
  const placed = stats(rows.map((row) => row.placed));
  console.log(
    [
      level.padEnd(10),
      String(rows.length).padStart(2),
      `${time.p50.toFixed(0)}ms`.padStart(7),
      `${time.p95.toFixed(0)}ms`.padStart(6),
      `${num(clueStats.min)}-${num(clueStats.max)} mean ${clueStats.mean.toFixed(1)}`.padEnd(20),
      hist(rows.map((row) => row.name)).padEnd(32).slice(0, 32),
      `s ${num(stats(rows.map((row) => row.steps)).mean)}`.padEnd(12),
      `st ${num(stats(rows.map((row) => row.stalls)).mean)}`.padEnd(9),
      `bn ${bn.min}-${bn.max} mean ${bn.mean.toFixed(1)}`.padEnd(22),
      `open ${placed.min}-${placed.max} mean ${placed.mean.toFixed(1)}`,
    ].join(" ")
  );
  console.log(`  hardest ${hist(rows.map((row) => row.name))}`);
  console.log(`  clues ${hist(rows.map((row) => row.clues))}`);
  console.log(`  steps ${hist(rows.map((row) => row.steps))}`);
  console.log(`  stalls ${hist(rows.map((row) => row.stalls))}`);
  console.log(`  bottlenecks ${hist(rows.map((row) => row.bottlenecks))}`);
  console.log(`  placedBeforeStall ${hist(rows.map((row) => row.placed))}`);
  const bad = rows.filter((row) => row.failed).length;
  const pooled = rows.filter((row) => row.pool).length;
  if (pooled) console.log(`  from pool ${pooled}/${rows.length}`);
  if (bad) console.log(`  FAILURES ${bad}`);
}

const seed = "daily:2026-10-21";
const first = generate("not easy", seed);
const second = generate("not easy", seed);
const same = JSON.stringify(first.puzzle) === JSON.stringify(second.puzzle) && JSON.stringify(first.solution) === JSON.stringify(second.solution);
console.log(`\nSeeded daily stable: ${same ? "yes" : "NO"} (${seed}, clues ${first.metadata.clues}, ${first.metadata.hardestName})`);
if (!same) failures.push({ level: "not easy", problems: ["seed mismatch"] });

if (nytDir) compareNyt(nytDir);

if (failures.length) {
  console.log("\nFailures:");
  for (const failure of failures) console.log(`- ${failure.level}: ${failure.problems.join("; ")}`);
  process.exit(1);
}
console.log("\nAll generated puzzles matched their level.");

function compareNyt(dir) {
  const files = [
    ["easy", findCsv(dir, "easy")],
    ["medium", findCsv(dir, "medium")],
    ["hard", findCsv(dir, "hard")],
  ];
  const py = spawnSync(
    "python3",
    ["-c", pythonSource(files)],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  if (py.status !== 0) {
    console.error(py.stderr);
    failures.push({ level: "nyt", problems: ["python grader failed"] });
    return;
  }
  const pyRows = JSON.parse(py.stdout);
  let cursor = 0;
  console.log("\nJS vs Python on NYT archives");
  for (const [diff, file] of files) {
    const puzzles = parseCsv(fs.readFileSync(file, "utf8"));
    let solved = 0;
    let bucket = 0;
    let steps = 0;
    let corrupt = 0;
    const bn = [];
    const placed = [];
    const stepVals = [];
    const stallVals = [];
    const names = [];
    for (let i = 0; i < puzzles.length; i++) {
      const pyRow = pyRows[cursor++];
      const js = grade(puzzles[i].puzzle, { solution: puzzles[i].solution });
      if (Boolean(js.solved) === Boolean(pyRow.solved)) solved++;
      if (bucketOf(js) === bucketPy(pyRow)) bucket++;
      if (js.steps === pyRow.adv) steps++;
      if (js.corrupt) corrupt++;
      bn.push(js.bottlenecks);
      placed.push(js.placedBeforeStall);
      stepVals.push(js.steps);
      stallVals.push(js.stalls);
      names.push(js.hardestName);
    }
    const bnStats = stats(bn);
    const open = stats(placed);
    console.log(
      `${diff} n=${puzzles.length} solved ${solved}/${puzzles.length} bucket ${bucket}/${puzzles.length} steps ${steps}/${puzzles.length} corrupt ${corrupt}`
    );
    console.log(`  hardest ${hist(names)}`);
    console.log(`  steps mean ${stats(stepVals).mean.toFixed(2)} stalls mean ${stats(stallVals).mean.toFixed(2)}`);
    console.log(
      `  bottlenecks min ${bnStats.min} p10 ${num(bnStats.p10)} p50 ${num(bnStats.p50)} p90 ${num(bnStats.p90)} max ${bnStats.max} mean ${bnStats.mean.toFixed(2)}`
    );
    console.log(
      `  placedBeforeStall min ${open.min} p10 ${num(open.p10)} p50 ${num(open.p50)} p90 ${num(open.p90)} max ${open.max} mean ${open.mean.toFixed(2)}`
    );
    if (solved !== puzzles.length || bucket !== puzzles.length || steps !== puzzles.length || corrupt) {
      failures.push({ level: diff, problems: ["NYT disagreement"] });
    }
  }
}

function findCsv(dir, level) {
  const names = fs.readdirSync(dir);
  const match = names.find((name) => name.toLowerCase().includes(level) && name.endsWith(".csv"));
  if (!match) throw new Error(`No ${level} CSV in ${dir}`);
  return path.join(dir, match);
}

function bucketPy(row) {
  if (!row.solved) return "stuck";
  if (row.hardest <= 1) return "singles";
  if (row.hardest === 2) return "locked";
  if (row.hardest === 3) return "pair";
  if (row.hardest === 4) return "triple";
  if (row.hardest === 5) return "quad";
  if (row.hardest === 6) return "wing";
  if (row.hardest === 7) return "fish";
  return "other";
}

function bucketOf(graded) {
  if (!graded.solved || graded.corrupt) return graded.corrupt ? "corrupt" : "stuck";
  if (graded.rank <= 2) return "singles";
  if (graded.rank === 3) return "locked";
  if (graded.rank === 4) return "pair";
  if (graded.rank === 5) return "triple";
  if (graded.rank === 6) return "quad";
  if (graded.rank === 7 || graded.rank === 8) return "wing";
  if (graded.rank === 9) return "fish";
  if (graded.rank === 10) return "chain";
  return "stuck";
}

function parseCsv(text) {
  const rows = [];
  let i = 0;
  const len = text.length;
  function field() {
    if (text[i] === '"') {
      i += 1;
      let out = "";
      while (i < len) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') {
            out += '"';
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        out += text[i++];
      }
      if (text[i] === ",") i += 1;
      return out;
    }
    let out = "";
    while (i < len && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") out += text[i++];
    if (text[i] === ",") i += 1;
    return out;
  }
  while (i < len && text[i] !== "\n") i += 1;
  if (text[i] === "\n") i += 1;
  while (i < len) {
    if (text[i] === "\r") {
      i += 1;
      continue;
    }
    field();
    field();
    field();
    field();
    const puzzle = field();
    const solution = field();
    while (i < len && text[i] !== "\n") i += 1;
    if (text[i] === "\n") i += 1;
    if (!puzzle) continue;
    rows.push({ puzzle: JSON.parse(puzzle), solution: JSON.parse(solution) });
  }
  return rows;
}

function pythonSource(files) {
  return `
import csv, json
ns = {}
exec(open(${JSON.stringify("/home/ubuntu/.cursor/projects/workspace/uploads/solver_84e6.py")}).read(), ns)
grade = ns["grade"]
files = ${JSON.stringify(files.map(([diff, file]) => [diff, file]))}
out = []
for diff, path in files:
    with open(path, newline="") as handle:
        for row in csv.DictReader(handle):
            puzzle = json.loads(row["puzzle"])
            result = grade(puzzle)
            out.append({"solved": bool(result["solved"]), "hardest": result["hardest"], "adv": result["adv"]})
print(json.dumps(out))
`;
}
