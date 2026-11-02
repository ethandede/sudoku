// game_complete must fire once for every solved finish.
// A fill used to skip the event (skipFinish cleared the open row), and a
// hint-only solve never set gaStart, which commitFinish required.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFileSync(join(root, "assets/js", name), "utf8");

const store = new Map();
const events = [];
const sandbox = {
  console,
  TextEncoder,
  TextDecoder,
  setTimeout,
  clearTimeout,
  crypto: webcrypto,
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  },
  navigator: { webdriver: false, userAgent: "Mozilla/5.0", sendBeacon: () => true },
  document: { documentElement: { clientWidth: 1280 }, addEventListener() {} },
  fetch: async () => ({ ok: true, status: 200, json: async () => ({ consentRequired: false }) }),
  AbortSignal,
};
sandbox.window = sandbox;
sandbox.gtag = function () {
  events.push(Array.from(arguments));
};
sandbox.addEventListener = () => {};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(read("community.js"), sandbox);
const community = sandbox.SudokuCommunity;

function eventNames() {
  return events.filter((entry) => entry[0] === "event").map((entry) => entry[1]);
}

function completes() {
  return events.filter((entry) => entry[0] === "event" && entry[1] === "game_complete").map((entry) => entry[2]);
}

function resetCommunity() {
  store.clear();
  events.length = 0;
}

const deal = { level: "easy", isDaily: false, seed: "unit", givens: [1] };
const solved = {
  outcome: "solved",
  elapsed: 13,
  mistakes: 0,
  hintsUsed: 0,
  hardestHint: "",
  notesUsed: false,
  kind: "easy",
  difficulty: "easy",
  isDaily: false,
  assisted: true,
  puzzleType: "random",
  over: false,
};

resetCommunity();
await community.onNewGame(deal);
await community.noteSolved(solved);
await community.noteSolved(solved);
await community.rememberFinish(solved);
community.leave({ ...solved }, { persisted: false });
assert.deepEqual(eventNames(), ["game_complete"]);
assert.equal(completes().length, 1);
assert.equal(completes()[0].assisted, true);
assert.equal(completes()[0].difficulty, "easy");
assert.equal(completes()[0].time_seconds, 13);
assert.equal(completes()[0].mistakes, 0);
assert.equal(completes()[0].hints_used, 0);
assert.equal(completes()[0].puzzle_type, "random");
assert.equal(eventNames().includes("game_abandon"), false);

resetCommunity();
await community.onNewGame(deal);
await community.noteFirstMove({ ...solved, outcome: "abandoned", assisted: false });
await community.rememberFinish({ ...solved, assisted: false, hintsUsed: 0 });
await community.rememberFinish({ ...solved, assisted: false, hintsUsed: 0 });
assert.deepEqual(eventNames(), ["game_start", "game_complete"]);
assert.equal(completes()[0].assisted, false);

resetCommunity();
await community.onNewGame(deal);
await community.noteFirstMove({ ...solved, outcome: "abandoned" });
events.length = 0;
await community.noteSolved({ ...solved, assisted: true, hintsUsed: 2, puzzleType: "practice", practice: true });
community.skipFinish();
community.leave({ outcome: "solved", assisted: true, hintsUsed: 2, puzzleType: "practice", practice: true, elapsed: 13, mistakes: 0, difficulty: "hard", kind: "hard" }, {});
assert.deepEqual(eventNames(), ["game_complete"]);
assert.equal(completes()[0].assisted, true);
assert.equal(completes()[0].hints_used, 2);
assert.equal(completes()[0].puzzle_type, "practice");
console.log("game_complete unit ok");

const libs = vm.createContext({ console, globalThis: null });
libs.globalThis = libs;
vm.runInContext([read("solver.js"), read("pools.js"), read("practice.js"), read("share.js")].join("\n"), libs);

// Dig only cells that stay naked singles, so Fill all naked singles solves it
// and a hand-entered copy of the same grid is a short normal solve.
function digNakedSingles(solution, limit) {
  let puzzle = solution.slice();
  for (let step = 0; step < limit; step += 1) {
    let next = null;
    for (let index = 0; index < 81; index += 1) {
      if (puzzle[index] === 0) continue;
      const trial = puzzle.slice();
      trial[index] = 0;
      const board = trial.slice();
      libs.SudokuPractice.fillAll(board, [], "naked-single", libs.SudokuSolver.explain, solution);
      if (board.every((value, cell) => value === solution[cell])) {
        next = trial;
        break;
      }
    }
    if (!next) break;
    puzzle = next;
  }
  return puzzle;
}

