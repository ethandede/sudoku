import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const context = vm.createContext({ console, globalThis: {} });
context.globalThis = context;
for (const file of ["assets/js/solver.js", "assets/js/pools.js", "assets/js/generator.js", "assets/js/practice.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
}

const { SudokuGenerator: generator, SudokuSolver: solver, SudokuPractice: practice } = context;

for (const slug of Object.keys(practice.FILL_LABEL)) {
  const fromGenerator = generator.techniqueRank(slug);
  assert.equal(fromGenerator, practice.RANK[slug], `${slug} rank`);
  assert.equal(practice.fillLabel(slug).includes("—"), false);
  assert.equal(practice.promptFor(practice.fillLabel(slug)).includes("—"), false);
}

function jump(slug) {
  const result = generator.generateForTechnique(slug, { seed: `practice-${slug}` });
  assert.equal(Boolean(result.metadata && result.metadata.trainApproximate), false, `${slug} approximate`);
  assert.ok((result.metadata.path || []).includes(slug), `${slug} path`);
  const board = result.puzzle.slice();
  const removed = [];
  const jumped = practice.fastForward(board, removed, slug, solver.explain, result.solution);
  assert.equal(jumped.ready, true, `${slug} ready`);
  assert.equal(jumped.next && jumped.next.slug, slug, `${slug} next`);
  const target = practice.rankOf(slug);
  jumped.applied.forEach((step) => {
    assert.ok(practice.rankOf(step) < target, `${step} should be easier than ${slug}`);
  });
  const again = solver.explain(board, removed);
  assert.equal(again.slug, slug, `${slug} stays next`);
  return { result, jumped };
}

const hidden = jump("hidden-pair");
const wing = jump("x-wing");
assert.ok(hidden.jumped.applied.length > 0, "hidden pair jumps past easier steps");
assert.ok(wing.jumped.applied.length > 0, "x-wing jumps past easier steps");
assert.equal(practice.wantsCandidates("naked-single"), false);
assert.equal(practice.wantsCandidates("x-wing"), true);
assert.equal(practice.wantsCandidates("hidden-pair"), true);

const easy = generator.generate("easy", "practice-fill");
const board = easy.puzzle.slice();
const removed = [];
const filled = practice.fillAll(board, removed, "naked-single", solver.explain, easy.solution);
assert.ok(filled.applied.length > 1, "naked singles repeat");
assert.ok(!filled.next || filled.next.slug !== "naked-single");
const second = practice.fillAll(board, removed, "naked-single", solver.explain, easy.solution);
assert.equal(second.applied.length, 0, "a second fill finds nothing new");

assert.equal(practice.noneLeft("pointing", { name: "Naked pair" }), "No more pointing steps. Next up: Naked pair.");
assert.equal(practice.noneLeft("pointing", null), "No more pointing steps.");
assert.equal(
  practice.resultChip("pointing", [
    {
      slug: "pointing",
      eliminate: [
        { index: 1, digit: 8 },
        { index: 2, digit: 8 },
        { index: 3, digit: 3 },
        { index: 4, digit: 3 },
        { index: 5, digit: 3 },
      ],
    },
  ]),
  "Pointing: ruled out 8 from 2 cells, 3 from 3 cells."
);

const hard = generator.generate("hard", "hard.rsqhqyhm");
const hardBoard = hard.puzzle.slice();
const hardRemoved = [];
const nakedFinder = practice.stepFinder(solver.explain, solver.explainSlug, "naked-single");
const hiddenFinder = practice.stepFinder(solver.explain, solver.explainSlug, "hidden-single");
const pointingFinder = practice.stepFinder(solver.explain, solver.explainSlug, "pointing");
practice.fillAll(hardBoard, hardRemoved, "naked-single", nakedFinder, hard.solution);
practice.fillAll(hardBoard, hardRemoved, "hidden-single", hiddenFinder, hard.solution);
const pointing = practice.fillAll(hardBoard, hardRemoved, "pointing", pointingFinder, hard.solution);
assert.ok(pointing.applied.length >= 1, "pointing steps apply");
assert.match(practice.resultChip("pointing", pointing.applied), /Pointing: ruled out 8 from 2 cells/);
const afterPointing = solver.explain(hardBoard, hardRemoved);
assert.equal(afterPointing.slug, "naked-pair");
assert.equal(practice.noneLeft("pointing", afterPointing), "No more pointing steps. Next up: Naked pair.");
const pointingAgain = practice.fillAll(hardBoard, hardRemoved, "pointing", pointingFinder, hard.solution);
assert.equal(pointingAgain.applied.length, 0, "pointing does not repeat");

for (const slug of Object.keys(practice.FILL_LABEL)) {
  const found = generator.generateForTechnique(slug, { seed: `practice-${slug}` });
  const board = found.puzzle.slice();
  const removed = [];
  const ready = practice.fastForward(board, removed, slug, solver.explain, found.solution);
  const finder = practice.stepFinder(solver.explain, solver.explainSlug, slug);
  const filled = practice.fillAll(board, removed, slug, finder, found.solution);
  if (ready.ready) {
    assert.ok(filled.applied.length >= 1, `${slug} fill applies`);
    filled.applied.forEach((step) => assert.equal(step.slug, slug, `${slug} fill stays on that technique`));
    const repeat = practice.fillAll(board, removed, slug, finder, found.solution);
    assert.equal(repeat.applied.length, 0, `${slug} fill stops when none remain`);
  } else {
    assert.equal(filled.applied.length, 0, `${slug} does not invent a step`);
    const next = solver.explain(board, removed);
    assert.match(practice.noneLeft(slug, next), /^No more /);
  }
}

const game = fs.readFileSync(path.join(root, "assets/js/sudoku.js"), "utf8");
const fillFn = game.slice(game.indexOf("function fillTechnique"), game.indexOf("function revealCell"));
assert.equal(fillFn.split("pushUndo(").length - 1, 1, "fill all is one undo");
assert.equal(game.includes("isn't available yet"), false);
assert.match(game, /eliminated/);
assert.match(game, /action-chip/);
assert.match(game, /noneLeft/);
assert.match(game, /abandonOpen\(\)/);
assert.match(game, /skipFinish/);
assert.match(game, /recordPractice/);
assert.match(game, /state\.practice \|\| state\.fastForwarded/);
assert.equal(game.includes("—"), false);

const html = fs.readFileSync(path.join(root, "src/game.html"), "utf8");
assert.match(html, /id="more-fill"/);
assert.match(html, /id="more-practice"/);
assert.match(html, /id="hint-fill"/);
assert.match(html, /id="practice-prompt"/);
assert.match(html, /id="action-chip"/);
assert.equal(html.includes("—"), false);

const community = fs.readFileSync(path.join(root, "assets/js/community.js"), "utf8");
assert.match(community, /function skipFinish/);
assert.match(community, /function abandonOpen/);

console.log(
  `practice ok (hidden pair ${hidden.jumped.applied.length} steps, x-wing ${wing.jumped.applied.length} steps, naked singles ${filled.applied.length})`
);
