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
assert.equal(filled.touches.length, filled.applied.length, "each naked single marks the cell it filled");
filled.touches.forEach((touch, index) => {
  assert.equal(touch.kind, "placed");
  assert.equal(touch.slug, "naked-single");
  assert.equal(touch.index, filled.applied[index].place.index);
});

const placedBoard = Array(81).fill(0);
const placedRemoved = [];
const placedSolution = Array(81).fill(1);
placedSolution[0] = 5;
const placedOutcome = practice.applyStep(
  placedBoard,
  placedRemoved,
  {
    slug: "naked-single",
    name: "Naked single",
    place: { index: 0, digit: 5 },
    eliminate: [
      { index: 0, digit: 3 },
      { index: 1, digit: 5 },
    ],
  },
  placedSolution
);
assert.equal(placedOutcome.placed, 0);
assert.equal(placedOutcome.cleared.length, 1);
assert.equal(placedOutcome.cleared[0].index, 1, "a placed cell is not also marked cleared");

function trailingSlug(list) {
  return list.length ? list[list.length - 1] : "";
}

for (const jumped of [hidden.jumped, wing.jumped]) {
  assert.ok(Array.isArray(jumped.touches) && jumped.touches.length > 0, "jump records cell touches");
  const batches = practice.batchesOf(jumped.touches);
  const highlight = practice.highlightOf(batches);
  const last = trailingSlug(jumped.applied);
  assert.ok(highlight.length > 0);
  assert.ok(highlight.every((cell) => cell.slug === last), "highlight is only the last batch");
  const earlier = jumped.touches.filter((touch) => touch.slug !== last);
  if (earlier.length) {
    const highlighted = new Set(highlight.map((cell) => cell.index));
    assert.ok(earlier.some((touch) => !highlighted.has(touch.index)), "earlier batches stay off the board highlight");
  }
  assert.equal(practice.reviewCopy(batches, "Pointing").includes("—"), false);
  assert.match(practice.reviewCopy(batches, "Pointing"), /Next up: Pointing\.$/);
}

const singles = practice.batchesOf(
  Array.from({ length: 14 }, (_, index) => ({
    slug: "naked-single",
    name: "Naked single",
    index,
    kind: "placed",
    digits: [4],
  })).concat(
    Array.from({ length: 6 }, (_, index) => ({
      slug: "hidden-single",
      name: "Hidden single",
      index: 20 + index,
      kind: "placed",
      digits: [6],
    }))
  )
);
assert.equal(practice.reviewCopy(singles, "Pointing"), "Naked singles 14, Hidden singles 6. Next up: Pointing.");
assert.equal(practice.highlightOf(singles).length, 6);
const interleaved = practice.batchesOf([
  { slug: "naked-single", name: "Naked single", index: 1, kind: "placed", digits: [1] },
  { slug: "hidden-single", name: "Hidden single", index: 2, kind: "placed", digits: [2] },
  { slug: "naked-single", name: "Naked single", index: 3, kind: "placed", digits: [3] },
]);
assert.equal(practice.reviewCopy(interleaved, "Pointing"), "Naked singles 2, Hidden single 1. Next up: Pointing.");
assert.equal(practice.highlightOf(interleaved).length, 1);
assert.equal(practice.highlightOf(interleaved)[0].index, 3);
assert.equal(practice.reviewCopy([singles[0]], ""), "Naked singles: 14 cells filled");
const one = practice.batchesOf([
  { slug: "naked-single", name: "Naked single", index: 4, kind: "placed", digits: [4] },
]);
assert.equal(practice.reviewCopy(one, ""), "Naked single: 1 cell filled");
assert.equal(practice.cellDetail(one[0].cells[0]), "Naked single placed 4 here.");
const pointing = practice.batchesOf(
  Array.from({ length: 6 }, (_, index) => ({
    slug: "pointing",
    name: "Pointing",
    index,
    kind: "cleared",
    digits: [7],
  }))
);
assert.equal(practice.reviewCopy(pointing, ""), "Pointing: 6 cells changed");
assert.equal(
  practice.cellDetail({ name: "Pointing", kind: "cleared", digits: [7, 2] }),
  "Pointing cleared 2, 7 here."
);
const merged = practice.batchesOf([
  { slug: "pointing", name: "Pointing", index: 3, kind: "cleared", digits: [7] },
  { slug: "pointing", name: "Pointing", index: 3, kind: "cleared", digits: [8] },
  { slug: "hidden-single", name: "Hidden single", index: 3, kind: "cleared", digits: [1] },
  { slug: "hidden-single", name: "Hidden single", index: 3, kind: "placed", digits: [4] },
]);
assert.equal(merged[0].cells.length, 1);
assert.equal(merged[0].cells[0].digits.join(","), "7,8");
assert.equal(merged[1].cells[0].kind, "placed");
assert.equal(practice.techniqueLabel("X-wing", 2), "X-wings");
assert.equal(practice.techniqueLabel("XY-chain", 2), "XY-chains");
assert.equal(practice.techniqueLabel("Pointing", 4), "Pointing");
assert.equal(practice.techniqueLabel("Quads", 2), "Quads");
assert.equal(practice.techniqueLabel("Simple coloring", 2), "Simple coloring");
assert.equal(practice.techniqueLabel("Swordfish", 2), "Swordfish");

