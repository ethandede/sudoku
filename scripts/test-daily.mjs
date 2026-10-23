import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { sanitizeProgress } from "../functions/account-merge.mjs";
import { onRequest } from "../functions/daily/[[path]].js";
import {
  DAILY_START,
  dailyMeta,
  gameRequest,
  launchFields,
  listDailyDates,
  shiftIso,
  utcToday,
} from "../functions/daily-permalink.mjs";
import { hasEmDash } from "./seo-meta.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const today = utcToday();
assert.equal(today >= DAILY_START, true);

const live = gameRequest({ pathname: `/daily/${today}/`, search: "", today });
const query = gameRequest({ pathname: "/", search: "?daily", today });
assert.equal(live.countsAsDaily, true);
assert.equal(live.kind, "daily");
assert.equal(live.seed, `daily:${today}`);
assert.equal(query.seed, live.seed);
assert.equal(query.permalink, false);
assert.equal(launchFields(live, today).seed, `daily:${today}`);
assert.equal(launchFields(query, today).countsAsDaily, true);
assert.equal(launchFields({ kind: "daily" }, today).seed, `daily:${today}`);
assert.equal(launchFields({ kind: "daily" }, today).permalink, false);

const archiveDate = DAILY_START < today ? DAILY_START : "";
assert.equal(Boolean(archiveDate), true);
const archive = gameRequest({ pathname: `/daily/${archiveDate}/`, search: "", today });
const archivePlan = launchFields(archive, today);
assert.equal(archive.countsAsDaily, false);
assert.equal(archive.kind, "not easy");
assert.equal(archive.archive, true);
assert.equal(archive.seed, `daily:${archiveDate}`);
assert.equal(archivePlan.kind, "not easy");
assert.equal(archivePlan.countsAsDaily, false);
assert.equal(archivePlan.dailyDate, null);
assert.equal(archivePlan.shareDate, archiveDate);
assert.equal(archivePlan.seed, `daily:${archiveDate}`);
assert.equal(archivePlan.difficulty, "not easy");
assert.equal(launchFields({ unavailable: true }, today).unavailable, true);
assert.equal(
  launchFields({ archive: true, kind: "daily", shareDate: archiveDate, permalink: true }, today).kind,
  "not easy"
);
assert.equal(
  launchFields({ archive: true, kind: "daily", shareDate: archiveDate }, today).countsAsDaily,
  false
);

assert.equal(gameRequest({ pathname: `/daily/${shiftIso(today, 1)}/`, search: "", today }).unavailable, true);
assert.equal(gameRequest({ pathname: "/daily/2026-02-31/", search: "", today }).unavailable, true);
assert.equal(gameRequest({ pathname: "/daily/2026-10-20/", search: "", today }).unavailable, true);
assert.equal(gameRequest({ pathname: "/daily/nope/", search: "", today }).unavailable, true);
assert.equal(gameRequest({ pathname: "/", search: "", today }), null);
assert.equal(gameRequest({ pathname: "/", search: "?p=not-easy.abcdefgh", today }), null);

const context = { console, Math, performance, crypto };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(readFileSync(join(root, "assets/js/solver.js"), "utf8"), context);
vm.runInContext(readFileSync(join(root, "assets/js/pools.js"), "utf8"), context);
vm.runInContext(readFileSync(join(root, "assets/js/generator.js"), "utf8"), context);
const generate = context.SudokuGenerator.generate;
const fromPermalink = generate("not easy", live.seed);
const fromQuery = generate("not easy", `daily:${today}`);
assert.equal(fromPermalink.puzzle.join(""), fromQuery.puzzle.join(""));
assert.equal(fromPermalink.solution.join(""), fromQuery.solution.join(""));
const fromArchive = generate("not easy", archivePlan.seed);
const fromArchiveSeed = generate("not easy", `daily:${archiveDate}`);
assert.equal(fromArchive.puzzle.join(""), fromArchiveSeed.puzzle.join(""));
assert.notEqual(fromArchive.puzzle.join(""), fromPermalink.puzzle.join(""));

const progressContext = vm.createContext({
  console,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  globalThis: {},
  TextEncoder,
  TextDecoder,
  btoa,
  atob,
});
progressContext.globalThis = progressContext;
vm.runInContext(readFileSync(join(root, "assets/js/progress.js"), "utf8"), progressContext);
const progress = progressContext.SudokuProgress;
const progressSource = readFileSync(join(root, "assets/js/progress.js"), "utf8");
assert.match(progressSource, /while \(completed\[cursor\]\)/);

function bucket() {
  return { played: 0, won: 0, best: null, totalTime: 0 };
}
const stats = {
  daily: {
    ...bucket(),
    completed: { [shiftIso(today, -1)]: { time: 80, mistakes: 0 } },
    longestStreak: 1,
  },
  "not easy": bucket(),
};
const before = progress.currentStreak(stats, today);
assert.equal(before, 1);
const archiveKey = archivePlan.countsAsDaily ? "daily" : archivePlan.kind;
assert.equal(archiveKey, "not easy");
stats[archiveKey].won += 1;
stats[archiveKey].played += 1;
assert.equal(stats.daily.completed[archiveDate], undefined);
assert.equal(progress.currentStreak(stats, today), before);
const livePlan = launchFields(live, today);
assert.equal(livePlan.countsAsDaily, true);
stats.daily.completed[livePlan.dailyDate] = { time: 50, mistakes: 0 };
assert.equal(progress.currentStreak(stats, today), 2);

