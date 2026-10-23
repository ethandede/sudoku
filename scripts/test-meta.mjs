import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homeCopy } from "../home-copy.mjs";
import { techniques } from "./technique-copy.mjs";
import {
  articleMeta,
  assertSearchTerms,
  assertUniqueMeta,
  catalogPages,
  hasEmDash,
  techniqueMeta,
} from "./seo-meta.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

assert.equal(
  techniqueMeta({ slug: "x-wing", name: "X-wing", description: "How an X-wing eliminates." }).title,
  "X-Wing Sudoku Technique, Explained on Real Boards | SudokuSudoku"
);
assert.equal(
  techniqueMeta({ slug: "xy-wing", name: "XY-wing", description: "XY-wings on Expert." }).title,
  "XY-Wing (Y-Wing) Sudoku Technique, Explained on Real Boards | SudokuSudoku"
);
assert.equal(hasEmDash("Plain title"), false);
assert.equal(hasEmDash("Bad — title"), true);
assert.equal(hasEmDash("Bad &mdash; title"), true);

assert.throws(
  () =>
    assertUniqueMeta([
      { path: "/a", title: "Same | SudokuSudoku", description: "one phrase" },
      { path: "/b", title: "Same | SudokuSudoku", description: "two phrase" },
    ]),
  /Duplicate title/
);
assert.throws(
  () =>
    assertUniqueMeta([
      { path: "/a", title: "Alpha | SudokuSudoku", description: "same words" },
      { path: "/b", title: "Beta | SudokuSudoku", description: "same words" },
    ]),
  /Duplicate description/
);
assert.throws(
  () => assertUniqueMeta([{ path: "/a", title: "Bad — title | SudokuSudoku", description: "fine words" }]),
  /em dash/
);
assert.throws(
  () =>
    assertSearchTerms([
      { path: "/a", title: "Hello | SudokuSudoku", description: "no phrase here", term: "hello world" },
    ]),
  /missing "hello world"/
);

const articles = [
  { slug: "beginners-guide", title: "How to play Sudoku", excerpt: "The rules of Sudoku." },
  { slug: "common-mistakes", title: "7 Common Sudoku Mistakes (And How to Fix Them)", excerpt: "Seven Sudoku mistakes to check." },
  { slug: "nyt-medium-vs-hard", title: "Why NYT Medium sometimes feels harder than Hard", excerpt: "NYT Medium and Hard are close." },
  { slug: "what-makes-a-sudoku-hard", title: "What Actually Makes a Sudoku Hard", excerpt: "Clue count." },
  { slug: "history-of-sudoku", title: "Where Sudoku Came From", excerpt: "A short history." },
  { slug: "sudoku-variants", title: "Sudoku Variants", excerpt: "A tour of Sudoku variants." },
  { slug: "why-ai-is-bad-at-sudoku", title: "Why AI Is Surprisingly Bad at Sudoku", excerpt: "Models miss." },
  { slug: "does-sudoku-keep-your-brain-sharp", title: "Does Sudoku Keep Your Brain Sharp?", excerpt: "Research." },
  { slug: "why-being-stuck-is-good-for-you", title: "Why Being Stuck on a Sudoku Is Good for You", excerpt: "Learning." },
  { slug: "fewest-and-most-sudoku-clues", title: "The Fewest and Most Clues a Sudoku Can Have", excerpt: "17 clues." },
];
const catalog = catalogPages({ home: homeCopy, techniques, articles });
assertUniqueMeta(catalog);
assertSearchTerms(catalog);
assert.equal(catalog[0].title, homeCopy.title);
assert.equal(catalog[0].description, homeCopy.description);
assert.equal(catalog.some((page) => page.title.includes("—")), false);

const built = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);

console.log("meta tests passed");