const game = fs.readFileSync(path.join(root, "assets/js/sudoku.js"), "utf8");
const fillFn = game.slice(game.indexOf("function fillTechnique"), game.indexOf("function revealCell"));
assert.equal(fillFn.split("pushUndo(").length - 1, 1, "fill all is one undo");
assert.match(fillFn, /showFillReview\(result\.touches, ""\)/);
assert.equal(fillFn.includes("setTimeout"), false, "a fill does not schedule its own dismiss");
assert.match(game, /No dismiss timer/);
assert.match(game, /abandonOpen\(\)/);
assert.match(game, /skipFinish/);
assert.match(game, /recordPractice/);
assert.match(game, /state\.practice \|\| state\.fastForwarded/);
assert.match(game, /if \(!fillReview\) state\.undo = \[\]/);
assert.equal(game.includes("—"), false);
const prepareFn = game.slice(game.indexOf("function preparePractice"), game.indexOf("function buildTechniquePickers"));
assert.match(prepareFn, /pushUndo\(\)/);
assert.match(prepareFn, /state\.undo\.pop\(\)/);
assert.match(prepareFn, /showFillReview\(jumped\.touches, name\)/);
const undoFn = game.slice(game.indexOf("function undo("), game.indexOf("function pushUndo"));
assert.match(undoFn, /snap\.puzzle/);
assert.match(undoFn, /clearFillReview\(\)/);
const pushFn = game.slice(game.indexOf("function pushUndo"), game.indexOf("function communitySnapshot"));
assert.match(pushFn, /puzzle: state\.puzzle\.slice\(\)/);

const html = fs.readFileSync(path.join(root, "src/game.html"), "utf8");
assert.match(html, /id="more-fill"/);
assert.match(html, /id="more-practice"/);
assert.match(html, /id="hint-fill"/);
assert.match(html, /id="practice-prompt"/);
assert.equal(html.includes("—"), false);
const chrome = html.slice(html.indexOf('class="play-chrome"'), html.indexOf('class="play-surface"'));
assert.match(chrome, /id="fill-chip"/);
assert.match(chrome, /id="fill-undo"/);
assert.match(chrome, /id="fill-done"/);
assert.equal(html.slice(html.indexOf('class="play-surface"'), html.indexOf('class="controls"')).includes('id="fill-chip"'), false);

const scss = fs.readFileSync(path.join(root, "assets/scss/pages/_sudoku.scss"), "utf8");
assert.match(scss, /--fill-placed:\s*#8fbee0/);
assert.match(scss, /--fill-cleared:\s*#d7ebf8/);
assert.match(scss, /--fill-ring:\s*#0c4f86/);
assert.match(scss, /--fill-placed:\s*#3f6d90/);
assert.match(scss, /--fill-cleared:\s*#2c4d66/);
assert.match(scss, /--fill-ring:\s*#9ed2f8/);
assert.match(scss, /animation-delay:\s*var\(--fill-delay/);
assert.match(scss, /transition:\s*background-color 300ms ease/);
assert.match(scss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.cell\.fill-placed/);
assert.match(scss, /\.fill-chip[\s\S]*position:\s*absolute/);
assert.match(scss, /\.selected\.fill-placed[\s\S]*background:\s*var\(--selected\)/);

const community = fs.readFileSync(path.join(root, "assets/js/community.js"), "utf8");
assert.match(community, /function skipFinish/);
assert.match(community, /function abandonOpen/);

console.log(
  `practice ok (hidden pair ${hidden.jumped.applied.length} steps, x-wing ${wing.jumped.applied.length} steps, naked singles ${filled.applied.length})`
);
