// Elimination hints must change notes, persist removals for auto-candidates
// and the next solver step, and say what was ruled out when notes are empty.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {
  applyHintStep,
  legalCandidates,
  placesOnApply,
} from "../functions/hint-apply.mjs";

const root = new URL("..", import.meta.url);
const context = { console, globalThis: null };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(new URL("assets/js/solver.js", root), "utf8") +
    "\n" +
    fs.readFileSync(new URL("assets/js/pools.js", root), "utf8"),
  context
);
const { SudokuSolver, SudokuPools } = context;

function stepKey(step) {
  if (!step) return "";
  const eliminate = (step.eliminate || []).map((item) => `${item.index}:${item.digit}`).sort();
  return `${step.slug}|${(step.pattern || []).join(".")}|${eliminate.join(",")}|${step.place ? `${step.place.index}:${step.place.digit}` : ""}`;
}

function walk(match) {
  for (const level of Object.keys(SudokuPools)) {
    for (const item of SudokuPools[level]) {
      const board = item.puzzle.slice();
      let removed = [];
      const seen = new Set();
      for (let guard = 0; guard < 240; guard += 1) {
        const step = SudokuSolver.explain(board, removed);
        if (!step) break;
        const key = stepKey(step);
        if (seen.has(key)) break;
        seen.add(key);
        if (match(step)) {
          return { puzzle: item.puzzle, solution: item.solution, board: board.slice(), removed: removed.slice(), step };
        }
        if (step.place && board[step.place.index] === 0 && step.place.digit === item.solution[step.place.index]) {
          board[step.place.index] = step.place.digit;
        }
        if (step.eliminate) removed = removed.concat(step.eliminate.filter((item) => board[item.index] === 0));
        removed = removed.filter((item) => board[item.index] === 0);
      }
    }
  }
  return null;
}

function emptyNotes() {
  return Array.from({ length: 81 }, () => []);
}

function stateFrom(found, notes) {
  return {
    puzzle: found.puzzle,
    solution: found.solution,
    board: found.board.slice(),
    notes: notes || emptyNotes(),
    removed: found.removed.map((item) => ({ ...item })),
  };
}

function hasRemoval(removed, item) {
  return removed.some((kept) => kept.index === item.index && kept.digit === item.digit);
}

const pointing = walk((step) => step.slug === "pointing" && step.eliminate.length && !step.place);
const pointingChain = walk((step) => step.slug === "pointing" && step.eliminate.length && step.place);
const claiming = walk((step) => step.slug === "claiming" && step.eliminate.length);
const nakedPair = walk((step) => step.slug === "naked-pair" && step.eliminate.length);
const nakedSingle = walk((step) => step.slug === "naked-single" && step.place);
const hiddenSingle = walk((step) => step.slug === "hidden-single" && step.place);
assert.ok(pointing && pointingChain && claiming && nakedPair && nakedSingle && hiddenSingle, "fixtures for each technique");

