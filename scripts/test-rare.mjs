import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const context = vm.createContext({ console, globalThis: {} });
context.globalThis = context;
vm.runInContext(read("assets/js/rare-counter.js"), context);
const counter = context.RareCounter;

assert.equal(counter.groupDigits(42), "42");
assert.equal(counter.groupDigits(1234), "1,234");
assert.equal(counter.groupDigits(1234567), "1,234,567");
assert.equal(counter.WHEEL.length, 11);
assert.equal(counter.WHEEL[10], 0);
assert.equal(counter.LINE, 1.5);

const deleter = read("assets/js/rare-delete.js");
const game = read("src/game.html");
const sudoku = read("assets/js/sudoku.js");
assert.equal(deleter.includes("data-action"), false);
assert.equal(game.includes("rare-delete"), false);
assert.match(game, /id="account-delete-slot"/);
assert.match(game, /id="account-signout-all"/);
assert.match(game, /data-action="reset">Reset Puzzle/);
assert.match(game, /id="hint-btn"[^>]*aria-label="Hint"/);
assert.match(game, /class="hint-bulb"/);
assert.match(game, /class="hint-filament"/);
assert.equal(sudoku.includes('getElementById("hint-btn").addEventListener("click", () => advanceHint())'), true);
assert.equal(sudoku.includes("RareDelete"), false);
assert.match(read("assets/js/stats-page.js"), /Reset my stats and progress/);
assert.match(read("assets/js/skills.js"), /Clear history/);
assert.match(read("assets/js/account.js"), /Sign out everywhere/);
assert.match(read("assets/js/account.js"), /\/api\/account\/signout-all/);
assert.equal(read("assets/js/progress.js").includes("SAVE_KEY"), true);
assert.match(read("functions/api/account/signout-all.js"), /handleSignOutAll/);

console.log("rare control tests passed");