const sudoku = readFileSync(join(root, "assets/js/sudoku.js"), "utf8");
assert.match(sudoku, /SudokuDaily\.gameRequest/);
assert.match(sudoku, /SudokuDaily\.launchFields/);
assert.match(sudoku, /state\.kind = plan \? plan\.kind : kind/);
assert.match(sudoku, /window\.SudokuShare\.dailyUrl\(dailyDate\)/);
assert.match(sudoku, /window\.SudokuShare\.puzzleUrl\(puzzleId\)/);
const recordWin = sudoku.slice(sudoku.indexOf("function recordWin"), sudoku.indexOf("function solutionPath"));
assert.match(recordWin, /const key = state\.kind === "daily" \? "daily" : state\.kind/);
assert.match(recordWin, /stats\.daily\.completed\[state\.dailyDate\]/);

const share = readFileSync(join(root, "assets/js/share.js"), "utf8");
assert.match(share, /\/daily\/\$\{match\[1\]\}-\$\{match\[2\]\}-\$\{match\[3\]\}\//);

const kept = sanitizeProgress({
  version: 1,
  kind: "not easy",
  puzzle: Array(81).fill(0),
  solution: Array(81).fill(0),
  board: Array(81).fill(0),
  updatedAt: 5,
  shareDate: archiveDate,
  permalink: true,
});
assert.equal(kept.shareDate, archiveDate);
assert.equal(kept.permalink, true);
assert.equal(kept.kind, "not easy");
assert.equal(sanitizeProgress({ ...kept, shareDate: "tomorrow" }).shareDate, null);

const meta = dailyMeta(today);
assert.equal(hasEmDash(meta.title), false);
assert.equal(hasEmDash(meta.description), false);
assert.equal(meta.title.startsWith("Daily Sudoku for "), true);
assert.equal(listDailyDates(today).includes(shiftIso(today, 1)), false);
assert.equal(listDailyDates(shiftIso(DAILY_START, -1)).length, 0);

const fixture = `<!DOCTYPE html><html><head>
<title>Free Sudoku, Graded by the Hardest Move | SudokuSudoku</title>
<meta name="description" content="Free Sudoku online.">
<link rel="canonical" href="https://sudokusudoku.com/">
<meta property="og:title" content="Free Sudoku, Graded by the Hardest Move | SudokuSudoku">
<meta property="og:description" content="Free Sudoku online.">
<meta property="og:url" content="https://sudokusudoku.com/">
<meta name="twitter:title" content="Free Sudoku, Graded by the Hardest Move | SudokuSudoku">
<meta name="twitter:description" content="Free Sudoku online.">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"SudokuSudoku","url":"https://sudokusudoku.com/"}]}</script>
</head><body><h1>Free Sudoku, graded by the hardest move</h1><div id="sudoku-grid"></div><div id="number-pad"></div></body></html>`;

function requestContext(pathname) {
  return {
    request: new Request(`https://sudokusudoku.com${pathname}`),
    env: {
      ASSETS: {
        async fetch(request) {
          const path = new URL(request.url).pathname;
          if (path === "/index.html" || path === "/") return new Response(fixture, { status: 200 });
          if (path === "/page-not-found.txt") {
            return new Response("<title>Page not found | SudokuSudoku</title><h1>Page not found</h1>", {
              status: 200,
            });
          }
          return new Response("missing", { status: 404 });
        },
      },
    },
  };
}

const page = await onRequest(requestContext(`/daily/${today}/`));
assert.equal(page.status, 200);
assert.equal(page.headers.get("content-type"), "text/html; charset=utf-8");
assert.equal(page.headers.get("x-robots-tag"), null);
const html = await page.text();
assert.equal(html.includes(`<title>${meta.title}</title>`), true);
assert.equal(html.includes(`<meta name="description" content="${meta.description}">`), true);
assert.equal(html.includes(`<link rel="canonical" href="https://sudokusudoku.com/daily/${today}/">`), true);
assert.equal(html.includes(`<h1>${meta.crumb}</h1>`), true);
assert.equal(html.includes('id="sudoku-grid"'), true);
assert.equal(html.includes('id="number-pad"'), true);
const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const crumbs = graph["@graph"].find((node) => node["@type"] === "BreadcrumbList");
assert.deepEqual(
  crumbs.itemListElement.map((item) => item.name),
  ["Home", meta.crumb]
);
assert.equal(crumbs.itemListElement[0].item, "https://sudokusudoku.com/");
assert.equal(crumbs.itemListElement.at(-1).item, `https://sudokusudoku.com/daily/${today}/`);
assert.equal(crumbs.itemListElement.at(-1).name, html.match(/<h1>([^<]*)<\/h1>/)[1]);

const bare = await onRequest(requestContext(`/daily/${archiveDate}`));
assert.equal(bare.status, 301);
assert.equal(new URL(bare.headers.get("location")).pathname, `/daily/${archiveDate}/`);

for (const path of [
  `/daily/${shiftIso(today, 1)}/`,
  `/daily/${shiftIso(today, 1)}`,
  "/daily/2026-02-31/",
  "/daily/2026-13-01/",
  "/daily/2026-10-20/",
  "/daily/nope/",
  "/daily/",
  "/daily/2026-10-21/extra/",
]) {
  const missing = await onRequest(requestContext(path));
  assert.equal(missing.status, 404, path);
  assert.equal(missing.headers.get("x-robots-tag"), "noindex", path);
  assert.match(await missing.text(), /Page not found/);
}

const wrapped = readFileSync(join(root, "functions/daily-permalink.mjs"), "utf8").replace(/^export /gm, "");
const browser = vm.createContext({ console, globalThis: {} });
browser.globalThis = browser;
vm.runInContext(
  `(function (root) {\n${wrapped}\n  root.SudokuDaily = { gameRequest, launchFields };\n})(globalThis)`,
  browser
);
assert.equal(browser.SudokuDaily.gameRequest({ pathname: `/daily/${today}/`, search: "", today }).seed, `daily:${today}`);

console.log("daily permalink tests passed");
