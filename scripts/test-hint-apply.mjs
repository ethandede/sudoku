// Elimination hints must change notes, persist removals for auto-candidates
// and the next solver step, and say what was ruled out when notes are empty.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {
  applyHintStep,
  legalCandidates,
  noteClears,
  peerIndexes,
  placesOnApply,
  previewSentence,
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
const claimingChain = walk((step) => step.slug === "claiming" && step.eliminate.length && step.place);
const nakedPairChain = walk((step) => step.slug === "naked-pair" && step.eliminate.length && step.place);
const xwingChain = walk((step) => step.slug === "x-wing" && step.eliminate.length && step.place);
const claiming = walk((step) => step.slug === "claiming" && step.eliminate.length);
const nakedPair = walk((step) => step.slug === "naked-pair" && step.eliminate.length);
const nakedSingle = walk((step) => step.slug === "naked-single" && step.place);
const hiddenSingle = walk((step) => step.slug === "hidden-single" && step.place);
assert.ok(
  pointing && pointingChain && claimingChain && nakedPairChain && xwingChain && claiming && nakedPair && nakedSingle && hiddenSingle,
  "fixtures for each technique"
);

function seedPlaceNotes(found) {
  const notes = emptyNotes();
  const index = found.step.place.index;
  const digit = found.step.place.digit;
  const extra = digit === 9 ? 8 : digit + 1;
  const peer = peerIndexes(index).find((other) => found.board[other] === 0);
  notes[index] = [digit, extra];
  if (peer != null) notes[peer] = [digit, extra === 1 ? 2 : 1];
  return { notes, peer, extra, digit, index };
}

function assertPlacement(found, label) {
  const seeded = seedPlaceNotes(found);
  const applied = applyHintStep(stateFrom(found, seeded.notes), found.step);
  assert.equal(applied.placed, true, `${label} places`);
  assert.equal(applied.board[seeded.index], seeded.digit, `${label} writes the solution digit`);
  assert.deepEqual(applied.notes[seeded.index], [], `${label} clears notes in the placed cell`);
  if (seeded.peer != null) {
    assert.equal(applied.notes[seeded.peer].includes(seeded.digit), false, `${label} clears the digit from a peer note`);
    assert.ok(applied.notes[seeded.peer].length > 0, `${label} keeps the peer's other notes`);
  }
  const peer = peerIndexes(seeded.index).find((other) => applied.board[other] === 0);
  if (peer != null) {
    assert.equal(
      legalCandidates(applied.board, applied.removed, peer).includes(seeded.digit),
      false,
      `${label} auto-candidates drop the placed digit`
    );
  }
  assert.match(applied.copy, /Placed/, `${label} says it placed`);
  assert.equal(applied.chain, false, `${label} does not chain another place`);
}

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
  for (const item of found.step.eliminate) {
    if (found.board[item.index] !== 0) continue;
    assert.ok(
      applied.fades.some((fade) => fade.index === item.index && fade.digit === item.digit),
      `${label} fades a digit that was not in the notes`
    );
  }
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
    assert.equal(
      withNotes.fades.some((fade) => fade.index === item.index && fade.digit === item.digit),
      false,
      `${label} does not fade a digit that was in the notes`
    );
  }
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
  assert.equal(placesOnApply(found.step), true, `${label} still places on apply`);
  assertPlacement(found, label);
}

