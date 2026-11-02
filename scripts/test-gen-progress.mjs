import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const context = vm.createContext({
  console,
  performance,
  Date,
  Math,
  Uint8Array,
  Array,
  Map,
  Set,
  Object,
  String,
  Number,
  Error,
});
context.globalThis = context;
for (const file of ["assets/js/solver.js", "assets/js/pools.js", "assets/js/generator.js"]) {
  vm.runInContext(read(file), context);
}

const gen = context.SudokuGenerator;
const plain = gen.generate("hard", "progress-same");
const events = [];
const watched = gen.generate("hard", "progress-same", (info) => events.push({ ...info }));
assert.deepEqual(watched.puzzle, plain.puzzle);
assert.deepEqual(watched.solution, plain.solution);
assert.ok(events.length > 0, "hard generation emitted progress");
assert.ok(events.some((info) => info.stage === "unique"), "uniqueness stage");
assert.ok(events.some((info) => info.stage === "grade"), "grading stage");
assert.ok(events.some((info) => info.checks > 0), "uniqueness checks counted");
assert.ok(events.some((info) => info.removed > 0), "cells removed counted");
for (const info of events) {
  assert.ok(info.value >= 0 && info.value <= 96, `value ${info.value}`);
  assert.ok(["layout", "unique", "grade"].includes(info.stage), info.stage);
}
const peak = events.reduce((best, info) => Math.max(best, info.value), 0);
assert.ok(peak > 0, "progress moved");

const sudoku = read("assets/js/sudoku.js");
assert.match(sudoku, /Laying out givens/);
assert.match(sudoku, /Checking there's exactly one answer/);
assert.match(sudoku, /Grading difficulty/);
assert.match(sudoku, /GEN_SHOW_AFTER = 250/);
assert.match(sudoku, /DEAL_ROW_MS = 48/);
assert.match(sudoku, /generateOffMain/);
assert.match(sudoku, /beginDealSettle\(token, result\.puzzle, fromSearch\)/);
assert.match(sudoku, /function restoreSave/);
assert.equal(sudoku.includes("Shuffling a puzzle"), false);
assert.equal(sudoku.includes("gen-gauge"), false);
const restore = sudoku.slice(sudoku.indexOf("function restoreSave"), sudoku.indexOf("function resumeText"));
assert.equal(restore.includes("beginDealSettle"), false, "resume does not deal the board again");
assert.equal(restore.includes("startDealSearch"), false);

const worker = read("assets/js/generate-worker.js");
assert.match(worker, /importScripts/);
assert.match(worker, /setProgress/);
assert.match(worker, /type: "progress"/);

const css = read("assets/scss/components/_deal-scan.scss");
assert.match(css, /Copyright \(c\) Magic UI/);
assert.match(css, /number-ticker/);
assert.match(css, /tabular-nums/);
assert.match(css, /pointer-events:\s*none/);
assert.match(css, /prefers-reduced-motion:\s*reduce/);
assert.equal(css.includes("#FF5F2E"), false);
assert.match(read("scripts/build.mjs"), /number-ticker/);
assert.match(read("src/game.html"), /id="deal-status"/);
assert.equal(read("src/game.html").includes("gen-gauge"), false);

console.log("gen progress tests passed", events.length, "events", "peak", peak);