const solution = libs.SudokuPools["not easy"][0].solution.slice();
const nakedPuzzle = digNakedSingles(solution, 24);
const nakedEmpty = nakedPuzzle.filter((value) => value === 0).length;
assert.ok(nakedEmpty > 8, `naked-single puzzle only cleared ${nakedEmpty}`);
const manualPuzzle = digNakedSingles(solution, 12);
const easyUrl = `/?p=${encodeURIComponent(libs.SudokuShare.idFromGivens("easy", nakedPuzzle))}`;
const quickUrl = `/?p=${encodeURIComponent(libs.SudokuShare.idFromGivens("quick", manualPuzzle))}`;
console.log(
  `fixtures: fill ${nakedEmpty} cells, manual ${manualPuzzle.filter((value) => value === 0).length} cells`
);

const built = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);

const dist = join(root, "dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain",
};
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const file = normalize(join(dist, pathname));
  if (!file.startsWith(dist)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("missing");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: ["--disable-blink-features=AutomationControlled"] });
const failures = [];

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function checkCase(name, fn) {
  try {
    await fn();
    console.log("ok", name);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error("FAIL", name, error.message);
  }
}

async function openGame(url) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  await context.addInitScript(() => {
    const keep = sessionStorage.getItem("ga-keep") === "1";
    if (!keep) localStorage.clear();
    sessionStorage.setItem("ga-keep", "1");
    const proto = Object.getPrototypeOf(navigator);
    const defined = Object.getOwnPropertyDescriptor(proto, "webdriver");
    if (!defined || defined.configurable) {
      Object.defineProperty(proto, "webdriver", { configurable: true, get: () => false });
    }
    window.dataLayer = window.dataLayer || [];
  });
  const page = await context.newPage();
  const finishes = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && /\/api\/stats\/finish/.test(request.url())) finishes.push(request.postData() || "");
  });
  await page.route("**/*", (route) => {
    const target = route.request().url();
    if (/google|gstatic|doubleclick|googlesyndication|cloudflareinsights/.test(target)) return route.abort();
    return route.continue();
  });
  await page.goto(`${origin}${url}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => {
      const cover = document.querySelector("#board-cover");
      return document.querySelectorAll(".cell.given").length > 0 && cover && cover.hidden;
    },
    null,
    { timeout: 45000 }
  );
  const client = await page.evaluate(() => ({
    webdriver: navigator.webdriver,
    headless: /HeadlessChrome/i.test(navigator.userAgent || ""),
    gtag: typeof window.gtag,
  }));
  check(client.webdriver === false, `webdriver is ${client.webdriver}`);
  check(client.headless === false, "user agent looks headless");
  check(client.gtag === "function", "gtag stub missing");
  return { context, page, finishes };
}

async function gameEvents(page) {
  return page.evaluate(() =>
    (window.dataLayer || [])
      .map((entry) => Array.from(entry))
      .filter((args) => args[0] === "event")
      .map((args) => ({ name: args[1], params: args[2] || {} }))
  );
}

async function completesOf(page) {
  const list = await gameEvents(page);
  return list.filter((event) => event.name === "game_complete");
}

async function wonCount(page, kind) {
  return page.evaluate((key) => {
    const stats = JSON.parse(localStorage.getItem("sudoku-stats") || "{}");
    return (stats[key] && stats[key].won) || 0;
  }, kind);
}

async function enterSolution(page) {
  const solution = await page.evaluate(() => JSON.parse(localStorage.getItem("sudoku-progress")).solution);
  for (let index = 0; index < 81; index += 1) {
    if (await page.locator("#solved-modal").isHidden() === false) return;
    const current = Number(await page.locator(".cell").nth(index).getAttribute("data-value"));
    if (current !== 0) continue;
    await page.locator(".cell").nth(index).click();
    await page.locator(`#number-pad button[data-number="${solution[index]}"]`).click();
  }
}

async function hidePage(page) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event("pagehide"));
  });
}

