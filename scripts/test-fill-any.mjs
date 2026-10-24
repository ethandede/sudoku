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

console.log("fill applies a technique wherever it exists");
