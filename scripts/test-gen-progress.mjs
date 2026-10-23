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
assert.match(sudoku, /GEN_MIN_VISIBLE = 400/);
assert.match(sudoku, /generateOffMain/);
assert.equal(sudoku.includes("Shuffling a puzzle"), false);

const worker = read("assets/js/generate-worker.js");
assert.match(worker, /importScripts/);
assert.match(worker, /setProgress/);
assert.match(worker, /type: "progress"/);

const css = read("assets/scss/components/_gen-progress.scss");
assert.match(css, /Copyright \(c\) Magic UI/);
assert.match(css, /magicui\.design/);
assert.match(css, /prefers-reduced-motion:\s*reduce/);
assert.equal(css.includes("#FF5F2E"), false);
assert.match(read("scripts/build.mjs"), /magicui\.design/);
assert.match(read("src/game.html"), /id="gen-gauge"/);
assert.match(read("src/game.html"), /aria-label="Building a puzzle"/);

console.log("gen progress tests passed", events.length, "events", "peak", peak);
