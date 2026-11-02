import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { resolveTechniqueExamples, verifyHandExample } from "./example-board.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "assets/js/solver.js"), "utf8");
const context = { console, globalThis: {} };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context);
const solver = context.SudokuSolver;
const known = new Set(["naked-single", "hidden-single", "skyscraper"]);

const skyscraper = {
  slug: "skyscraper",
  name: "Skyscraper",
  example: {
    puzzle: [0,0,0,0,0,0,2,0,0,0,0,0,8,9,0,4,7,0,3,9,0,0,0,0,0,0,0,0,0,8,6,0,4,0,0,0,0,5,0,0,0,8,0,0,9,0,4,1,3,0,0,0,5,0,0,0,0,9,7,2,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,6,3,0],
  },
};

const checked = verifyHandExample(solver, skyscraper, known);
assert.equal(checked.step.slug, "skyscraper");
assert.equal(checked.given.length, 81);
assert.ok(checked.pencil.length === 81);
assert.ok(checked.step.eliminate.length > 0);

assert.throws(
  () =>
    verifyHandExample(
      solver,
      {
        slug: "skyscraper",
        name: "Skyscraper",
        example: {
          puzzle: skyscraper.example.puzzle,
          step: { pattern: [0, 1, 2, 3] },
        },
      },
      known
    ),
  /pattern is not the solver step/
);

assert.throws(
  () =>
    verifyHandExample(
      solver,
      { slug: "skyscraper", name: "Skyscraper", example: { puzzle: Array(81).fill(0) } },
      known
    ),
  /not a unique puzzle/
);

const easy = [0,0,0,0,0,0,2,0,0,0,0,0,8,9,0,4,7,0,3,9,0,0,0,0,0,0,0,0,0,8,6,0,4,0,0,0,0,5,0,0,0,8,0,0,9,0,4,1,3,0,0,0,5,0,0,0,0,9,7,2,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,6,3,0];
assert.throws(
  () =>
    verifyHandExample(
      solver,
      {
        slug: "skyscraper",
        name: "Skyscraper",
        example: { puzzle: easy, board: easy.slice() },
      },
      known
    ),
  /not the next step/
);

const open = solver.explain(easy, [], true);
let victim = null;
for (let index = 0; index < 81 && !victim; index += 1) {
  const marks = open.pencil[index] || [];
  if (marks.length > 1) victim = { index, digit: marks[0] };
}
const handmade = verifyHandExample(
  solver,
  {
    slug: "almost-locked",
    name: "Almost locked",
    example: {
      puzzle: easy,
      board: easy.slice(),
      step: {
        look: "Look at this cell.",
        explain: "That digit is not the solution, so the stated step is legal to show.",
        pattern: [victim.index],
        eliminate: [victim],
      },
    },
  },
  known
);
assert.equal(handmade.step.slug, "almost-locked");
assert.equal(handmade.step.eliminate[0].digit, victim.digit);

const solved = [];
{
  const grid = easy.slice();
  const removed = [];
  for (let guard = 0; guard < 240; guard += 1) {
    const step = solver.explain(grid, removed, true);
    if (!step) break;
    if (step.place) grid[step.place.index] = step.place.digit;
    if (step.eliminate) removed.push(...step.eliminate.filter((item) => grid[item.index] === 0));
  }
  for (let i = 0; i < 81; i += 1) solved.push(grid[i]);
}
const solutionDigit = solved[victim.index];
assert.throws(
  () =>
    verifyHandExample(
      solver,
      {
        slug: "almost-locked",
        name: "Almost locked",
        example: {
          puzzle: easy,
          board: easy.slice(),
          step: {
            look: "Look.",
            explain: "This removes the solution.",
            pattern: [victim.index],
            eliminate: [{ index: victim.index, digit: solutionDigit }],
          },
        },
      },
      known
    ),
  /solution digit/
);

const examples = resolveTechniqueExamples(root, [
  { slug: "naked-single", name: "Naked single" },
  { slug: "not-a-technique", name: "Not a technique" },
]);
assert.ok(examples["naked-single"].step.slug === "naked-single");
assert.equal(examples["not-a-technique"], null);

console.log("example boards ok");