function assertElimination(found, label) {
  const fresh = stateFrom(found, emptyNotes());
  const applied = applyHintStep(fresh, found.step);
  assert.equal(applied.placed, false, `${label} does not place a digit`);
  assert.deepEqual(applied.board, found.board, `${label} leaves the digits where they were`);
  for (const item of found.step.eliminate) {
    assert.equal(applied.notes[item.index].includes(item.digit), false, `${label} notes stay without ${item.digit}`);
    if (applied.board[item.index] === 0) assert.ok(hasRemoval(applied.removed, item), `${label} records ${item.index}:${item.digit}`);
  }
  assert.match(applied.copy, /Ruled out/, `${label} names the elimination when notes are empty`);
  if (label === "pointing") assert.match(applied.copy, /row 2, columns/, "pointing names the row once");
  assert.equal(applied.copy.includes("your notes"), false, `${label} does not claim notes changed`);
  assert.equal(applied.copy.includes("—"), false, `${label} copy has no em dash`);
  for (const item of found.step.eliminate) {
    if (found.board[item.index] !== 0) continue;
    const before = legalCandidates(found.board, found.removed, item.index);
    const after = legalCandidates(applied.board, applied.removed, item.index);
    assert.ok(before.includes(item.digit), `${label} auto-candidates included ${item.digit} before`);
    assert.equal(after.includes(item.digit), false, `${label} auto-candidates drop ${item.digit}`);
  }
  const again = SudokuSolver.explain(applied.board, applied.removed);
  assert.notEqual(stepKey(again), stepKey(found.step), `${label} does not repeat`);

  const seeded = emptyNotes();
  for (const item of found.step.eliminate) {
    if (!seeded[item.index].includes(item.digit)) seeded[item.index].push(item.digit);
  }
  for (let index = 0; index < 81; index += 1) {
    const eliminated = new Set(found.step.eliminate.filter((item) => item.index === index).map((item) => item.digit));
    if (seeded[index].length && !eliminated.has(9)) seeded[index].push(9);
  }
  const withNotes = applyHintStep(stateFrom(found, seeded), found.step);
  for (const item of found.step.eliminate) {
    assert.equal(withNotes.notes[item.index].includes(item.digit), false, `${label} deletes the note`);
    if (seeded[item.index].includes(9)) assert.ok(withNotes.notes[item.index].includes(9), `${label} keeps unrelated notes`);
  }
  assert.match(withNotes.copy, /your notes/, `${label} says the notes changed`);
  for (const item of found.step.eliminate) {
    if (withNotes.board[item.index] === 0) assert.ok(hasRemoval(withNotes.removed, item), `${label} still records removals when notes exist`);
  }

  const snap = stateFrom(found, seeded);
  const beforeUndo = {
    board: snap.board.slice(),
    notes: snap.notes.map((list) => [...list]),
    removed: snap.removed.map((item) => ({ ...item })),
  };
  applyHintStep(snap, found.step);
  assert.deepEqual(snap.board, beforeUndo.board, `${label} apply does not mutate the previous board`);
  assert.deepEqual(snap.notes, beforeUndo.notes, `${label} apply does not mutate the previous notes`);
  assert.deepEqual(snap.removed, beforeUndo.removed, `${label} apply does not mutate the previous removals`);
}

assertElimination(pointing, "pointing");
assertElimination(claiming, "claiming");
assertElimination(nakedPair, "naked pair");

const chained = applyHintStep(stateFrom(pointingChain, emptyNotes()), pointingChain.step);
assert.equal(chained.chain, true, "a pointing that frees a single chains");
assert.match(chained.copy, /The next hint can place/, "the chain is described");
assert.equal(chained.placed, false, "the pointing step itself does not place");
const follow = SudokuSolver.explain(chained.board, chained.removed);
assert.ok(follow.slug === "naked-single" || follow.slug === "hidden-single", "the next hint is a single");
assert.equal(follow.place.index, pointingChain.step.place.index, "the chained single is the resulting cell");
assert.equal(follow.place.digit, pointingChain.step.place.digit, "the chained single is the resulting digit");
assert.notEqual(stepKey(follow), stepKey(pointingChain.step), "the pointing step does not repeat after it chains");

for (const [label, found] of [
  ["naked single", nakedSingle],
  ["hidden single", hiddenSingle],
]) {
  const applied = applyHintStep(stateFrom(found, emptyNotes()), found.step);
  assert.equal(placesOnApply(found.step), true, `${label} still places on apply`);
  assert.equal(applied.placed, true, `${label} writes the digit`);
  assert.equal(applied.chain, false, `${label} does not ask for another hint`);
  assert.equal(applied.board[found.step.place.index], found.step.place.digit, `${label} digit is on the board`);
  assert.match(applied.copy, /Placed/, `${label} says it placed the digit`);
}

const page = fs.readFileSync(new URL("../assets/js/sudoku.js", import.meta.url), "utf8");
const applyFn = page.slice(page.indexOf("function applyHint()"), page.indexOf("function hint()"));
const stepPart = applyFn.split("const step = hintView.step;")[1];
assert.equal(stepPart.match(/pushUndo\(/g).length, 1, "an elimination apply is one undo step");
assert.ok(stepPart.indexOf("pushUndo()") < stepPart.indexOf("applyHintStep"), "undo is recorded before the step is applied");
assert.ok(page.includes("hint.stage >= 2 ? hintStruck"), "stage 3 keeps eliminated digits struck");
assert.ok(page.includes('next.textContent = "Next hint"'), "a chained single is offered as the next hint");

console.log("hint apply ok");
