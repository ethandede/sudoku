// Fails if a stylesheet or SVG uses pure white: #fff, #ffffff, white, or rgb(255, 255, 255).
// white-space and near-whites such as #fff3cd or #fffdf8 are not pure white.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const skip = new Set(["node_modules", "dist", ".git"]);
const exts = new Set([".scss", ".css", ".svg"]);

function filesIn(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) filesIn(path, out);
    else if (exts.has(extname(name))) out.push(path);
  }
  return out;
}

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
for (const file of filesIn(root)) {
  const text = stripComments(readFileSync(file, "utf8"));
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    for (const [name, pattern] of patterns) {
      if (pattern.test(line)) hits.push(`${file}:${index + 1} ${name}: ${line.trim()}`);
    }
  });
}
assert.deepEqual(hits, [], `pure white in CSS or SVG:\n${hits.join("\n")}`);

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
  ["ink on paper", "#1f1c19", "#faf9f7"],
  ["ink on recess", "#1f1c19", "#f5f4f1"],
  ["ink on board", "#1f1c19", "#fbfaf8"],
  ["muted on paper", "#5e5954", "#faf9f7"],
  ["muted on recess", "#5e5954", "#f5f4f1"],
  ["accent on paper", "#0c4f86", "#faf9f7"],
  ["accent on recess", "#0c4f86", "#f5f4f1"],
  ["button ink on accent", "#f7f6f3", "#0c4f86"],
  ["button ink on danger", "#f7f6f3", "#8e1d28"],
  ["quiet danger on paper", "#8e1d28", "#faf9f7"],
  ["footer ink", "#f3f0eb", "#1f1c19"],
  ["footer muted", "#c4beb6", "#1f1c19"],
  ["dark ink on page", "#f3f0eb", "#141311"],
  ["dark ink on surface", "#f3f0eb", "#1c1b19"],
  ["dark ink on card", "#f3f0eb", "#242220"],
  ["dark ink on board", "#f3f0eb", "#1e1d1b"],
  ["dark muted on page", "#c4beb6", "#141311"],
  ["dark muted on card", "#c4beb6", "#242220"],
  ["dark body on page", "#c9c3bb", "#141311"],
  ["dark accent on page", "#9ed2f8", "#141311"],
  ["dark accent on card", "#9ed2f8", "#242220"],
  ["dark accent on board", "#9ed2f8", "#1e1d1b"],
  ["dark button ink on accent", "#141311", "#9ed2f8"],
  ["dark danger text", "#e7a3a0", "#141311"],
  ["dark danger text on card", "#e7a3a0", "#242220"],
  ["dark danger button", "#141311", "#e7a3a0"],
  ["selected ink", "#1f1c19", "#c0dcf1"],
  ["count on pad", "#5a534c", "#efece7"],
];

for (const [name, fg, bg] of pairs) {
  const ratio = contrast(fg, bg);
  assert.ok(ratio >= 4.5, `${name} ${fg} on ${bg} is ${ratio.toFixed(2)}, need 4.5`);
}

const variables = read("assets/scss/abstracts/_variables.scss");
const buttons = read("assets/scss/components/_buttons.scss");
const sudoku = read("assets/scss/pages/_sudoku.scss");
assert.match(variables, /\$paper:\s*#faf9f7/);
assert.match(variables, /\$recess:\s*#f5f4f1/);
assert.match(variables, /\$on-accent:\s*#f7f6f3/);
assert.match(variables, /--btn-radius:\s*0\.55rem/);
assert.match(variables, /--btn-primary:\s*#\{\$accent-color\}/);
assert.equal(variables.includes("#f5f0e6"), false);
assert.equal(variables.includes("#f7f4ef"), false);
assert.match(buttons, /translateY\(1px\)/);
assert.match(buttons, /var\(--btn-highlight\)/);
assert.equal(buttons.includes(".number-pad"), false);
assert.equal(buttons.includes(".undo-btn"), false);
assert.equal(buttons.includes(".mode-toggle"), false);
assert.equal(buttons.includes("#hint-btn"), false);
assert.match(sudoku, /--board-bg:\s*#fbfaf8/);
assert.match(sudoku, /--board-bg:\s*#1e1d1b/);
assert.match(sudoku, /\.undo-btn[\s\S]*?border:\s*0/);
assert.match(sudoku, /\.icon-btn,\s*\n\.play-home\s*\{[\s\S]*?width:\s*44px/);

console.log(`no pure white; ${pairs.length} contrast pairs pass AA`);
