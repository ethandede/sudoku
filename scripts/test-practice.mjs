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

const game = fs.readFileSync(path.join(root, "assets/js/sudoku.js"), "utf8");
const fillFn = game.slice(game.indexOf("function fillTechnique"), game.indexOf("function revealCell"));
assert.equal(fillFn.split("pushUndo(").length - 1, 1, "fill all is one undo");
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
assert.equal(html.includes("—"), false);

const community = fs.readFileSync(path.join(root, "assets/js/community.js"), "utf8");
assert.match(community, /function skipFinish/);
assert.match(community, /function abandonOpen/);

console.log(
  `practice ok (hidden pair ${hidden.jumped.applied.length} steps, x-wing ${wing.jumped.applied.length} steps, naked singles ${filled.applied.length})`
);
