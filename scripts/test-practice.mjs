import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, normalize } from "node:path";
import path from "node:path";
import vm from "node:vm";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const context = vm.createContext({ console, globalThis: {} });
context.globalThis = context;
for (const file of ["assets/js/solver.js", "assets/js/pools.js", "assets/js/generator.js", "assets/js/practice.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
}

const { SudokuGenerator: generator, SudokuSolver: solver, SudokuPractice: practice } = context;

for (const slug of Object.keys(practice.FILL_LABEL)) {
  const fromGenerator = generator.techniqueRank(slug);
  assert.equal(fromGenerator, practice.RANK[slug], `${slug} rank`);
  assert.equal(practice.fillLabel(slug).includes("—"), false);
  assert.equal(practice.promptFor(practice.fillLabel(slug)).includes("—"), false);
  assert.equal(practice.promptShort(practice.fillLabel(slug)).includes("—"), false);
}

function jump(slug) {
  const result = generator.generateForTechnique(slug, { seed: `practice-${slug}` });
  assert.equal(Boolean(result.metadata && result.metadata.trainApproximate), false, `${slug} approximate`);
  assert.ok((result.metadata.path || []).includes(slug), `${slug} path`);
  const board = result.puzzle.slice();
  const removed = [];
  const jumped = practice.fastForward(board, removed, slug, solver.explain, result.solution);
  assert.equal(jumped.ready, true, `${slug} ready`);
  assert.equal(jumped.next && jumped.next.slug, slug, `${slug} next`);
  const target = practice.rankOf(slug);
  jumped.applied.forEach((step) => {
    assert.ok(practice.rankOf(step) < target, `${step} should be easier than ${slug}`);
  });
  const again = solver.explain(board, removed);
  assert.equal(again.slug, slug, `${slug} stays next`);
  return { result, jumped };
}

const hidden = jump("hidden-pair");
const wing = jump("x-wing");
const skyscraper = jump("skyscraper");
const kite = jump("two-string-kite");
const xyz = jump("xyz-wing");
assert.ok(hidden.jumped.applied.length > 0, "hidden pair jumps past easier steps");
assert.ok(wing.jumped.applied.length > 0, "x-wing jumps past easier steps");
assert.equal(practice.wantsCandidates("naked-single"), false);
assert.equal(practice.wantsCandidates("x-wing"), true);
assert.equal(practice.wantsCandidates("hidden-pair"), true);

const easy = generator.generate("easy", "practice-fill");
const board = easy.puzzle.slice();
const removed = [];
const filled = practice.fillAll(board, removed, "naked-single", solver.explain, easy.solution);
assert.ok(filled.applied.length > 1, "naked singles repeat");
assert.ok(!filled.next || filled.next.slug !== "naked-single");
const second = practice.fillAll(board, removed, "naked-single", solver.explain, easy.solution);
assert.equal(second.applied.length, 0, "a second fill finds nothing new");
assert.equal(filled.touches.length, filled.applied.length, "each naked single marks the cell it filled");
filled.touches.forEach((touch, index) => {
  assert.equal(touch.kind, "placed");
  assert.equal(touch.slug, "naked-single");
  assert.equal(touch.index, filled.applied[index].place.index);
});

const placedBoard = Array(81).fill(0);
const placedRemoved = [];
const placedSolution = Array(81).fill(1);
placedSolution[0] = 5;
const placedOutcome = practice.applyStep(
  placedBoard,
  placedRemoved,
  {
    slug: "naked-single",
    name: "Naked single",
    place: { index: 0, digit: 5 },
    eliminate: [
      { index: 0, digit: 3 },
      { index: 1, digit: 5 },
    ],
  },
  placedSolution
);
assert.equal(placedOutcome.placed, 0);
assert.equal(placedOutcome.cleared.length, 1);
assert.equal(placedOutcome.cleared[0].index, 1, "a placed cell is not also marked cleared");

function trailingSlug(list) {
  return list.length ? list[list.length - 1] : "";
}

for (const jumped of [hidden.jumped, wing.jumped]) {
  assert.ok(Array.isArray(jumped.touches) && jumped.touches.length > 0, "jump records cell touches");
  const batches = practice.batchesOf(jumped.touches);
  const highlight = practice.highlightOf(batches);
  const last = trailingSlug(jumped.applied);
  assert.ok(highlight.length > 0);
  assert.ok(highlight.every((cell) => cell.slug === last), "highlight is only the last batch");
  const earlier = jumped.touches.filter((touch) => touch.slug !== last);
  if (earlier.length) {
    const highlighted = new Set(highlight.map((cell) => cell.index));
    assert.ok(earlier.some((touch) => !highlighted.has(touch.index)), "earlier batches stay off the board highlight");
  }
  assert.equal(practice.reviewCopy(batches, "Pointing").includes("—"), false);
  assert.match(practice.reviewCopy(batches, "Pointing"), /Next up: Pointing\.$/);
  assert.match(practice.reviewCopyShort(batches, "Pointing"), /^\d+ to Pointing$/);
  assert.equal(practice.reviewCopyShort(batches, "Pointing").includes("—"), false);
}

const singles = practice.batchesOf(
  Array.from({ length: 14 }, (_, index) => ({
    slug: "naked-single",
    name: "Naked single",
    index,
    kind: "placed",
    digits: [4],
  })).concat(
    Array.from({ length: 6 }, (_, index) => ({
      slug: "hidden-single",
      name: "Hidden single",
      index: 20 + index,
      kind: "placed",
      digits: [6],
    }))
  )
);
assert.equal(practice.reviewCopy(singles, "Pointing"), "Naked singles 14, Hidden singles 6. Next up: Pointing.");
assert.equal(practice.highlightOf(singles).length, 6);
const interleaved = practice.batchesOf([
  { slug: "naked-single", name: "Naked single", index: 1, kind: "placed", digits: [1] },
  { slug: "hidden-single", name: "Hidden single", index: 2, kind: "placed", digits: [2] },
  { slug: "naked-single", name: "Naked single", index: 3, kind: "placed", digits: [3] },
]);
assert.equal(practice.reviewCopy(interleaved, "Pointing"), "Naked singles 2, Hidden single 1. Next up: Pointing.");
assert.equal(practice.highlightOf(interleaved).length, 1);
assert.equal(practice.highlightOf(interleaved)[0].index, 3);
assert.equal(practice.reviewCopy([singles[0]], ""), "Naked singles: 14 cells filled");
const one = practice.batchesOf([
  { slug: "naked-single", name: "Naked single", index: 4, kind: "placed", digits: [4] },
]);
assert.equal(practice.reviewCopy(one, ""), "Naked single: 1 cell filled");
assert.equal(practice.cellDetail(one[0].cells[0]), "Naked single placed 4 here.");
const pointing = practice.batchesOf(
  Array.from({ length: 6 }, (_, index) => ({
    slug: "pointing",
    name: "Pointing",
    index,
    kind: "cleared",
    digits: [7],
  }))
);
assert.equal(practice.reviewCopy(pointing, ""), "Pointing: 6 cells changed");
assert.equal(
  practice.cellDetail({ name: "Pointing", kind: "cleared", digits: [7, 2] }),
  "Pointing cleared 2, 7 here."
);
const merged = practice.batchesOf([
  { slug: "pointing", name: "Pointing", index: 3, kind: "cleared", digits: [7] },
  { slug: "pointing", name: "Pointing", index: 3, kind: "cleared", digits: [8] },
  { slug: "hidden-single", name: "Hidden single", index: 3, kind: "cleared", digits: [1] },
  { slug: "hidden-single", name: "Hidden single", index: 3, kind: "placed", digits: [4] },
]);
assert.equal(merged[0].cells.length, 1);
assert.equal(merged[0].cells[0].digits.join(","), "7,8");
assert.equal(merged[1].cells[0].kind, "placed");
assert.equal(practice.techniqueLabel("X-wing", 2), "X-wings");
assert.equal(practice.techniqueLabel("XY-chain", 2), "XY-chains");
assert.equal(practice.techniqueLabel("Pointing", 4), "Pointing");
assert.equal(practice.techniqueLabel("Quads", 2), "Quads");
assert.equal(practice.techniqueLabel("Simple coloring", 2), "Simple coloring");
assert.equal(practice.techniqueLabel("Swordfish", 2), "Swordfish");

const game = fs.readFileSync(path.join(root, "assets/js/sudoku.js"), "utf8");
const fillFn = game.slice(game.indexOf("function fillTechnique"), game.indexOf("function revealCell"));
assert.equal(fillFn.split("pushUndo(").length - 1, 1, "fill all is one undo");
assert.match(fillFn, /showFillReview\(result\.touches, ""\)/);
assert.equal(fillFn.includes("setTimeout"), false, "a fill does not schedule its own dismiss");
assert.match(game, /No dismiss timer/);
assert.match(game, /abandonOpen\(\)/);
assert.match(game, /skipFinish/);
assert.match(game, /recordPractice/);
assert.match(game, /state\.practice \|\| state\.fastForwarded/);
assert.match(game, /if \(!fillReview\) state\.undo = \[\]/);
assert.equal(game.includes("—"), false);
const prepareFn = game.slice(game.indexOf("function preparePractice"), game.indexOf("function buildTechniquePickers"));
assert.match(prepareFn, /pushUndo\(\)/);
assert.match(prepareFn, /state\.undo\.pop\(\)/);
assert.match(prepareFn, /showFillReview\(jumped\.touches, name\)/);
const undoFn = game.slice(game.indexOf("function undo("), game.indexOf("function pushUndo"));
assert.match(undoFn, /snap\.puzzle/);
assert.match(undoFn, /clearFillReview\(\)/);
const pushFn = game.slice(game.indexOf("function pushUndo"), game.indexOf("function communitySnapshot"));
assert.match(pushFn, /puzzle: state\.puzzle\.slice\(\)/);

const html = fs.readFileSync(path.join(root, "src/game.html"), "utf8");
assert.match(html, /id="more-fill"/);
assert.match(html, /id="more-practice"/);
assert.match(html, /id="hint-fill"/);
assert.match(html, /id="practice-prompt"/);
assert.equal(html.includes("—"), false);
const chrome = html.slice(html.indexOf('class="play-chrome"'), html.indexOf('class="play-surface"'));
assert.match(chrome, /id="fill-chip"/);
assert.match(chrome, /id="fill-undo"/);
assert.match(chrome, /id="fill-done"/);
assert.equal(html.slice(html.indexOf('class="play-surface"'), html.indexOf('class="controls"')).includes('id="fill-chip"'), false);

const scss = fs.readFileSync(path.join(root, "assets/scss/pages/_sudoku.scss"), "utf8");
assert.match(scss, /--fill-placed:\s*#8fbee0/);
assert.match(scss, /--fill-cleared:\s*#d7ebf8/);
assert.match(scss, /--fill-ring:\s*#0c4f86/);
assert.match(scss, /--fill-placed:\s*#3f6d90/);
assert.match(scss, /--fill-cleared:\s*#2c4d66/);
assert.match(scss, /--fill-ring:\s*#9ed2f8/);
assert.match(scss, /animation-delay:\s*var\(--fill-delay/);
assert.match(scss, /transition:\s*background-color 300ms ease/);
assert.match(scss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.cell\.fill-placed/);
assert.match(scss, /\.fill-chip[\s\S]*position:\s*absolute/);
assert.match(scss, /\.selected\.fill-placed[\s\S]*background:\s*var\(--selected\)/);

const community = fs.readFileSync(path.join(root, "assets/js/community.js"), "utf8");
assert.match(community, /function skipFinish/);
assert.match(community, /function abandonOpen/);

console.log(
  `practice ok (hidden pair ${hidden.jumped.applied.length} steps, x-wing ${wing.jumped.applied.length} steps, skyscraper ${skyscraper.jumped.applied.length}, kite ${kite.jumped.applied.length}, xyz ${xyz.jumped.applied.length}, naked singles ${filled.applied.length})`
);

vm.runInContext(fs.readFileSync(path.join(root, "assets/js/share.js"), "utf8"), context);
const share = context.SudokuShare;
const chipPuzzle = generator.generate("not easy", "chip-not easy");
const chipProbe = chipPuzzle.puzzle.slice();
const chipFill = practice.fillAll(chipProbe, [], "naked-single", solver.explain, chipPuzzle.solution);
const chipPlaced = chipPuzzle.puzzle.reduce(
  (count, value, index) => count + (value === 0 && chipProbe[index] !== 0 ? 1 : 0),
  0
);
assert.ok(chipFill.applied.length > 1, "browser fixture has several naked singles");
assert.equal(chipPlaced, chipFill.touches.length);
assert.ok(chipFill.next && chipFill.next.slug !== "naked-single", "the fixture stays unfinished");
const fillPath = `/?p=${encodeURIComponent(share.idFromGivens("not easy", chipPuzzle.puzzle))}`;

await runFillReviewUi(fillPath);

async function runFillReviewUi(fillUrl) {
  const built = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
  if (built.status !== 0) process.exit(built.status ?? 1);
  const dist = path.join(root, "dist");
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
    const file = normalize(path.join(dist, pathname));
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
  const browser = await chromium.launch();
  const failures = [];
  const shots = "/opt/cursor/artifacts";
  fs.mkdirSync(shots, { recursive: true });

  function checkAssert(condition, message) {
    if (!condition) throw new Error(message);
  }

  async function check(name, fn) {
    try {
      await fn();
      console.log("ok", name);
    } catch (error) {
      failures.push(`${name}: ${error.message}`);
      console.error("FAIL", name, error.message);
    }
  }

  async function openGame(url, viewport) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    await context.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("sudoku-settings", JSON.stringify({ theme: "light" }));
    });
    const page = await context.newPage();
    const posts = [];
    page.on("request", (request) => {
      if (/\/api\/stats\/(start|finish)/.test(request.url()) && request.method() === "POST") posts.push(request.url());
    });
    await page.route("**/*", (route) => {
      const target = route.request().url();
      if (/google|gstatic|doubleclick|googlesyndication/.test(target)) return route.abort();
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
    return { context, page, posts };
  }

  async function boardOf(page) {
    return page.$$eval(".cell", (cells) => cells.map((cell) => Number(cell.dataset.value)));
  }

  async function markedCells(page) {
    return page.$$eval(".cell.fill-placed, .cell.fill-cleared", (cells) =>
      cells.map((cell) => Number(cell.dataset.index)).sort((a, b) => a - b)
    );
  }

  async function chipText(page) {
    return page.locator("#fill-chip-text").evaluate((el) => {
      const full = el.querySelector(".copy-full");
      return (full || el).textContent.replace(/\s+/g, " ").trim();
    });
  }

  function sameList(actual, expected, message) {
    checkAssert(
      JSON.stringify(actual) === JSON.stringify(expected),
      `${message}\n  actual: ${JSON.stringify(actual)}\n  expected: ${JSON.stringify(expected)}`
    );
  }

  async function fillNaked(page) {
    const before = await boardOf(page);
    await page.click("#more-btn");
    await page.click("#more-fill");
    await page.locator("#fill-list button", { hasText: "Fill all naked singles" }).click();
    await page.waitForSelector("#fill-chip:not([hidden])");
    const after = await boardOf(page);
    const filled = before
      .map((value, index) => (value === 0 && after[index] !== 0 ? index : -1))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b);
    const text = await chipText(page);
    const noun = filled.length === 1 ? "cell" : "cells";
    const label = filled.length === 1 ? "Naked single" : "Naked singles";
    checkAssert(filled.length > 1, "the fill wrote more than one cell");
    sameList(await markedCells(page), filled, "the highlight is the filled cells");
    checkAssert(text === `${label}: ${filled.length} ${noun} filled`, `chip is ${text}`);
    return { before, after, filled, text };
  }

  async function waitUntilClear(page) {
    await page.waitForFunction(
      () =>
        document.querySelector("#fill-chip").hidden &&
        document.querySelectorAll(".cell.fill-placed, .cell.fill-cleared").length === 0,
      null,
      { timeout: 3000 }
    );
  }

  await check("fill highlight stays until Done, and both Undo controls revert the batch", async () => {
    const { context, page, posts } = await openGame(fillUrl, { width: 390, height: 844 });
    const statsBefore = await page.evaluate(() => localStorage.getItem("sudoku-stats"));
    const { before, after, filled, text } = await fillNaked(page);
    await page.waitForTimeout(1200);
    checkAssert((await chipText(page)) === text, "the chip does not clear on its own");
    sameList(await markedCells(page), filled, "the highlight stays without a timer");
    await page.screenshot({ path: path.join(shots, "shipped-fill-phone-light.png") });
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
    });
    await page.screenshot({ path: path.join(shots, "shipped-fill-phone-dark.png") });
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "light";
    });
    await page.click("#undo-btn");
    await waitUntilClear(page);
    sameList(await boardOf(page), before, "toolbar undo restores every filled cell in one step");
    await fillNaked(page);
    await page.click("#fill-undo");
    await waitUntilClear(page);
    sameList(await boardOf(page), before, "chip undo restores every filled cell in one step");
    await fillNaked(page);
    await page.click("#fill-done");
    await waitUntilClear(page);
    sameList(await boardOf(page), after, "Done clears the highlight and leaves the digits");
    await page.click("#undo-btn");
    sameList(await boardOf(page), before, "toolbar undo still reverts the batch after Done");
    const statsAfter = await page.evaluate(() => localStorage.getItem("sudoku-stats"));
    checkAssert(statsAfter === statsBefore, "filling does not change stored stats");
    checkAssert(posts.length === 0, `fill posted ${posts.join(" ")}`);
    await context.close();
  });

  await check("a practice jump summarizes the cells it changed and stays off the stats", async () => {
    const { context, page, posts } = await openGame("/?practice=x-wing", { width: 1280, height: 800 });
    await page.waitForSelector("#fill-chip:not([hidden])", { timeout: 30000 });
    const text = await chipText(page);
    checkAssert(/\. Next up: X-wing\.$/.test(text), `chip is ${text}`);
    const groups = text.slice(0, text.indexOf(". Next up:")).split(", ");
    checkAssert(groups.length > 0, "the jump names the techniques it applied");
    groups.forEach((group) => checkAssert(/^.+ \d+$/.test(group), `group is ${group}`));
    const highlighted = await markedCells(page);
    const total = groups.reduce((sum, group) => sum + Number(group.match(/(\d+)$/)[1]), 0);
    // The chip adds every cell the jump changed. The highlight is only the last batch.
    checkAssert(highlighted.length > 0 && highlighted.length <= total, `highlight ${highlighted.length} of ${total}`);
    const givens = await page.locator(".cell.given").count();
    await page.waitForTimeout(1200);
    checkAssert((await chipText(page)) === text, "the jump chip stays until the next action");
    sameList(await markedCells(page), highlighted, "the jump highlight stays without a timer");
    const box = await page.evaluate(() => {
      const chip = document.querySelector("#fill-chip").getBoundingClientRect();
      return {
        top: chip.top,
        bottom: chip.bottom,
        width: chip.width,
        vh: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
    checkAssert(box.top >= 0 && box.bottom <= box.vh + 1, "desktop chip is on screen");
    checkAssert(box.scrollWidth <= box.clientWidth + 1, "desktop has no horizontal scroll");
    await page.screenshot({ path: path.join(shots, "shipped-practice-desktop-light.png") });
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
    });
    await page.screenshot({ path: path.join(shots, "shipped-practice-desktop-dark.png") });
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "light";
    });
    await page.setViewportSize({ width: 390, height: 844 });
    const phone = await page.evaluate(() => {
      const chip = document.querySelector("#fill-chip").getBoundingClientRect();
      return {
        top: chip.top,
        bottom: chip.bottom,
        vh: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
    checkAssert(phone.top >= 0 && phone.bottom <= phone.vh + 1, "phone chip is on screen");
    checkAssert(phone.scrollWidth <= phone.clientWidth + 1, "phone has no horizontal scroll");
    await page.screenshot({ path: path.join(shots, "shipped-practice-phone-light.png") });
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
    });
    await page.screenshot({ path: path.join(shots, "shipped-practice-phone-dark.png") });
    await page.click("#undo-btn");
    await waitUntilClear(page);
    const givensAfter = await page.locator(".cell.given").count();
    checkAssert(givensAfter < givens, "one undo restores the cells the jump locked");
    const stats = await page.evaluate(() => JSON.parse(localStorage.getItem("sudoku-stats") || "{}"));
    for (const key of ["quick", "easy", "not easy", "hard", "expert", "mental", "daily"]) {
      const bucket = stats[key] || {};
      checkAssert(!bucket.played && !bucket.won, `${key} was counted`);
    }
    checkAssert(posts.length === 0, `practice posted ${posts.join(" ")}`);
    await context.close();
  });

  await check("practice keeps the board and keypad where a normal game puts them", async () => {
    async function openThemed(url, viewport, theme) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
      await context.addInitScript((value) => {
        localStorage.clear();
        localStorage.setItem("sudoku-settings", JSON.stringify({ theme: value }));
      }, theme);
      const page = await context.newPage();
      await page.route("**/*", (route) => {
        const target = route.request().url();
        if (/google|gstatic|doubleclick|googlesyndication/.test(target)) return route.abort();
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
      await page.evaluate(() => document.fonts.ready);
      return { context, page };
    }

    async function metrics(page) {
      return page.evaluate(() => {
        const box = (selector) => document.querySelector(selector).getBoundingClientRect();
        const overflows = (el) => Boolean(el) && !el.hidden && el.scrollWidth > el.clientWidth + 1;
        const chip = document.querySelector("#fill-chip");
        const prompt = document.querySelector("#practice-prompt");
        const label = document.querySelector("#puzzle-label");
        const chipText = document.querySelector("#fill-chip-text");
        const intro = box(".game-intro");
        const promptBox = prompt.getBoundingClientRect();
        return {
          board: box(".sudoku-grid").top,
          pad: box("#number-pad").top,
          boardHeight: box(".sudoku-grid").height,
          labelOverflow: overflows(label),
          chipOverflow: chip && !chip.hidden ? overflows(chipText) : false,
          promptOverflow: prompt && !prompt.hidden ? overflows(prompt) : false,
          promptOutsideIntro: prompt && !prompt.hidden ? promptBox.bottom > intro.bottom + 1 || promptBox.top < intro.top - 1 : false,
          label: label.innerText.replace(/\s+/g, " ").trim(),
          prompt: !prompt.hidden ? prompt.innerText.replace(/\s+/g, " ").trim() : "",
          chip: chip && !chip.hidden ? chipText.innerText.replace(/\s+/g, " ").trim() : "",
        };
      });
    }

    const sizes = [
      [360, 740],
      [390, 844],
      [430, 932],
      [1280, 800],
    ];
    for (const theme of ["light", "dark"]) {
      for (const [width, height] of sizes) {
        const name = `${width}x${height} ${theme}`;
        const plain = await openThemed("/", { width, height }, theme);
        const plainBox = await metrics(plain.page);
        await plain.context.close();
        const practice = await openThemed("/?practice=naked-pair", { width, height }, theme);
        await practice.page.waitForSelector("#practice-prompt:not([hidden])", { timeout: 30000 });
        const practiceBox = await metrics(practice.page);
        const narrow = width < 721;
        checkAssert(Math.abs(practiceBox.board - plainBox.board) <= 1, `${name} board top ${practiceBox.board} vs ${plainBox.board}`);
        checkAssert(Math.abs(practiceBox.pad - plainBox.pad) <= 1, `${name} keypad top ${practiceBox.pad} vs ${plainBox.pad}`);
        checkAssert(
          Math.abs(practiceBox.boardHeight - plainBox.boardHeight) <= 1,
          `${name} board height ${practiceBox.boardHeight} vs ${plainBox.boardHeight}`
        );
        checkAssert(!practiceBox.labelOverflow, `${name} label overflows: ${practiceBox.label}`);
        checkAssert(!practiceBox.promptOverflow, `${name} prompt overflows: ${practiceBox.prompt}`);
        checkAssert(!practiceBox.promptOutsideIntro, `${name} prompt leaves the title row`);
        checkAssert(practiceBox.chip.length > 0, `${name} chip is missing`);
        checkAssert(!practiceBox.chipOverflow, `${name} chip overflows: ${practiceBox.chip}`);
        if (narrow) {
          checkAssert(practiceBox.label === "Naked pair", `${name} label is ${practiceBox.label}`);
          checkAssert(practiceBox.prompt === "Find the Naked pair.", `${name} prompt is ${practiceBox.prompt}`);
          checkAssert(/^\d+ to Naked pair$/.test(practiceBox.chip), `${name} chip is ${practiceBox.chip}`);
        } else {
          checkAssert(practiceBox.label === "Practice · Naked pair", `${name} label is ${practiceBox.label}`);
          checkAssert(practiceBox.prompt === "Naked pair is the next move. Find it.", `${name} prompt is ${practiceBox.prompt}`);
          checkAssert(/Next up: Naked pair\.$/.test(practiceBox.chip), `${name} chip is ${practiceBox.chip}`);
        }
        if (width === 360 && theme === "light") {
          await practice.page.evaluate(() => {
            document.querySelector("#puzzle-label .copy-short").textContent = "Simple coloring";
            document.querySelector("#practice-prompt .copy-short").textContent = "Find the Simple coloring.";
            document.querySelector("#fill-chip-text .copy-short").textContent = "23 to Simple coloring";
          });
          const long = await metrics(practice.page);
          checkAssert(!long.labelOverflow, "longest practice label overflows");
          checkAssert(!long.promptOverflow, "longest practice prompt overflows");
          checkAssert(!long.chipOverflow, "longest practice chip overflows");
        }
        const shot = width >= 721 ? "desktop" : "phone";
        if (width === 390 || width === 1280) {
          await practice.page.screenshot({ path: path.join(shots, `practice-layout-${shot}-${theme}.png`) });
        }
        console.log("layout", name, {
          board: practiceBox.board,
          plain: plainBox.board,
          label: practiceBox.label,
          prompt: practiceBox.prompt,
          chip: practiceBox.chip,
        });
        await practice.context.close();
      }
    }
  });

  await browser.close();
  server.close();
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log("fill review ui ok");
}