for (const [label, found] of [
  ["pointing chain", pointingChain],
  ["claiming chain", claimingChain],
  ["naked pair chain", nakedPairChain],
  ["x-wing chain", xwingChain],
]) {
  const opened = applyHintStep(stateFrom(found, emptyNotes()), found.step);
  assert.equal(opened.chain, true, `${label} offers the placement`);
  assert.equal(opened.placed, false, `${label} waits to place`);
  const follow = SudokuSolver.explain(opened.board, opened.removed);
  assert.equal(placesOnApply(follow), true, `${label} follow-up is a single`);
  assert.equal(follow.place.index, found.step.place.index, `${label} follow-up cell`);
  assert.equal(follow.place.digit, found.step.place.digit, `${label} follow-up digit`);
  const placed = applyHintStep(
    { ...stateFrom(found, emptyNotes()), board: opened.board, removed: opened.removed, notes: opened.notes },
    follow
  );
  assert.equal(placed.board[follow.place.index], follow.place.digit, `${label} places on the next apply`);
  const peer = peerIndexes(follow.place.index).find((other) => opened.board[other] === 0 && other !== follow.place.index);
  if (peer != null) {
    const noted = emptyNotes();
    noted[peer] = [follow.place.digit, follow.place.digit === 1 ? 2 : 1];
    const withNotes = applyHintStep(
      { ...stateFrom(found, noted), board: opened.board.slice(), removed: opened.removed.map((item) => ({ ...item })) },
      follow
    );
    assert.equal(withNotes.notes[peer].includes(follow.place.digit), false, `${label} clears the digit from peer notes`);
    assert.equal(
      legalCandidates(withNotes.board, withNotes.removed, peer).includes(follow.place.digit),
      false,
      `${label} auto-candidates drop the placed digit`
    );
  }
}

// r4c6/r9c6 are a {4,6} pair in column 6. r5c6's pencil notes include 4 and
// 6 even though the solver does not count them as candidates there.
const column = Array.from({ length: 9 }, (_, row) => row * 9 + 5);
const pairStep = {
  slug: "naked-pair",
  name: "Naked pair",
  pattern: [3 * 9 + 5, 8 * 9 + 5],
  region: column,
  eliminate: [
    { index: 1 * 9 + 5, digit: 4 },
    { index: 1 * 9 + 5, digit: 6 },
    { index: 7 * 9 + 5, digit: 4 },
    { index: 7 * 9 + 5, digit: 6 },
  ],
  candidates: [
    { index: 3 * 9 + 5, digits: [4, 6] },
    { index: 8 * 9 + 5, digits: [4, 6] },
  ],
};
const pairNotes = emptyNotes();
pairNotes[4 * 9 + 5] = [4, 6, 8, 9];
pairNotes[1 * 9 + 5] = [4, 6, 1];
pairNotes[3 * 9 + 5] = [4, 6];
pairNotes[0] = [4, 6];
const pairApplied = applyHintStep(stateFrom({ puzzle: emptyNotes().map(() => 0), solution: emptyNotes().map(() => 0), board: emptyNotes().map(() => 0), removed: [] }, pairNotes), pairStep);
assert.deepEqual(pairApplied.notes[4 * 9 + 5], [8, 9], "pair digits leave notes the solver skipped");
assert.deepEqual(pairApplied.notes[1 * 9 + 5], [1], "pair digits leave notes the solver did count");
assert.deepEqual(pairApplied.notes[3 * 9 + 5], [4, 6], "the pair cells keep their own notes");
assert.deepEqual(pairApplied.notes[0], [4, 6], "a cell outside the house keeps the digits");
assert.equal(
  pairApplied.removed.some((item) => item.index === 4 * 9 + 5),
  false,
  "a note the solver never counted is not stored as a candidate removal"
);
assert.equal(noteClears(pairStep).some((item) => item.index === 4 * 9 + 5 && item.digit === 4), true);
const hidden = {
  slug: "hidden-pair",
  pattern: [3 * 9 + 5, 8 * 9 + 5],
  region: column,
  eliminate: [{ index: 3 * 9 + 5, digit: 1 }],
  candidates: [{ index: 3 * 9 + 5, digits: [4, 6] }],
};
assert.equal(
  noteClears(hidden).some((item) => item.index === 4 * 9 + 5),
  false,
  "a hidden pair does not strip the house"
);
const realPair = walk((step) => step.slug === "naked-pair" && (step.region || []).length === 9);
assert.ok(realPair, "a real naked pair is available");
const realPattern = new Set(realPair.step.pattern);
const quiet = realPair.step.region.find(
  (index) => !realPattern.has(index) && !(realPair.step.eliminate || []).some((item) => item.index === index)
);
assert.ok(quiet != null, "the house has a cell the solver does not eliminate");
const realDigits = [];
(realPair.step.candidates || []).forEach((item) => {
  if (realPattern.has(item.index)) item.digits.forEach((digit) => {
    if (!realDigits.includes(digit)) realDigits.push(digit);
  });
});
const spareDigit = [1, 2, 3, 4, 5, 6, 7, 8, 9].find((digit) => !realDigits.includes(digit));
const realNotes = emptyNotes();
realNotes[quiet] = realDigits.concat(spareDigit);
const realApplied = applyHintStep(stateFrom(realPair, realNotes), realPair.step);
assert.deepEqual(realApplied.notes[quiet], [spareDigit], "apply strips the pair from notes outside the solver targets");
assert.equal(
  realApplied.removed.some((item) => item.index === quiet && realDigits.includes(item.digit)),
  false
);

