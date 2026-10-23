import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stripUnpublishedLinks } from "./articles.mjs";
import { techniques } from "./technique-copy.mjs";
import { faqJsonLd, homeCopy, renderHomeBelow, renderHomeIntro } from "../home-copy.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

function plain(html) {
  return html.replace(/<[^>]+>/g, "");
}

function walkStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => walkStrings(item, out));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => walkStrings(item, out));
  return out;
}

for (const value of walkStrings(homeCopy)) {
  assert.equal(value.includes("—"), false, value);
}

assert.equal(homeCopy.title, "Free Sudoku, Graded by the Hardest Move | SudokuSudoku");
assert.equal(
  homeCopy.description,
  "Free Sudoku online, graded by the hardest move instead of the clue count. Stuck? The hint names the technique rather than handing you a number."
);
assert.equal(homeCopy.h1, "Free Sudoku, graded by the hardest move");
assert.equal(homeCopy.subhead, "Hints teach the move, not just the number.");

const game = read("src/game.html");
const build = read("scripts/build.mjs");
assert.equal(game.includes(homeCopy.title), false);
assert.equal(game.includes(homeCopy.h1), false);
assert.equal(game.includes(homeCopy.description), false);
assert.equal(game.includes(homeCopy.subhead), false);
assert.equal(game.includes("Sudoku, graded honestly."), false);
assert.match(game, /<!-- home-intro -->/);
assert.match(game, /<!-- home-below -->/);
assert.match(game, /<!-- house-slot:home-below -->/);
assert.ok(game.indexOf("house-slot:home-below") > game.indexOf("sudoku-copy"));
assert.match(build, /homeCopy\.title/);
assert.match(build, /homeCopy\.description/);
assert.match(build, /faqJsonLd\(\)/);
assert.match(build, /Graded by the hardest move, not the clue count\./);

const intro = renderHomeIntro();
assert.match(intro, new RegExp(`<h1>${homeCopy.h1}</h1>`));
assert.match(intro, new RegExp(`<p class="supporting-text">${homeCopy.subhead}</p>`));

const below = renderHomeBelow({ techniqueCount: techniques.length });
assert.match(below, /<h2>Why this Sudoku is different<\/h2>/);
assert.match(below, /<a href="\/articles\/nyt-medium-vs-hard\/">NYT Medium<\/a>/);
assert.match(below, new RegExp(`See all ${techniques.length} techniques`));
assert.match(below, /Play today's daily/);
assert.match(below, /Practice a technique/);
assert.match(below, /Why NYT Medium feels harder than Hard/);
assert.match(below, /href="\/\?daily"/);
assert.match(below, /href="\/skills\/"/);
assert.match(below, /href="\/techniques\/"/);
assert.equal(renderHomeBelow({ techniqueCount: 15 }).includes("See all 15 techniques"), true);
assert.equal(renderHomeBelow({ techniqueCount: 0 }).includes("See all"), false);
assert.equal(renderHomeBelow({ techniqueCount: 0 }).includes('href="/techniques/"'), false);

const ld = faqJsonLd();
assert.equal(ld["@type"], "FAQPage");
assert.equal(ld.mainEntity.length, homeCopy.faq.length);
const pairs = [...below.matchAll(/<dt>([^<]*)<\/dt><dd>([\s\S]*?)<\/dd>/g)];
assert.equal(pairs.length, homeCopy.faq.length);
homeCopy.faq.forEach((item, index) => {
  const visibleQuestion = pairs[index][1];
  const visibleAnswer = plain(pairs[index][2]);
  assert.equal(visibleQuestion, item.question);
  assert.equal(visibleAnswer, item.answer);
  assert.equal(ld.mainEntity[index].name, visibleQuestion);
  assert.equal(ld.mainEntity[index].acceptedAnswer.text, visibleAnswer);
});

const hidden = new Set([
  "what-makes-a-sudoku-hard",
  "does-sudoku-keep-your-brain-sharp",
  "fewest-and-most-sudoku-clues",
]);
const early = stripUnpublishedLinks(below, hidden);
assert.equal(early.includes("/articles/what-makes-a-sudoku-hard/"), false);
assert.equal(early.includes("/articles/does-sudoku-keep-your-brain-sharp/"), false);
assert.equal(early.includes("/articles/fewest-and-most-sudoku-clues/"), false);
assert.equal(early.includes("one step you haven't learned yet"), true);
assert.equal(early.includes("the number of clues"), true);
assert.equal(early.includes("Evidence that it prevents memory loss is thin"), true);
assert.equal(early.includes("/articles/nyt-medium-vs-hard/"), true);
const earlyPairs = [...early.matchAll(/<dt>([^<]*)<\/dt><dd>([\s\S]*?)<\/dd>/g)];
earlyPairs.forEach((pair, index) => {
  assert.equal(plain(pair[2]), ld.mainEntity[index].acceptedAnswer.text);
});

const live = stripUnpublishedLinks(below, new Set());
assert.match(live, /href="\/articles\/what-makes-a-sudoku-hard\/"/);
assert.match(live, /href="\/articles\/does-sudoku-keep-your-brain-sharp\/"/);
assert.match(live, /href="\/articles\/fewest-and-most-sudoku-clues\/"/);
const livePairs = [...live.matchAll(/<dt>([^<]*)<\/dt><dd>([\s\S]*?)<\/dd>/g)];
livePairs.forEach((pair, index) => {
  assert.equal(plain(pair[2]), homeCopy.faq[index].answer);
});

for (const phrase of ["easybrain", "sudoku.com", "livesudoku", "sudoku.cba.si", "sudoku app no ads"]) {
  assert.equal(below.toLowerCase().includes(phrase), false, phrase);
}
assert.equal(below.includes("—"), false);
assert.equal(below.includes("<h1"), false);

console.log("home copy tests passed");
