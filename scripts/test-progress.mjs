import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const store = new Map();
const localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};
const context = vm.createContext({
  console,
  localStorage,
  globalThis: {},
  TextEncoder,
  TextDecoder,
  btoa,
  atob,
});
context.globalThis = context;
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/progress.js"), "utf8"), context);
const progress = context.SudokuProgress;

let failed = 0;
function check(name, ok) {
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${name}`);
  }
}

check("badge count is 30", progress.BADGES.length === 30);
check("mastered badges cover every technique", progress.TECHNIQUES.every((tech) => progress.BADGES.some((badge) => badge.id === `mastered-${tech.slug}`)));

const empty = progress.load();
check("starts locked", progress.statusOf(empty.techniques.pointing) === "locked");
check("next is naked single", progress.nextTechnique(empty) === "naked-single");

function solve(partial) {
  return progress.recordSolve(
    {
      level: "easy",
      seconds: 400,
      mistakes: 0,
      hintSlugs: [],
      path: ["naked-single"],
      at: "2026-01-01T00:00:00.000Z",
      ...partial,
    },
    partial.stats || { daily: { completed: {}, longestStreak: 0 } }
  );
}

progress.prepare({ easy: { won: 4 }, hard: { won: 0 }, daily: { won: 0, completed: {}, longestStreak: 0 } });
const hinted = solve({
  level: "not easy",
  path: ["naked-single", "hidden-single", "pointing"],
  hintSlugs: ["pointing"],
  mistakes: 1,
  at: "2026-02-01T00:00:00.000Z",
});
const afterHint = progress.load();
check("pointing hint is not clean", afterHint.techniques.pointing.clean === 0 && afterHint.techniques.pointing.hinted === 1);
check("pointing is learning", progress.statusOf(afterHint.techniques.pointing) === "learning");
check("singles stayed clean beside a pointing hint", afterHint.techniques["naked-single"].clean === 1);
check("hinted pointing does not award the first", !hinted.unlocked.includes("first-pointing"));
check("a mistake does not award spotless", !hinted.unlocked.includes("spotless"));

const clean = solve({
  level: "not easy",
  path: ["naked-single", "pointing"],
  hintSlugs: [],
  mistakes: 0,
  seconds: 100,
  at: "2026-02-02T00:00:00.000Z",
});
check("first pointing awarded", clean.unlocked.includes("first-pointing"));
check("spotless awarded", clean.unlocked.includes("spotless"));

for (let n = 0; n < 7; n += 1) {
  solve({
    level: "not easy",
    path: ["pointing"],
    at: `2026-03-0${n + 1}T00:00:00.000Z`,
  });
}
const mastered = progress.load();
check("eight clean pointings is mastered", progress.statusOf(mastered.techniques.pointing) === "mastered");
check("mastered badge stored", mastered.badges.includes("mastered-pointing"));
check("three clean is the comfortable line", progress.COMFORTABLE_AT === 3 && progress.MASTERED_AT === 8);

const beforeCeiling = progress.load();
check("best level rose to not easy", beforeCeiling.bestLevel === "not easy");
const broke = solve({
  level: "hard",
  path: ["naked-single", "naked-pair"],
  hintSlugs: [],
  mistakes: 0,
  seconds: 800,
  at: "2026-04-01T00:00:00.000Z",
});
check("ceiling breaker on a clean harder level", broke.unlocked.includes("ceiling"));
check("pair first awarded", broke.unlocked.includes("first-pair"));
check("hard no-hint awarded", broke.unlocked.includes("no-hint-hard"));
check("hard speed awarded under 15:00", broke.unlocked.includes("speed-hard"));
const again = solve({
  level: "expert",
  path: ["x-wing"],
  hintSlugs: ["x-wing"],
  mistakes: 2,
  seconds: 2000,
  at: "2026-04-02T00:00:00.000Z",
});
check("hinted x-wing is not a first", !again.unlocked.includes("first-x-wing"));
check("ceiling does not repeat", !again.unlocked.includes("ceiling"));

const completed = {};
let cursor = "2026-05-01";
for (let n = 0; n < 7; n += 1) {
  completed[cursor] = { time: 100, mistakes: 0 };
  const [y, m, d] = cursor.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  cursor = date.toISOString().slice(0, 10);
}
const streaked = solve({
  level: "daily",
  path: ["pointing"],
  stats: { daily: { completed, longestStreak: 7, won: 7 } },
  at: "2026-05-02T00:00:00.000Z",
});
check("seven-day streak awarded", streaked.unlocked.includes("streak-7"));
check("three-day streak comes with it", streaked.unlocked.includes("streak-3"));

const code = progress.encode(progress.exportBundle());
check("code prefix", code.startsWith("sudoku1."));
const decoded = progress.decode(code);
check("round trip", decoded.v === 1 && decoded.skills.badges.includes("ceiling"));
store.clear();
progress.importAll(code);
const imported = progress.load();
check("import restores mastered pointing", progress.statusOf(imported.techniques.pointing) === "mastered");
check("import unions badges", imported.badges.includes("spotless") && imported.badges.includes("ceiling"));

const local = progress.load();
local.techniques.pointing.clean = 2;
local.badges = ["spotless"];
context.localStorage.setItem("sudoku-skills", JSON.stringify(local));
progress.importAll(code);
const merged = progress.load();
check("import keeps the higher clean count", merged.techniques.pointing.clean >= 8);
check("import keeps badges from both sides", merged.badges.includes("spotless") && merged.badges.includes("first-pointing"));

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(`progress ok (${progress.BADGES.length} badges)`);