const page = fs.readFileSync(new URL("../assets/js/sudoku.js", import.meta.url), "utf8");
const applyFn = page.slice(page.indexOf("function applyHint()"), page.indexOf("function hint()"));
const stepPart = applyFn.split("const step = hintView.step;")[1];
assert.equal(stepPart.match(/pushUndo\(/g).length, 1, "an elimination apply is one undo step");
assert.ok(stepPart.indexOf("pushUndo()") < stepPart.indexOf("applyHintStep"), "undo is recorded before the step is applied");
assert.equal(previewSentence([{ index: 54, digit: 2 }]), "Rules out 2 in row 7, column 1.");
assert.equal(previewSentence([]), "");
assert.equal(previewSentence([{ index: 54, digit: 2 }]).includes("—"), false);
assert.equal(page.includes("hint.stage >= 2 ? hintStruck"), false, "stage 3 does not keep eliminated digits struck");
assert.ok(page.includes('mark.classList.add("on", "struck", "fading")'), "a digit that was not noted fades out");
assert.ok(page.includes("hint.stage === 2 ? hintStruck"), "stage 2 strikes the eliminated digit");
assert.ok(page.includes("SudokuHintApply.previewSentence"), "stage 2 says what the step rules out");
assert.ok(page.includes("fadeUntil"), "the strike fade has a deadline");
const built = fs.readFileSync(new URL("../scripts/build.mjs", import.meta.url), "utf8");
assert.ok(built.includes("previewSentence: previewSentence"), "the page can call previewSentence");
const sheet = fs.readFileSync(new URL("../assets/scss/pages/_sudoku.scss", import.meta.url), "utf8");
assert.equal(sheet.includes("--hint-eliminate"), false, "the old eliminate color is gone");
assert.ok(sheet.includes("color-mix(in srgb, var(--danger) 8%, var(--cell-bg))"), "light eliminate mix");
assert.ok(sheet.includes("color-mix(in srgb, var(--danger) 14%, var(--cell-bg))"), "dark eliminate mix");
assert.ok(sheet.includes("animation: struck-out 600ms ease-out forwards"), "the strike fades over 600ms");
assert.ok(sheet.includes(".marks span.struck.fading"), "reduced motion drops the strike animation");
assert.ok(page.includes("hintView.follow"), "a chained single is offered from the elimination hint");
assert.ok(page.includes('next.textContent = "Place it"'), "the chained action places");
assert.ok(page.includes("aria-keyshortcuts"), "the place button advertises Enter");
assert.ok(page.includes("hintSlugs: (state.hintSlugs || []).slice()"), "undo snapshots hint names");
assert.ok(page.includes("continueHint"), "a wrong digit continues into the next hint");
assert.ok(page.includes("function noteTechniqueHint(slug)"), "technique hints have one recorder");
assert.ok(page.includes("SudokuHintApply.noteClears"), "fill and apply clear house notes the solver skipped");
assert.equal(page.includes("state.hintSlugs.push(step.slug)"), false, "a hint slug is not pushed on every open");
assert.ok(page.includes("if (state.hintSlugs.includes(slug)) return"), "a technique hint is counted once per game");
assert.ok(page.includes("function noteCheck()"), "wrong-digit checks are tracked");
assert.ok(page.includes("if (state.practice) return"), "practice does not record a check");
assert.ok(page.includes("checks: state.checks || 0"), "a solve records checks separately");

console.log("hint apply ok");
