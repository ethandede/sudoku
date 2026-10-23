import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homeCopy } from "../home-copy.mjs";
import { techniques } from "./technique-copy.mjs";
import { breadcrumbList } from "./schema.mjs";
import {
  articleMeta,
  assertSearchTerms,
  assertUniqueMeta,
  catalogPages,
  hasEmDash,
  TECHNIQUE_SEARCH,
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

const bug = techniqueMeta({
  slug: "bug-plus-one",
  name: "BUG+1",
  description: "BUG+1 on Expert puzzles.",
});
assert.equal(bug.title, "BUG+1 Sudoku Technique, Explained on Real Boards | SudokuSudoku");
assert.equal(bug.title.includes("—"), false);
assert.equal(bug.description.includes("—"), false);
assertSearchTerms([bug]);
assert.deepEqual(
  breadcrumbList("https://sudokusudoku.com", "https://sudokusudoku.com/techniques/bug-plus-one/", "BUG+1").itemListElement.map(
    (item) => item.name
  ),
  ["Home", "Techniques", "BUG+1"]
);

const built = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);

function pngSize(relativePath) {
  const png = readFileSync(join(root, relativePath));
  assert.equal(png[0], 0x89, relativePath);
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

for (const slug of ["w-wing", "unique-rectangle", "bug-plus-one"]) {
  assert.ok(TECHNIQUE_SEARCH[slug], slug);
  assert.deepEqual(pngSize(`assets/og/techniques/${slug}.png`), [1200, 630], slug);
  const page = techniques.find((technique) => technique.slug === slug);
  assert.ok(page, slug);
  const html = readFileSync(join(root, "dist", "techniques", slug, "index.html"), "utf8");
  const meta = techniqueMeta(page);
  assert.match(html, new RegExp(`<title>${escapeRegExp(meta.title)}</title>`));
  assert.match(html, new RegExp(`property="og:image" content="https://sudokusudoku.com/og/techniques/${slug}.png"`));
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.match(html, new RegExp(`"name":"${escapeRegExp(page.name)}"`));
  assert.equal(meta.title.includes("—"), false);
  assert.equal(meta.description.includes("—"), false);
}

console.log("meta tests passed");
