import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const build = read("scripts/build.mjs");
const brand = read("assets/scss/components/_brand.scss");
const header = read("assets/scss/layout/_header.scss");
const footer = read("assets/scss/layout/_footer.scss");
const sudoku = read("assets/scss/pages/_sudoku.scss");

assert.match(build, /class="site-logo"/);
assert.match(build, /class="logo-word">Sudoku<span class="logo-echo">Sudoku<\/span>/);
assert.match(build, /Graded by the hardest move, not the clue count\./);
assert.match(build, /brand-kicker/);
assert.match(build, /page-header-art/);
assert.equal(build.includes("—"), false);
assert.equal(footer.includes("—"), false);

for (const source of [brand, header, footer]) {
  for (const selector of [".sudoku-grid", ".number-pad", ".erase-key", ".mode-toggle", ".cell"]) {
    assert.equal(source.includes(selector), false, `${selector} leaked into chrome CSS`);
  }
}

assert.match(sudoku, /\.play-column[\s\S]*?height:\s*100dvh/);
assert.match(brand, /html:not\(:has\(\.sudoku-page\)\) body/);
assert.equal(brand.includes("#f7f4ef"), false);
assert.equal(brand.includes("#fff8ee"), false);
assert.equal(brand.includes("Georgia"), false);

console.log("brand chrome tests passed");
