// A solved puzzle is complete. Another difficulty's unfinished game stays
// resumable. A failed /api/stats/finish response is part of the run.
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pageSource = readFileSync(join(root, "assets/js/sudoku.js"), "utf8");
assert.equal(pageSource.includes("location.reload"), false);

const built = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);

const dist = join(root, "dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};
const site = createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname.startsWith("/api/stats/finish")) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end('{"error":"invalid"}');
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"signedIn":false}');
    return;
  }
  let path = decodeURIComponent(url.pathname);
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(dist, path));
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
await new Promise((resolve) => site.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${site.address().port}`;

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

async function placeCorrect(page, count) {
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem("sudoku-progress")));
  const placed = [];
  for (let index = 0; index < 81 && placed.length < count; index += 1) {
    if (save.puzzle[index] !== 0) continue;
    await page.locator(".cell").nth(index).click();
    await page.keyboard.press(String(save.solution[index]));
    placed.push({ index, digit: save.solution[index] });
  }
  assert.equal(placed.length, count);
  return placed;
}

async function fillUntilSolved(page) {
  for (let step = 0; step < 40; step += 1) {
    if ((await page.locator("#solved-modal").getAttribute("hidden")) === null) return;
    if ((await page.locator("#fill-chip").getAttribute("hidden")) === null) {
      await page.locator("#fill-done").click();
    }
    if ((await page.locator("#hint-sheet").getAttribute("hidden")) === null) {
      await page.locator("#hint-dismiss").click();
    }
    await page.locator("#hint-btn").click();
    await page.locator("#hint-fill").click();
  }
  assert.equal(await page.locator("#solved-modal").getAttribute("hidden"), null, "fills solved the puzzle");
}

async function playSequence(page) {
  await page.goto(`${origin}/?difficulty=easy`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#sudoku-grid button.given");
  const moves = await placeCorrect(page, 3);
  await page.locator("#puzzle-label").click();
  await page.locator('[data-difficulty="hard"]').click();
  await page.waitForFunction(() => document.getElementById("puzzle-label").textContent === "Hard");
  await page.waitForSelector("#board-cover", { state: "hidden" });
  await page.waitForSelector("#sudoku-grid button.given");
  const easySave = await page.evaluate(() => JSON.parse(localStorage.getItem("sudoku-progress:easy")));
  moves.forEach((move) => {
    assert.equal(easySave.board[move.index], move.digit);
  });

  await page.waitForFunction(() => document.getElementById("timer").textContent !== "0:00", null, { timeout: 4000 });
  const beforeFill = await page.locator("#timer").innerText();
  assert.notEqual(beforeFill, "0:00");
  await page.locator("#hint-btn").click();
  await page.locator("#hint-fill").click();
  if ((await page.locator("#solved-modal").getAttribute("hidden")) !== null) {
    assert.equal(await page.locator("#fill-chip-text").getAttribute("title"), null);
    assert.equal(await page.locator(".cell[title]").count(), 0);
    await page.locator("#fill-undo").click();
    const afterUndo = await page.locator("#timer").innerText();
    const seconds = (text) => {
      const [mins, secs] = text.split(":").map(Number);
      return mins * 60 + secs;
    };
    assert.notEqual(afterUndo, "0:00");
    assert.ok(Math.abs(seconds(afterUndo) - seconds(beforeFill)) <= 2);
    await page.waitForTimeout(40);
    assert.equal((await page.locator("#live-region").innerText()).trim(), "");
    await fillUntilSolved(page);
  }
  await page.waitForSelector("#solved-modal:not([hidden])");
  assert.equal(await page.locator("#fill-chip").getAttribute("hidden"), "");
  assert.match(await page.locator("#solved-summary").innerText(), /^Hard · /);
  const summary = await page.locator("#solved-summary").innerText();
  const hardId = new URL(page.url()).searchParams.get("p");
  assert.match(hardId, /^hard\./);
  let navigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations += 1;
  });
  const mark = navigations;
  await page.waitForTimeout(1200);
  assert.equal(navigations, mark, "a failed finish did not reload");
  assert.equal(await page.locator("#solved-modal").getAttribute("hidden"), null);

  await page.goto(`${origin}/?p=${encodeURIComponent(hardId)}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#solved-modal:not([hidden])");
  assert.equal(await page.locator("#solved-stats").innerText(), "You solved this.");
  assert.equal(await page.locator("#resume-modal").getAttribute("hidden"), "");
  assert.equal(await page.locator('.cell[data-value="0"]').count(), 0);
  assert.equal(await page.locator("#solved-summary").innerText(), summary);
  const hardSlot = await page.evaluate(() => localStorage.getItem("sudoku-progress:hard"));
  assert.equal(hardSlot, null);

  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#resume-modal:not([hidden])");
  const easyNow = await page.evaluate(() => JSON.parse(localStorage.getItem("sudoku-progress:easy")));
  assert.equal(await page.locator("#resume-yes").innerText(), `Resume Easy (${formatTime(easyNow.elapsed)})`);
  assert.equal(await page.locator("#resume-no").innerText(), "New Easy puzzle");
  assert.match(await page.locator("#resume-detail").innerText(), /^Easy is in progress/);
  assert.equal(await page.locator("#puzzle-label").innerText(), "Easy");
  assert.equal(await page.locator("#board-cover").getAttribute("hidden"), null);
  await page.locator("#resume-yes").click();
  await page.waitForSelector("#sudoku-grid button.given");
  for (const move of moves) {
    assert.equal(await page.locator(".cell").nth(move.index).innerText(), String(move.digit));
  }
}

