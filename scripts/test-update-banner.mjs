import assert from "node:assert/strict";
import fs from "node:fs";
import {
  bannerVisible,
  clearReloadFlag,
  gameGate,
  shouldReload,
  stripUpdateParam,
} from "../functions/update-banner.mjs";

const playing = { counted: true, won: false, over: false };
const solved = { counted: true, won: true, over: false };
const failed = { counted: true, won: false, over: true };

assert.equal(gameGate(playing, true), "play");
assert.equal(gameGate(solved, true), "idle");
assert.equal(gameGate(failed, true), "idle");
assert.equal(gameGate({ counted: false, won: false, over: false }, true), "idle");
assert.equal(gameGate(playing, false), "idle");

assert.equal(
  bannerVisible({ waitingVersion: "b", gate: "idle", dismissedVersion: "", reloadedVersion: "" }),
  true
);
assert.equal(
  bannerVisible({ waitingVersion: "b", gate: "play", dismissedVersion: "", reloadedVersion: "" }),
  false
);
assert.equal(
  bannerVisible({ waitingVersion: "b", gate: "pending", dismissedVersion: "", reloadedVersion: "" }),
  false
);
assert.equal(
  bannerVisible({ waitingVersion: "", gate: "idle", dismissedVersion: "", reloadedVersion: "" }),
  false
);
assert.equal(
  bannerVisible({ waitingVersion: "b", gate: "idle", dismissedVersion: "b", reloadedVersion: "" }),
  false
);
assert.equal(
  bannerVisible({ waitingVersion: "c", gate: "idle", dismissedVersion: "b", reloadedVersion: "" }),
  true
);
assert.equal(
  bannerVisible({ waitingVersion: "b", gate: "idle", dismissedVersion: "", reloadedVersion: "b" }),
  false
);
assert.equal(
  bannerVisible({ waitingVersion: "c", gate: "idle", dismissedVersion: "", reloadedVersion: "b" }),
  true
);

assert.equal(shouldReload({ refreshing: false, reloadedVersion: "", waitingVersion: "b" }), true);
assert.equal(shouldReload({ refreshing: true, reloadedVersion: "", waitingVersion: "b" }), false);
assert.equal(shouldReload({ refreshing: false, reloadedVersion: "b", waitingVersion: "b" }), false);
assert.equal(shouldReload({ refreshing: false, reloadedVersion: "b", waitingVersion: "c" }), true);

assert.equal(clearReloadFlag({ reloadedVersion: "b", waitingVersion: "" }), true);
assert.equal(clearReloadFlag({ reloadedVersion: "b", waitingVersion: "b" }), false);
assert.equal(clearReloadFlag({ reloadedVersion: "b", waitingVersion: "c" }), true);
assert.equal(clearReloadFlag({ reloadedVersion: "", waitingVersion: "c" }), false);

assert.equal(stripUpdateParam("https://sudokusudoku.com/?sudoku-updated=abc"), "/");
assert.equal(
  stripUpdateParam("https://sudokusudoku.com/?daily&sudoku-updated=abc"),
  "/?daily"
);
assert.equal(stripUpdateParam("https://sudokusudoku.com/?daily"), "");

const sw = fs.readFileSync(new URL("../assets/js/sw.js", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../assets/js/sudoku.js", import.meta.url), "utf8");
assert.match(sw, /SKIP_WAITING/);
assert.match(sw, /skip-waiting/);
assert.match(sw, /networkFirstNavigation/);
assert.match(sw, /refreshShell/);
assert.match(page, /SKIP_WAITING/);
assert.match(page, /controllerchange/);
assert.match(page, /writeSave\(\)/);
assert.match(page, /SudokuUpdate/);

console.log("update banner ok");
