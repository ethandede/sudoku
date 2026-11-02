// Fill a technique applies that technique wherever it exists on the board,
// not only when it is the solver's next step.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("..", import.meta.url);
const context = { console, globalThis: null };
context.globalThis = context;
vm.createContext(context);
for (const file of ["assets/js/solver.js", "assets/js/pools.js", "assets/js/practice.js"]) {
  vm.runInContext(fs.readFileSync(new URL(file, root), "utf8"), context);
}
const { SudokuSolver: solver, SudokuPools: pools, SudokuPractice: practice } = context;

assert.equal(typeof solver.explainTechnique, "function", "solver exposes explainTechnique");

const boards = Object.values(pools).flat();

// Pointing while a single is still the next step.
let pointingCase = null;
for (const entry of boards) {
  const board = entry.puzzle.slice();
  const next = solver.explain(board, []);
  if (!next || !next.slug.endsWith("-single")) continue;
  const step = solver.explainTechnique(board, [], "pointing");
  if (step) {
    pointingCase = { entry, board, step };
    break;
  }
}
assert.ok(pointingCase, "a pool board has pointing available while a single comes first");
assert.equal(pointingCase.step.slug, "pointing");
assert.ok(pointingCase.step.eliminate.length > 0, "the pointing step removes candidates");

// Fill applies every pointing step, then stops: none is left afterwards.
{
  const board = pointingCase.board.slice();
  const removed = [];
  const result = practice.fillAll(
    board,
    removed,
    "pointing",
    (b, r) => solver.explainTechnique(b, r, "pointing"),
    pointingCase.entry.solution
  );
  assert.ok(result.applied.length >= 1, "fill applied at least one pointing step");
  assert.ok(result.applied.every((step) => step.slug === "pointing"), "fill applied only pointing");
  assert.ok(removed.length > 0, "fill recorded removed candidates");
  assert.deepEqual(board, pointingCase.board, "pointing places no digits");
  assert.equal(solver.explainTechnique(board, removed, "pointing"), null, "no pointing is left");
  for (const { index, digit } of removed) {
    assert.notEqual(pointingCase.entry.solution[index], digit, "only wrong candidates are removed");
  }
}

// A hidden single while a naked single exists.
let hiddenCase = null;
for (const entry of boards) {
  const next = solver.explain(entry.puzzle, []);
  if (!next || next.slug !== "naked-single") continue;
  const step = solver.explainTechnique(entry.puzzle, [], "hidden-single");
  if (step) {
    hiddenCase = { entry, step };
    break;
  }
}
assert.ok(hiddenCase, "a pool board has a hidden single while a naked single comes first");
assert.equal(hiddenCase.step.slug, "hidden-single");
assert.equal(hiddenCase.entry.solution[hiddenCase.step.place.index], hiddenCase.step.place.digit, "the hidden single is correct");

// Nothing to find returns null rather than another technique.
const solvedBoard = boards[0].solution.slice();
assert.equal(solver.explainTechnique(solvedBoard, [], "naked-pair"), null);

// A cell that is both a naked single and a hidden single is still a hidden
// single. Fill all hidden singles used to say none were left.
const lone = boards[0].solution.slice();
const loneAnswer = lone[0];
lone[0] = 0;
assert.equal(solver.explain(lone, []).slug, "naked-single");
const loneHidden = solver.explainTechnique(lone, [], "hidden-single");
assert.ok(loneHidden, "a naked single that is also hidden is still a hidden single");
assert.equal(loneHidden.slug, "hidden-single");
assert.equal(loneHidden.place.index, 0);
assert.equal(loneHidden.place.digit, loneAnswer);
const loneBoard = lone.slice();
const loneRemoved = [];
const loneFill = practice.fillAll(
  loneBoard,
  loneRemoved,
  "hidden-single",
  (board, removed) => solver.explainTechnique(board, removed, "hidden-single"),
  boards[0].solution
);
assert.equal(loneFill.applied.length, 1, "fill places the hidden single");
assert.equal(loneBoard[0], loneAnswer);
assert.equal(solver.explainTechnique(loneBoard, loneRemoved, "hidden-single"), null);

// Fill must not strike the answer digit when a wrong entry skewed the step.
const guardBoard = Array(81).fill(0);
const guardSolution = Array(81).fill(1);
guardSolution[4] = 7;
const guardRemoved = [];
const guarded = practice.applyStep(
  guardBoard,
  guardRemoved,
  {
    slug: "pointing",
    name: "Pointing",
    eliminate: [
      { index: 4, digit: 7 },
      { index: 5, digit: 3 },
    ],
  },
  guardSolution
);
assert.equal(guarded.changed, true);
assert.equal(
  guardRemoved.some((item) => item.index === 4 && item.digit === 7),
  false,
  "the solution digit is not removed"
);
assert.equal(guardRemoved.length, 1);
assert.equal(guardRemoved[0].index, 5);
assert.equal(guardRemoved[0].digit, 3);
const blocked = practice.applyStep(
  Array(81).fill(0),
  [],
  { slug: "pointing", eliminate: [{ index: 4, digit: 7 }] },
  guardSolution
);
assert.equal(blocked.changed, false, "a step that only removes the answer changes nothing");

console.log("fill applies a technique wherever it exists");
