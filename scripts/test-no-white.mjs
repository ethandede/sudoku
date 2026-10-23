// Fails if a stylesheet or SVG uses pure white: #fff, #ffffff, white, or rgb/rgba(255, 255, 255).
// white-space and near-whites such as #fffdf8 are not pure white.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root })
  .toString("utf8")
  .split("\0")
  .filter(Boolean);
const scanned = tracked.filter((path) => [".scss", ".css", ".svg"].includes(extname(path)));

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const patterns = [
  ["#fff", /#fff(?![0-9a-fA-F])/i],
  ["#ffffff", /#ffffff\b/i],
  ["rgb white", /rgba?\(\s*255(?:\s*,\s*|\s+)255(?:\s*,\s*|\s+)255\b/i],
  ["white keyword", /(?:^|[^-\w])white(?![\w-])/i],
];

const hits = [];
for (const file of scanned) {
  const text = stripComments(readFileSync(join(root, file), "utf8"));
  text.split("\n").forEach((line, index) => {
    for (const [name, pattern] of patterns) {
      if (pattern.test(line)) hits.push(`${file}:${index + 1} ${name}: ${line.trim()}`);
    }
  });
}
assert.deepEqual(hits, [], `pure white in CSS or SVG:\n${hits.join("\n")}`);

const sudoku = read("assets/scss/pages/_sudoku.scss");
assert.match(sudoku, /--board-bg:\s*#fbfaf8/);
assert.match(sudoku, /--cell-bg:\s*#fbfaf8/);
assert.match(sudoku, /--given-bg:\s*#fbfaf8/);
assert.match(sudoku, /--board-bg:\s*#1e1d1b/);
assert.match(sudoku, /--cell-bg:\s*#1e1d1b/);
assert.match(sudoku, /--given-bg:\s*#1e1d1b/);

const siteNav = read("assets/scss/layout/_siteNav.scss");
const articles = read("assets/scss/pages/_articles.scss");
assert.equal(siteNav.includes("Roboto"), false);
assert.equal(articles.includes("Courier"), false);
assert.match(articles, /ui-monospace, SFMono-Regular, Menlo, monospace/);

const cards = read("assets/scss/components/_uiverse.scss");
assert.equal(cards.includes("10px 22px"), false);
assert.match(cards, /box-shadow:\s*0 1px 1px rgba\(30, 35, 43, 0\.08\)/);

const promos = read("scripts/house-promos.mjs");
assert.equal(promos.includes("Pairs, X-wings, chains."), false);
assert.equal(promos.includes("Median times, give-ups"), false);
assert.match(promos, /The page names the step, then shows the board the solver actually reached\./);
assert.match(promos, /See how long a finish takes, and which hints people reach for\./);

const stats = read("assets/js/stats-page.js");
assert.equal(stats.includes("—"), false);
assert.match(stats, /return "n\/a"/);

console.log(`no pure white in ${scanned.length} stylesheets and SVGs`);
