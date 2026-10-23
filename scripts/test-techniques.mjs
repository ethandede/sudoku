import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { captureExamples } from "./capture-examples.mjs";
import { nextTechnique, orderedTechniques, techniques } from "./technique-copy.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const copy = readFileSync(new URL("./technique-copy.mjs", import.meta.url), "utf8");
const build = readFileSync(new URL("./build.mjs", import.meta.url), "utf8");

assert.equal(copy.includes("\u2014"), false, "em dash in technique copy");
assert.equal(build.includes("Next harder:"), true);
assert.match(build, /orderedTechniques\(techniques\)/);
assert.match(build, /href="\/\?practice=\$\{technique\.slug\}"/);

const SOLVER_ORDER = [
  "naked-single",
  "hidden-single",
  "pointing",
  "claiming",
  "naked-pair",
  "hidden-pair",
  "naked-triple",
  "hidden-triple",
  "quads",
  "x-wing",
  "skyscraper",
  "two-string-kite",
  "xy-wing",
  "xyz-wing",
  "swordfish",
  "coloring",
  "xy-chain",
];

const ordered = orderedTechniques();
assert.deepEqual(
  ordered.map((technique) => technique.slug),
  SOLVER_ORDER,
  "library order follows the solver, with xy-wing before swordfish"
);

for (let i = 0; i < ordered.length - 1; i += 1) {
  assert.equal(nextTechnique(ordered[i]).slug, ordered[i + 1].slug);
}
assert.equal(nextTechnique(ordered[ordered.length - 1]), null);

const wing = { slug: "w-wing", name: "W-wing", order: 84, related: [] };
const rectangle = { slug: "unique-rectangle", name: "Unique rectangle", order: 92, related: [] };
const bug = { slug: "bug-plus-one", name: "BUG+1", order: 94, related: [] };
const slotted = orderedTechniques([...techniques, bug, rectangle, wing]);
const slottedSlugs = slotted.map((technique) => technique.slug);
function follows(before, after) {
  assert.equal(slottedSlugs[slottedSlugs.indexOf(before) + 1], after, `${before} -> ${after}`);
}
follows("x-wing", "skyscraper");
follows("skyscraper", "two-string-kite");
follows("two-string-kite", "xy-wing");
follows("xy-wing", "xyz-wing");
follows("xyz-wing", "w-wing");
follows("w-wing", "swordfish");
follows("swordfish", "unique-rectangle");
follows("unique-rectangle", "bug-plus-one");
follows("bug-plus-one", "coloring");
assert.equal(nextTechnique(techniques.find((technique) => technique.slug === "x-wing"), slotted).slug, "skyscraper");

const EXPANDED = SOLVER_ORDER.filter((slug) => !["skyscraper", "two-string-kite", "xyz-wing"].includes(slug));
const bySlug = new Map(techniques.map((technique) => [technique.slug, technique]));