await checkCase("Start new, fill all, Done fires one assisted game_complete", async () => {
  const { context, page, finishes } = await openGame(easyUrl);
  const cell = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("sudoku-progress"));
    const index = save.puzzle.findIndex((value) => value === 0);
    return { index, digit: save.solution[index] };
  });
  await page.locator(".cell").nth(cell.index).click();
  await page.locator(`#number-pad button[data-number="${cell.digit}"]`).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#resume-note:not([hidden])");
  await page.click("#resume-no");
  await page.waitForFunction(() => {
    const cover = document.querySelector("#board-cover");
    const note = document.querySelector("#resume-note");
    return document.querySelectorAll(".cell.given").length > 0 && cover && cover.hidden && note && note.hidden;
  });
  const wonBefore = await wonCount(page, "easy");
  const before = await gameEvents(page);
  await page.click("#more-btn");
  await page.click("#more-fill");
  await page.locator("#fill-list button", { hasText: "Fill all naked singles" }).click();
  const solvedNow = page.locator("#solved-modal:not([hidden])");
  const chip = page.locator("#fill-chip:not([hidden])");
  await Promise.race([
    solvedNow.waitFor({ state: "visible", timeout: 4000 }).catch(() => {}),
    chip.waitFor({ state: "visible", timeout: 4000 }).catch(() => {}),
  ]);
  if (await page.locator("#solved-modal").isHidden()) {
    await page.click("#fill-done");
    await page.waitForSelector("#solved-modal:not([hidden])", { timeout: 4000 });
  }
  const summary = (await page.locator("#solved-summary").innerText()).replace(/\s+/g, " ");
  const extra = (await page.locator("#solved-stats").innerText()).replace(/\s+/g, " ");
  check(summary.startsWith("Easy"), `summary is ${summary}`);
  check(extra.includes("Filled steps don't count"), extra);
  const done = await completesOf(page);
  check(done.length === 1, `game_complete count ${done.length} ${JSON.stringify(done)}`);
  check(done[0].params.assisted === true, `assisted ${done[0].params.assisted}`);
  check(done[0].params.difficulty === "easy", `difficulty ${done[0].params.difficulty}`);
  check(done[0].params.puzzle_type === "random", `puzzle_type ${done[0].params.puzzle_type}`);
  check(done[0].params.hints_used === 0, `hints_used ${done[0].params.hints_used}`);
  check(done[0].params.mistakes === 0, `mistakes ${done[0].params.mistakes}`);
  check(typeof done[0].params.time_seconds === "number", "time_seconds missing");
  const after = await gameEvents(page);
  const abandonBefore = before.filter((event) => event.name === "game_abandon").length;
  const abandonAfter = after.filter((event) => event.name === "game_abandon").length;
  check(abandonAfter === abandonBefore, `abandon grew ${abandonBefore} -> ${abandonAfter}`);
  await hidePage(page);
  check((await completesOf(page)).length === 1, "pagehide sent another game_complete");
  check((await gameEvents(page)).filter((event) => event.name === "game_abandon").length === abandonAfter, "pagehide abandoned a solved game");
  check((await wonCount(page, "easy")) === wonBefore, "fill changed the won count");
  check(!finishes.some((body) => body.includes('"outcome":"solved"')), `fill posted a solved finish ${finishes.join(" ")}`);
  await context.close();
});

await checkCase("a normal solve fires one unassisted game_complete", async () => {
  const { context, page } = await openGame(quickUrl);
  const wonBefore = await wonCount(page, "quick");
  await enterSolution(page);
  await page.waitForSelector("#solved-modal:not([hidden])");
  const done = await completesOf(page);
  check(done.length === 1, `game_complete count ${done.length}`);
  check(done[0].params.assisted === false, `assisted ${JSON.stringify(done[0].params)}`);
  check(done[0].params.hints_used === 0, `hints_used ${done[0].params.hints_used}`);
  check(done[0].params.difficulty === "quick", `difficulty ${done[0].params.difficulty}`);
  check(done[0].params.puzzle_type === "random", `puzzle_type ${done[0].params.puzzle_type}`);
  check(done[0].params.mistakes === 0, `mistakes ${done[0].params.mistakes}`);
  const names = (await gameEvents(page)).map((event) => event.name);
  check(names.includes("game_start"), `missing game_start ${names.join(",")}`);
  check(!names.includes("game_abandon"), `abandoned a solved game ${names.join(",")}`);
  await hidePage(page);
  check((await completesOf(page)).length === 1, "second game_complete");
  check(!(await gameEvents(page)).some((event) => event.name === "game_abandon"), "pagehide abandoned the solve");
  check((await wonCount(page, "quick")) === wonBefore + 1, "a clean solve did not count as a win");
  await context.close();
});

await checkCase("a hinted solve fires one assisted game_complete", async () => {
  const { context, page } = await openGame(quickUrl);
  const wonBefore = await wonCount(page, "quick");
  await page.click("#hint-btn");
  await page.waitForSelector("#hint-sheet:not([hidden])");
  await page.click("#hint-next");
  await page.click("#hint-next");
  if (await page.locator("#hint-dismiss").isVisible()) await page.click("#hint-dismiss");
  await enterSolution(page);
  await page.waitForSelector("#solved-modal:not([hidden])");
  const done = await completesOf(page);
  check(done.length === 1, `game_complete count ${done.length} ${JSON.stringify(done)}`);
  check(done[0].params.assisted === true, `assisted ${JSON.stringify(done[0].params)}`);
  check(done[0].params.hints_used >= 1, `hints_used ${done[0].params.hints_used}`);
  check(done[0].params.puzzle_type === "random", `puzzle_type ${done[0].params.puzzle_type}`);
  check(done[0].params.difficulty === "quick", `difficulty ${done[0].params.difficulty}`);
  const names = (await gameEvents(page)).map((event) => event.name);
  check(!names.includes("game_abandon"), `abandoned a hinted solve ${names.join(",")}`);
  await hidePage(page);
  check((await completesOf(page)).length === 1, "hinted solve fired twice");
  check(!(await gameEvents(page)).some((event) => event.name === "game_abandon"), "pagehide abandoned the hinted solve");
  check((await wonCount(page, "quick")) === wonBefore + 1, "a hinted solve stopped counting as a win");
  await context.close();
});

await browser.close();
server.close();
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("game_complete browser ok");