async function honorDifficulty(page) {
  await page.goto(`${origin}/?difficulty=easy`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#sudoku-grid button.given");
  const easyId = new URL(page.url()).searchParams.get("p");
  await fillUntilSolved(page);
  await page.waitForSelector("#solved-modal:not([hidden])");
  await page.goto(`${origin}/?difficulty=hard`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.getElementById("puzzle-label").textContent === "Hard");
  await page.waitForSelector("#board-cover", { state: "hidden" });
  await page.waitForSelector("#sudoku-grid button.given");
  const next = new URL(page.url());
  assert.equal(next.searchParams.get("difficulty"), null);
  assert.match(next.searchParams.get("p"), /^hard\./);
  assert.notEqual(next.searchParams.get("p"), easyId);
  assert.equal(await page.locator("#resume-modal").getAttribute("hidden"), "");
  assert.ok((await page.locator('.cell[data-value="0"]').count()) > 0);
}

function storedGame(kind, puzzleId, elapsed) {
  const puzzle = Array(81).fill(0);
  puzzle[0] = 1;
  const solution = puzzle.slice();
  solution[1] = 2;
  const board = puzzle.slice();
  board[2] = 3;
  return {
    version: 1,
    updatedAt: Date.now(),
    kind,
    puzzle,
    solution,
    board,
    notes: Array.from({ length: 81 }, () => []),
    removed: [],
    mistakes: 0,
    slashed: [],
    undo: [],
    selected: 0,
    mode: "normal",
    elapsed,
    auto: false,
    counted: true,
    scored: false,
    puzzleId,
    over: false,
    won: false,
  };
}

async function resumeMatchesPuzzle(page) {
  const morning = storedGame("hard", "hard.rsqhqyhm", 965);
  await page.addInitScript((payload) => {
    localStorage.setItem("sudoku-progress", JSON.stringify(payload));
    localStorage.setItem("sudoku-progress:hard", JSON.stringify(payload));
    localStorage.setItem("sudoku-progress-at", String(payload.updatedAt));
  }, morning);
  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#sudoku-grid button.given");
  assert.equal(await page.locator("#resume-modal").getAttribute("hidden"), "");
  assert.equal(await page.locator("#puzzle-label").innerText(), "Easy");
  assert.doesNotMatch(await page.locator("#resume-detail").innerText(), /Hard|16:05/);

  await page.goto(`${origin}/?p=hard.6qm8ab46`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#sudoku-grid button.given");
  assert.equal(await page.locator("#resume-modal").getAttribute("hidden"), "");
  assert.equal(await page.locator("#puzzle-label").innerText(), "Hard");
  assert.doesNotMatch(await page.locator("#resume-detail").innerText(), /rsqhqyhm|16:05/);

  await page.goto(`${origin}/?p=hard.rsqhqyhm`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#resume-modal:not([hidden])");
  assert.equal(await page.locator("#puzzle-label").innerText(), "Hard");
  assert.equal(await page.locator("#timer").innerText(), "16:05");
  assert.equal(await page.locator("#resume-detail").innerText(), "Hard is in progress at 16:05.");
  assert.equal(await page.locator("#resume-yes").innerText(), "Resume Hard (16:05)");
}

async function fillWithAutoOff(page) {
  await page.goto(`${origin}/?difficulty=hard`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#sudoku-grid button.given");
  assert.equal(await page.locator("#auto-candidates").isChecked(), false);
  const noted = await page.evaluate(() => {
    const cells = [...document.querySelectorAll(".cell")];
    return cells.findIndex((cell) => cell.dataset.value === "0");
  });
  await page.locator(".cell").nth(noted).tap();
  await page.locator("#mode-notes").tap();
  await page.keyboard.press("9");
  const before = await page.evaluate(() => [...document.querySelectorAll(".cell")].map((cell) => cell.dataset.value).join(""));
  await page.locator("#hint-btn").tap();
  await page.locator("#hint-fill").waitFor({ state: "visible" });
  await page.locator("#hint-fill").tap();
  await page.waitForFunction((start) => {
    const now = [...document.querySelectorAll(".cell")].map((cell) => cell.dataset.value).join("");
    const struck = document.querySelectorAll(".marks span.on.struck").length;
    const solved = document.getElementById("solved-modal");
    return now !== start || struck > 0 || (solved && !solved.hidden);
  }, before);
  assert.equal(await page.locator("#auto-candidates").isChecked(), false);
  const noteLeft = await page.locator(".cell").nth(noted).locator(".marks span.on.user-note").allInnerTexts();
  if (noteLeft.length) assert.ok(noteLeft.includes("9"));
}

const browser = await chromium.launch();
try {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await playSequence(page);
    await context.close();
  }
  const redirect = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const hard = await redirect.newPage();
  await honorDifficulty(hard);
  await redirect.close();

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const noted = await phone.newPage();
  await noted.goto(`${origin}/?difficulty=easy`, { waitUntil: "domcontentloaded" });
  await noted.waitForSelector("#sudoku-grid button.given");
  await noted.locator("#auto-candidates").check();
  assert.equal(
    await noted.evaluate(() => JSON.parse(localStorage.getItem("sudoku-settings")).autoCandidates),
    true
  );
  await noted.reload({ waitUntil: "domcontentloaded" });
  await noted.locator("#resume-yes").click();
  await noted.waitForSelector("#sudoku-grid button.given");
  assert.equal(await noted.locator("#auto-candidates").isChecked(), true);
  await phone.close();

  const matched = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const resume = await matched.newPage();
  await resumeMatchesPuzzle(resume);
  await matched.close();

  const finger = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const fills = await finger.newPage();
  await fillWithAutoOff(fills);
  await finger.close();

  const dark = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
  const night = await dark.newPage();
  await night.addInitScript(() => {
    localStorage.setItem("sudoku-settings", JSON.stringify({ theme: "dark", autoCandidates: false }));
  });
  await night.goto(`${origin}/?difficulty=easy`, { waitUntil: "domcontentloaded" });
  await night.waitForSelector("#sudoku-grid button.given");
  await fillUntilSolved(night);
  await night.waitForSelector("#solved-modal:not([hidden])");
  const ink = await night.locator("#solved-practice a").first().evaluate((link) => getComputedStyle(link).color);
  assert.equal(ink, "rgb(158, 210, 248)");
  await dark.close();
} finally {
  await browser.close();
  site.close();
}

console.log("finish save ok");
