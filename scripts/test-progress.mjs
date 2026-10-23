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

const beforePractice = progress.load();
const seenBefore = (beforePractice.techniques["x-wing"] && beforePractice.techniques["x-wing"].seen) || 0;
const cleanBefore = (beforePractice.techniques["x-wing"] && beforePractice.techniques["x-wing"].clean) || 0;
const historyBefore = beforePractice.history.length;
const badgesBefore = beforePractice.badges.slice();
const bestBefore = beforePractice.bestLevel;
progress.recordPractice("x-wing");
const practiced = progress.load();
check("practice bumps seen only", practiced.techniques["x-wing"].seen === seenBefore + 1);
check("practice does not bump clean", (practiced.techniques["x-wing"].clean | 0) === cleanBefore);
check("practice does not write history", practiced.history.length === historyBefore);
check("practice does not award badges", practiced.badges.length === badgesBefore.length);
check("practice does not move best level", practiced.bestLevel === bestBefore);
check("unknown practice slug is ignored", !progress.load().techniques["not-a-technique"]);
progress.recordPractice("not-a-technique");
check("unknown practice slug stays ignored", !progress.load().techniques["not-a-technique"]);

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

const beforeDup = progress.load();
const pointingHinted = (beforeDup.techniques.pointing && beforeDup.techniques.pointing.hinted) || 0;
progress.recordSolve(
  {
    level: "hard",
    seconds: 800,
    mistakes: 0,
    hintSlugs: ["pointing", "pointing", "x-wing"],
    path: ["naked-single", "pointing", "x-wing"],
    checks: 3,
    at: "2026-05-01T00:00:00.000Z",
  },
  { daily: { completed: {}, longestStreak: 0 } }
);
const dupData = progress.load();
check("duplicate hint slug counts once", dupData.techniques.pointing.hinted === pointingHinted + 1);
check("x-wing hint counted once", dupData.techniques["x-wing"].hinted >= 1);
check("history stores the unique hint count", dupData.history[0].hints === 2);
check("history stores checks apart from hints", dupData.history[0].checks === 3);
check("checks do not add a technique row", !dupData.techniques.checks);
const report = progress.hintReport(dupData);
check("report counts lifetime technique hints", report.totalHints === Object.values(dupData.techniques).reduce((sum, row) => sum + (row.hinted | 0), 0));
const hardRow = report.levels.find((row) => row.level === "hard");
check("hard finishes are in the hint report", hardRow && hardRow.solves >= 1 && hardRow.checks >= 3);
check("hinted techniques sort first", report.techniques.every((row, index) => index === 0 || row.hinted <= report.techniques[index - 1].hinted));
const markup = progress.hintMarkup(dupData);
check("markup links the technique page", markup.includes("/techniques/pointing/"));
check("markup links practice", markup.includes("/?practice=pointing"));
check("markup has no em dash", !markup.includes("—"));
check("markup names checks", markup.includes("Checks"));
progress.recordSolve(
  {
    level: "easy",
    seconds: 120,
    mistakes: 0,
    hintSlugs: [],
    path: ["naked-single"],
    checks: 0,
    at: "2026-05-02T00:00:00.000Z",
  },
  { daily: { completed: {}, longestStreak: 0 } }
);
const afterClean = progress.load();
check("a clean solve does not add a hint", afterClean.history[0].hints === 0);
check("ledger keeps the earlier checks", afterClean.hintTotals.checks >= 3);
const incoming = {
  v: 1,
  skills: {
    version: 1,
    techniques: { pointing: { seen: 40, clean: 0, hinted: 40 } },
    badges: [],
    history: [
      {
        at: "2026-05-03T00:00:00.000Z",
        level: "expert",
        seconds: 400,
        mistakes: 1,
        hints: 1,
        checks: 4,
        hinted: ["xy-wing"],
        path: ["xy-wing"],
      },
    ],
    hintTotals: { checks: 4, levels: { expert: { solves: 2, hints: 2, clean: 0, checks: 4 } } },
    seeded: true,
  },
};
progress.importAll(progress.encode(incoming));
const mergedHints = progress.load();
check("merge keeps the higher hinted count", mergedHints.techniques.pointing.hinted === 40);
check("merge keeps the higher expert ledger", mergedHints.hintTotals.levels.expert.solves === 2);
check("merge keeps check history", mergedHints.history.some((item) => item.checks === 4));
check("stats markup rolls integer hint counts", progress.hintMarkup(mergedHints, { counts: true }).includes('class="count-up"'));
check("in-game hint markup does not roll", !progress.hintMarkup(mergedHints, { compact: true, counts: true }).includes("count-up"));
const beforeReset = progress.load();
check("history exists before clear", beforeReset.history.length > 0);
const cleared = progress.clearHistory();
check("clear history drops the list", cleared.history.length === 0);
check("clear history keeps technique counts", cleared.techniques.pointing && cleared.techniques.pointing.hinted === 40);
store.set("sudoku-progress", "{\"version\":1}");
store.set("sudoku-settings", "{\"theme\":\"dark\"}");
store.set("sudoku-stats", "{\"daily\":{\"won\":3}}");
progress.resetRecord();
check("reset drops the skill record", progress.load().badges.length === 0 && !progress.load().techniques.pointing);
check("reset drops on-device stats", store.get("sudoku-stats") == null);
check("reset leaves the puzzle in progress", store.get("sudoku-progress") === "{\"version\":1}");
check("reset leaves settings", store.get("sudoku-settings") === "{\"theme\":\"dark\"}");

store.set("sudoku-skills", "{");
progress.recordSolve(
  {
    level: "easy",
    seconds: 30,
    mistakes: 0,
    hintSlugs: [],
    path: ["naked-single"],
    at: "2026-06-01T00:00:00.000Z",
  },
  { daily: { completed: {}, longestStreak: 0 } }
);
check("corrupt skills are not replaced", store.get("sudoku-skills") === "{");
check("corrupt skills block later writes", progress.canSync() === false);

store.set("sudoku-skills", JSON.stringify({ version: 99, badges: ["spotless"], techniques: {} }));
progress.recordSolve(
  {
    level: "easy",
    seconds: 30,
    mistakes: 0,
    hintSlugs: [],
    path: ["naked-single"],
    at: "2026-06-02T00:00:00.000Z",
  },
  { daily: { completed: {}, longestStreak: 0 } }
);
check("a future skills file is left untouched", JSON.parse(store.get("sudoku-skills")).version === 99);

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(`progress ok (${progress.BADGES.length} badges)`);