function proseWords(technique) {
  const chunks = [];
  for (const section of technique.sections || []) {
    if (section.h) chunks.push(section.h);
    if (section.h3) chunks.push(section.h3);
    for (const paragraph of section.p || []) chunks.push(paragraph);
    for (const item of [...(section.ol || []), ...(section.ul || [])]) chunks.push(item);
    if (section.intro) chunks.push(section.intro);
  }
  const text = chunks.join(" ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*/g, "");
  return text.split(/\s+/).filter((token) => /[A-Za-z]/.test(token)).length;
}

function cellPhrase(index) {
  const row = Math.floor(index / 9) + 1;
  const col = (index % 9) + 1;
  return `row ${row}, column ${col}`;
}

const examples = captureExamples(root);
for (const slug of EXPANDED) {
  const technique = bySlug.get(slug);
  assert.ok(technique.sections, `${slug} has a lesson`);
  const words = proseWords(technique);
  assert.ok(words >= 450 && words <= 800, `${slug} prose words ${words} outside 450-800`);
    const text = JSON.stringify(technique.sections);
    const lower = text.toLowerCase();
    assert.equal(text.includes("\u2014"), false, `${slug} em dash`);
    const step = examples[slug].step;
    const seen = new Set();
    for (const index of [...step.pattern, ...step.eliminate.map((item) => item.index)]) {
      if (seen.has(index)) continue;
      seen.add(index);
      const phrase = cellPhrase(index);
      assert.equal(lower.includes(phrase), true, `${slug} walkthrough missing ${phrase}`);
    }
    if (step.place) {
      assert.equal(lower.includes(cellPhrase(step.place.index)), true, `${slug} missing placement`);
      assert.equal(text.includes(String(step.place.digit)), true, `${slug} missing placed digit`);
    }
  for (const item of step.eliminate) {
    assert.equal(text.includes(String(item.digit)), true, `${slug} missing eliminated ${item.digit}`);
  }
}

for (const technique of techniques) {
  for (const slug of technique.related) {
    assert.ok(bySlug.has(slug), `${technique.slug} related ${slug}`);
  }
  assert.equal(Number.isFinite(technique.order), true, `${technique.slug} order`);
}

console.log(
  `technique lessons ok (${EXPANDED.map((slug) => `${slug} ${proseWords(bySlug.get(slug))}`).join(", ")})`
);

const context = { console, globalThis: {} };
context.globalThis = context;
vm.createContext(context);
for (const file of ["assets/js/solver.js", "assets/js/pools.js", "assets/js/generator.js"]) {
  vm.runInContext(readFileSync(join(root, file), "utf8"), context);
}

const { SudokuSolver: solver, SudokuGenerator: generator, SudokuPools: pools } = context;
const NEW = ["skyscraper", "two-string-kite", "xyz-wing"];

function sees(a, b) {
  const ar = Math.floor(a / 9);
  const ac = a % 9;
  const br = Math.floor(b / 9);
  const bc = b % 9;
  const sameBox = Math.floor(ar / 3) === Math.floor(br / 3) && Math.floor(ac / 3) === Math.floor(bc / 3);
  return a !== b && (ar === br || ac === bc || sameBox);
}

function walkTo(puzzle, solution, slug) {
  const board = puzzle.slice();
  let removed = [];
  for (let guard = 0; guard < 240; guard += 1) {
    const step = solver.explain(board, removed, true);
    assert.ok(step, `${slug} appears before the puzzle stalls`);
    if (step.place && solution && step.place.digit !== solution[step.place.index]) {
      assert.fail(`${step.slug} would place the wrong digit`);
    }
    for (const item of step.eliminate || []) {
      if (solution && solution[item.index] === item.digit) assert.fail(`${step.slug} removes the solution digit`);
    }
    if (step.slug === slug) return { board: board.slice(), removed: removed.slice(), step };
    if (step.place && board[step.place.index] === 0) board[step.place.index] = step.place.digit;
    if (step.eliminate && step.eliminate.length) {
      removed = removed.concat(step.eliminate.filter((item) => board[item.index] === 0));
    } else if (!step.place) break;
    removed = removed.filter((item) => board[item.index] === 0);
  }
  assert.fail(`${slug} never became the next step`);
}

function patternKey(step) {
  if (!step) return "";
  return `${step.slug}|${(step.pattern || []).slice().sort((a, b) => a - b).join(".")}`;
}

function assertSkyscraper(found) {
  const step = found.step;
  assert.equal(step.slug, "skyscraper");
  assert.equal(step.eliminate.length > 0, true);
  const digit = step.eliminate[0].digit;
  assert.equal(step.pattern.length, 4);
  const rows = [...new Set(step.pattern.map((index) => Math.floor(index / 9)))];
  const cols = [...new Set(step.pattern.map((index) => index % 9))];
  assert.equal(rows.length === 2 || cols.length === 2, true);
  const byRow = rows.length === 2;
  const lines = byRow ? rows : cols;
  for (const line of lines) {
    const onLine = step.pattern.filter((index) => (byRow ? Math.floor(index / 9) : index % 9) === line);
    assert.equal(onLine.length, 2, "each strong link has two cells");
    for (const index of onLine) assert.equal(step.pencil[index].includes(digit), true);
  }
  const cross = step.pattern.map((index) => (byRow ? index % 9 : Math.floor(index / 9)));
  const shared = cross.filter((value, index) => cross.indexOf(value) !== index);
  assert.equal(new Set(shared).size, 1, "the base is one shared line");
  const roofs = step.pattern.filter((index) => {
    const value = byRow ? index % 9 : Math.floor(index / 9);
    return value !== shared[0];
  });
  assert.equal(roofs.length, 2);
  for (const item of step.eliminate) {
    assert.equal(item.digit, digit);
    assert.equal(sees(item.index, roofs[0]) && sees(item.index, roofs[1]), true);
  }
  assert.equal(step.explain.includes("\u2014"), false);
}

function assertKite(found) {
  const step = found.step;
  assert.equal(step.slug, "two-string-kite");
  assert.equal(step.eliminate.length > 0, true);
  const digit = step.eliminate[0].digit;
  assert.equal(step.pattern.length, 4);
  const rowCounts = new Map();
  const colCounts = new Map();
  for (const index of step.pattern) {
    rowCounts.set(Math.floor(index / 9), (rowCounts.get(Math.floor(index / 9)) || 0) + 1);
    colCounts.set(index % 9, (colCounts.get(index % 9) || 0) + 1);
  }
  assert.equal([...rowCounts.values()].filter((count) => count === 2).length, 1, "one row strong link");
  assert.equal([...colCounts.values()].filter((count) => count === 2).length, 1, "one column strong link");
  for (const index of step.pattern) assert.equal(step.pencil[index].includes(digit), true);
  for (const item of step.eliminate) assert.equal(item.digit, digit);
  assert.equal(step.explain.includes("\u2014"), false);
}

function assertXyz(found) {
  const step = found.step;
  assert.equal(step.slug, "xyz-wing");
  assert.equal(step.pattern.length, 3);
  assert.equal(step.eliminate.length > 0, true);
  const digit = step.eliminate[0].digit;
  const counts = step.pattern.map((index) => step.pencil[index].length).sort((a, b) => a - b);
  assert.equal(counts.join(","), "2,2,3");
  const pivot = step.pattern.find((index) => step.pencil[index].length === 3);
  const wings = step.pattern.filter((index) => index !== pivot);
  for (const wingCell of wings) {
    assert.equal(sees(pivot, wingCell), true);
    assert.equal(step.pencil[wingCell].every((value) => step.pencil[pivot].includes(value)), true);
    assert.equal(step.pencil[wingCell].includes(digit), true);
  }
  const union = new Set(wings.flatMap((index) => step.pencil[index]));
  assert.equal(union.size, 3);
  for (const item of step.eliminate) {
    assert.equal(item.digit, digit);
    assert.equal(step.pattern.every((index) => sees(item.index, index)), true);
  }
  assert.equal(step.explain.includes("\u2014"), false);
}

for (const slug of NEW) {
  const result = generator.generateForTechnique(slug, { seed: `technique-${slug}` });
  assert.equal(result.metadata.trainApproximate, undefined);
  assert.equal(result.metadata.trainTarget, slug);
  assert.equal(solver.countSolutions(result.puzzle, 2), 1, `${slug} is unique`);
  const graded = solver.grade(result.puzzle, { solution: result.solution, metrics: false });
  assert.equal(graded.solved, true, `${slug} solves`);
  assert.equal(graded.corrupt, false, `${slug} keeps the solution`);
  assert.equal(graded.path.includes(slug), true, `${slug} is on the path`);
  assert.equal(generator.techniqueRank(slug) > 9 && generator.techniqueRank(slug) < 10, true);
  const found = walkTo(result.puzzle, result.solution, slug);
  if (slug === "skyscraper") assertSkyscraper(found);
  if (slug === "two-string-kite") assertKite(found);
  if (slug === "xyz-wing") assertXyz(found);

  const broken = found.removed.concat([{ index: found.step.pattern[0], digit: found.step.eliminate[0].digit }]);
  const after = solver.explain(found.board, broken);
  assert.notEqual(patternKey(after), patternKey(found.step), `${slug} near-miss does not repeat`);
}

const easy = generator.generate("easy", "technique-negative");
const easyGrade = solver.grade(easy.puzzle, { solution: easy.solution, metrics: false });
for (const slug of NEW) assert.equal(easyGrade.path.includes(slug), false, `easy does not need ${slug}`);

let xwing = null;
for (const item of pools.expert) {
  const board = item.puzzle.slice();
  let removed = [];
  for (let guard = 0; guard < 240; guard += 1) {
    const step = solver.explain(board, removed);
    if (!step) break;
    if (step.slug === "x-wing") {
      xwing = step;
      break;
    }
    if (step.place && board[step.place.index] === 0) board[step.place.index] = step.place.digit;
    if (step.eliminate) removed = removed.concat(step.eliminate.filter((entry) => board[entry.index] === 0));
    removed = removed.filter((entry) => board[entry.index] === 0);
  }
  if (xwing) break;
}
assert.ok(xwing, "an X-wing is still found");
assert.equal(xwing.slug, "x-wing");

let shifts = 0;
for (const level of ["not easy", "hard", "expert"]) {
  for (const item of pools[level]) {
    const graded = solver.grade(item.puzzle, { solution: item.solution, metrics: false });
    assert.equal(graded.corrupt, false);
    if (graded.rank !== item.metadata.hardestTechnique) shifts += 1;
  }
}
assert.equal(shifts, 0, "not easy, hard, and expert pool ranks stay put");

console.log("technique detectors ok");
