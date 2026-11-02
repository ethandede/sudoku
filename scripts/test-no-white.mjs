// Fails if a stylesheet or SVG uses pure white: #fff, #ffffff, white, or rgb(255, 255, 255).
// white-space and near-whites such as #fff3cd or #fffdf8 are not pure white.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const exts = new Set([".scss", ".css", ".svg"]);
// Teddy's eye highlight is the artist's #FFF. The dog is not recolored.
const filesIn = () =>
  execFileSync("git", ["ls-files", "-z"], { cwd: root })
    .toString("utf8")
    .split("\0")
    .filter((path) => exts.has(extname(path)) && !path.startsWith("assets/img/teddy/"))
    .map((path) => join(root, path));

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
for (const file of filesIn()) {
  const text = stripComments(readFileSync(file, "utf8"));
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    for (const [name, pattern] of patterns) {
      if (pattern.test(line)) hits.push(`${file}:${index + 1} ${name}: ${line.trim()}`);
    }
  });
}
assert.deepEqual(hits, [], `pure white in CSS or SVG:\n${hits.join("\n")}`);

const teddy = read("assets/img/teddy/teddy.svg");
const teddyIcon = read("assets/img/teddy/teddy-icon.svg");
assert.equal(/#FFB08C/i.test(teddy + teddyIcon), false);
assert.match(teddyIcon, /#fbfaf8/i);
assert.match(teddy, /#E5402A/i);

function lin(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function contrast(fg, bg) {
  const lum = (hex) => {
    const n = hex.slice(1);
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const a = lum(fg);
  const b = lum(bg);
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

const pairs = [
  ["ink on paper", "#1a1d21", "#f6f7f4"],
  ["ink on recess", "#1a1d21", "#edf0eb"],
  ["ink on board", "#1a1d21", "#fbfcfa"],
  ["muted on paper", "#565c61", "#f6f7f4"],
  ["muted on recess", "#565c61", "#edf0eb"],
  ["accent on paper", "#2141a8", "#f6f7f4"],
  ["accent on recess", "#2141a8", "#edf0eb"],
  ["button ink on accent", "#f6f7f4", "#2141a8"],
  ["button ink on danger", "#f6f7f4", "#8e1d28"],
  ["quiet danger on paper", "#8e1d28", "#f6f7f4"],
  ["footer ink", "#eef1ee", "#1a1d21"],
  ["footer muted", "#b6bec2", "#1a1d21"],
  ["dark ink on page", "#eef1ee", "#111316"],
  ["dark ink on surface", "#eef1ee", "#181b1f"],
  ["dark ink on card", "#eef1ee", "#20242a"],
  ["dark ink on board", "#eef1ee", "#1a1d21"],
  ["dark muted on page", "#b6bec2", "#111316"],
  ["dark muted on card", "#b6bec2", "#20242a"],
  ["dark body on page", "#c1c8cb", "#111316"],
  ["dark accent on page", "#a9bcff", "#111316"],
  ["dark accent on card", "#a9bcff", "#20242a"],
  ["dark accent on board", "#a9bcff", "#1a1d21"],
  ["dark button ink on accent", "#111316", "#a9bcff"],
  ["dark danger text", "#e7a3a0", "#111316"],
  ["dark danger text on card", "#e7a3a0", "#20242a"],
  ["dark danger button", "#111316", "#e7a3a0"],
  ["selected ink", "#1a1d21", "#c9d5f6"],
  ["count on pad", "#50575c", "#e9ece7"],
];

for (const [name, fg, bg] of pairs) {
  const ratio = contrast(fg, bg);
  assert.ok(ratio >= 4.5, `${name} ${fg} on ${bg} is ${ratio.toFixed(2)}, need 4.5`);
}

const variables = read("assets/scss/abstracts/_variables.scss");
const buttons = read("assets/scss/components/_buttons.scss");
const sudoku = read("assets/scss/pages/_sudoku.scss");
assert.match(variables, /\$paper:\s*#f6f7f4/);
assert.match(variables, /\$recess:\s*#edf0eb/);
assert.match(variables, /\$on-accent:\s*#f6f7f4/);
assert.match(variables, /--btn-radius:\s*0\.55rem/);
assert.match(variables, /--btn-primary:\s*#\{\$accent-color\}/);
assert.equal(variables.includes("#f5f0e6"), false);
assert.equal(variables.includes("#f7f4ef"), false);
assert.match(buttons, /translateY\(var\(--btn-press\)\)/);
assert.match(buttons, /var\(--btn-duration\)/);
assert.match(buttons, /var\(--btn-ease\)/);
assert.match(buttons, /var\(--btn-highlight\)/);
assert.equal(buttons.includes(".number-pad"), false);
assert.equal(buttons.includes(".undo-btn"), false);
assert.equal(buttons.includes(".mode-toggle"), false);
assert.equal(buttons.includes("#hint-btn"), false);
assert.match(sudoku, /--board-bg:\s*#\{vars\.\$board\}/);
assert.match(sudoku, /--board-bg:\s*#\{vars\.\$dark-board\}/);
assert.match(sudoku, /\.undo-btn[\s\S]*?border:\s*0/);
assert.match(sudoku, /\n\.icon-btn\s*\{[\s\S]*?width:\s*44px/);

const siteNav = read("assets/scss/layout/_siteNav.scss");
const articles = read("assets/scss/pages/_articles.scss");
const cards = read("assets/scss/components/_uiverse.scss");
const promos = read("scripts/house-promos.mjs");
const stats = read("assets/js/stats-page.js");
assert.equal(siteNav.includes("Roboto"), false);
assert.equal(articles.includes("Courier"), false);
assert.equal(cards.includes("10px 22px"), false);
assert.match(cards, /0 -3px 0 inset/, "cards keep the adamgiebl inset lip");
assert.equal(promos.includes("Pairs, X-wings, chains."), false);
assert.equal(promos.includes("Median times, give-ups"), false);
assert.equal(stats.includes("—"), false);

console.log(`no pure white; ${pairs.length} contrast pairs pass AA`);
