import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { techniques } from "./technique-copy.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function pngSize(relativePath) {
  const png = readFileSync(join(root, relativePath));
  assert.equal(png[0], 0x89, relativePath);
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

const hashes = new Set();
for (const technique of techniques) {
  const relative = `assets/og/techniques/${technique.slug}.png`;
  assert.deepEqual(pngSize(relative), [1200, 630], relative);
  hashes.add(readFileSync(join(root, relative)).toString("base64"));
}
assert.equal(hashes.size, techniques.length);

const built = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);

function page(relativePath) {
  return readFileSync(join(root, "dist", relativePath), "utf8");
}

function alt(html) {
  const match = html.match(/property="og:image:alt" content="([^"]*)"/);
  assert.ok(match);
  return match[1];
}

const home = page("index.html");
assert.match(home, /property="og:image" content="https:\/\/sudokusudoku.com\/og\.png"/);
assert.match(home, /name="twitter:image" content="https:\/\/sudokusudoku.com\/og\.png"/);
assert.equal(home.includes("/og/techniques/"), false);

const wing = page("techniques/x-wing/index.html");
assert.match(wing, /property="og:image" content="https:\/\/sudokusudoku.com\/og\/techniques\/x-wing\.png"/);
assert.match(wing, /name="twitter:image" content="https:\/\/sudokusudoku.com\/og\/techniques\/x-wing\.png"/);
assert.equal(alt(wing), "X-wing Sudoku technique on SudokuSudoku");
assert.equal(alt(wing).includes("—"), false);
assert.deepEqual(pngSize("dist/og/techniques/x-wing.png"), [1200, 630]);

const guide = page("articles/beginners-guide/index.html");
assert.match(guide, /property="og:image" content="https:\/\/sudokusudoku.com\/og\/articles\/beginners-guide\.png"/);
assert.match(guide, /name="twitter:image" content="https:\/\/sudokusudoku.com\/og\/articles\/beginners-guide\.png"/);
assert.equal(alt(guide), "How to play Sudoku on SudokuSudoku");

const mistakes = page("articles/common-mistakes/index.html");
assert.equal(alt(mistakes), "Sudoku mistakes I still make on SudokuSudoku");
assert.notEqual(alt(wing), alt(guide));

console.log("og image tests passed");
