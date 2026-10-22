// Board behavior: candidate preview, notes, auto-candidates, undo, and the
// selected-cell focus ring. Requires the Playwright chromium build
// (`npx playwright install chromium`). Builds dist/ first.
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const built = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);

const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
};

function assertEqual(actual, expected, message) {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) throw new Error(`${message}\n  actual:   ${left}\n  expected: ${right}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function peerIndexes(index) {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const set = new Set();
  for (let i = 0; i < 9; i += 1) {
    set.add(row * 9 + i);
    set.add(i * 9 + col);
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) set.add((boxRow + r) * 9 + boxCol + c);
  }
  set.delete(index);
  return [...set];
}

function boxOf(index) {
  const row = Math.floor(index / 9);
  const col = index % 9;
  return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}

function candidatesFor(board, index) {
  if (board[index] !== 0) return [];
  const peers = peerIndexes(index);
  const found = [];
  for (let number = 1; number <= 9; number += 1) {
    if (peers.every((other) => board[other] !== number)) found.push(number);
  }
  return found;
}

function zone(offset, size) {
  const ratio = offset / size;
  if (ratio < 0.34) return 0;
  if (ratio > 0.66) return 2;
  return 1;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
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

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const origin = `http://127.0.0.1:${port}`;
const browser = await chromium.launch();
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    console.log("ok", name);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error("FAIL", name, error.message);
  }
}

async function openPage(contextOptions = {}) {
  const context = await browser.newContext(contextOptions);
  await context.addInitScript(() => {
    if (window !== window.top) return;
    if (sessionStorage.getItem("keep-save") === "1") return;
    localStorage.clear();
  });
  const page = await context.newPage();
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (/google|gstatic|doubleclick|googlesyndication/.test(url)) return route.abort();
    return route.continue();
  });
  await page.goto(`${origin}/?difficulty=quick`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const cover = document.querySelector("#board-cover");
    return (
      document.querySelectorAll(".cell.given").length > 0 &&
      cover &&
      cover.hidden &&
      localStorage.getItem("sudoku-progress")
    );
  });
  return { context, page };
}

async function boardOf(page) {
  return page.$$eval(".cell", (cells) => cells.map((cell) => Number(cell.dataset.value)));
}

async function saveOf(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("sudoku-progress")));
}

async function markDigits(page, index, kind) {
  const suffix = kind ? `.${kind}` : "";
  return page
    .locator(".cell")
    .nth(index)
    .locator(`.marks span.on${suffix}`)
    .evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.digit)).sort((a, b) => a - b));
}

async function leaveBoard(page) {
  await page.mouse.move(4, 4);
}

function emptyPeer(board) {
  const empty = board.map((value, index) => (value === 0 ? index : -1)).filter((index) => index >= 0);
  for (const index of empty) {
    const peer = peerIndexes(index).find((other) => board[other] === 0);
    if (peer != null) return [index, peer];
  }
  return null;
}

await check("desktop hover previews possible digits and hides them on leave", async () => {
  const { context, page } = await openPage({ viewport: { width: 1280, height: 900 } });
  await leaveBoard(page);
  const board = await boardOf(page);
  const index = board.findIndex((value) => value === 0);
  assert(index >= 0, "puzzle has an empty cell");
  const cell = page.locator(".cell").nth(index);
  await cell.hover();
  assertEqual(await markDigits(page, index, "preview"), candidatesFor(board, index), "hover preview");
  assertEqual(await markDigits(page, index, "user-note"), [], "hover does not write notes");
  assertEqual(await boardOf(page), board, "hover does not change the board");
  await leaveBoard(page);
  assertEqual(await markDigits(page, index, "preview"), [], "preview clears when the pointer leaves");
  await context.close();
});

await check("notes add and remove from the keyboard and the number pad", async () => {
  const { context, page } = await openPage({ viewport: { width: 1280, height: 900 } });
  await leaveBoard(page);
  const board = await boardOf(page);
  const index = board.findIndex((value) => value === 0);
  const cell = page.locator(".cell").nth(index);
  await page.locator("#mode-notes").click();
  await cell.click();
  await leaveBoard(page);
  await page.keyboard.press("3");
  assertEqual(await markDigits(page, index, "user-note"), [3], "keyboard adds a note");
  assertEqual((await boardOf(page))[index], 0, "a note is not a placed digit");
  await page.keyboard.press("3");
  assertEqual(await markDigits(page, index, "user-note"), [], "keyboard removes a note");
  await page.keyboard.press("N");
  assertEqual(
    await page.locator("#mode-normal").getAttribute("aria-pressed"),
    "true",
    "N returns to normal mode"
  );
  await page.keyboard.press("N");
  const pad = page.locator('#number-pad button[data-number="8"]');
  const boxBefore = await page.locator('#number-pad button[data-number="8"] .box-map i.on').count();
  await pad.click({ position: { x: 6, y: 6 } });
  assertEqual(await markDigits(page, index, "user-note"), [8], "pad corner click adds a note");
  assertEqual((await boardOf(page))[index], 0, "pad click in notes mode does not place a digit");
  assertEqual(
    await page.locator('#number-pad button[data-number="8"] .box-map i.on').count(),
    boxBefore,
    "a note does not fill the box map"
  );
  await pad.click();
  assertEqual(await markDigits(page, index, "user-note"), [], "pad click removes the note");
  await context.close();
});

await check("placing a digit clears that note from peers, updates the box map, and undo restores it", async () => {
  const { context, page } = await openPage({ viewport: { width: 1280, height: 900 } });
  await leaveBoard(page);
  const save = await saveOf(page);
  const pair = emptyPeer(save.board);
  assert(pair, "two empty peers");
  const [noted, placed] = pair;
  const digit = save.solution[placed];
  await page.locator("#mode-notes").click();
  await page.locator(".cell").nth(noted).click();
  await leaveBoard(page);
  await page.keyboard.press(String(digit));
  assertEqual(await markDigits(page, noted, "user-note"), [digit], "peer note exists");
  await page.locator("#mode-normal").click();
  await page.locator(".cell").nth(placed).click();
  await leaveBoard(page);
  const box = boxOf(placed);
  const filledBefore = await page.locator(`#number-pad button[data-number="${digit}"] .box-map i.on`).count();
  await page.keyboard.press(String(digit));
  assertEqual((await boardOf(page))[placed], digit, "normal mode places the digit");
  assertEqual(await markDigits(page, noted, "user-note"), [], "placed digit clears the peer note");
  assertEqual(await markDigits(page, placed, "user-note"), [], "placing does not leave a note in the cell");
  const segmentOn = await page
    .locator(`#number-pad button[data-number="${digit}"] .box-map i`)
    .nth(box)
    .evaluate((node) => node.classList.contains("on"));
  assert(segmentOn, "box map marks the box that received the digit");
  assert(
    (await page.locator(`#number-pad button[data-number="${digit}"] .box-map i.on`).count()) === filledBefore + 1,
    "box map count grows by one"
  );
  await page.locator("#undo-btn").click();
  assertEqual((await boardOf(page))[placed], 0, "undo removes the placed digit");
  assertEqual(await markDigits(page, noted, "user-note"), [digit], "undo restores the peer note");
  await page.locator("#undo-btn").click();
  assertEqual(await markDigits(page, noted, "user-note"), [], "undo removes the note itself");
  await context.close();
});

await check("auto-candidates toggles during a game and follows placed digits", async () => {
  const { context, page } = await openPage({ viewport: { width: 1280, height: 900 } });
  await leaveBoard(page);
  const save = await saveOf(page);
  let index = -1;
  let kept = 0;
  let placedDigit = 0;
  let peer = -1;
  for (let cell = 0; cell < 81; cell += 1) {
    if (save.board[cell] !== 0) continue;
    const options = candidatesFor(save.board, cell);
    const emptyPeer = peerIndexes(cell).find((other) => save.board[other] === 0);
    if (options.length < 2 || emptyPeer == null) continue;
    index = cell;
    kept = options[0];
    placedDigit = options[1];
    peer = emptyPeer;
    break;
  }
  assert(index >= 0, "an empty cell has two candidates and an empty peer");
  await page.locator("#mode-notes").click();
  await page.locator(".cell").nth(index).click();
  await leaveBoard(page);
  await page.keyboard.press(String(kept));
  await page.locator("#mode-normal").click();
  await page.locator("#auto-candidates").check();
  assert(await page.locator("#auto-candidates").isChecked(), "in-game toggle is on");
  const board = await boardOf(page);
  for (let cell = 0; cell < 81; cell += 1) {
    if (board[cell] !== 0) {
      assertEqual(await markDigits(page, cell, "auto"), [], `filled cell ${cell} has no auto marks`);
      continue;
    }
    const expected = candidatesFor(board, cell).filter((number) => !(cell === index && number === kept));
    assertEqual(await markDigits(page, cell, "auto"), expected, `auto candidates in cell ${cell}`);
  }
  assertEqual(await markDigits(page, index, "user-note"), [kept], "a manual note stays while auto-candidates is on");
  await page.locator(".cell").nth(peer).click();
  await leaveBoard(page);
  await page.keyboard.press(String(placedDigit));
  assert(
    !(await markDigits(page, index, "auto")).includes(placedDigit),
    "auto-candidates drop a digit placed in a peer"
  );
  assertEqual(
    await markDigits(page, index, "user-note"),
    kept === placedDigit ? [] : [kept],
    "only the placed digit is cleared from manual notes"
  );
  await page.locator("#auto-candidates").uncheck();
  assertEqual(await markDigits(page, index, "auto"), [], "turning auto-candidates off hides computed marks");
  assertEqual(
    await markDigits(page, index, "user-note"),
    kept === placedDigit ? [] : [kept],
    "manual notes remain after auto-candidates is turned off"
  );
  await page.locator("#settings-btn").click();
  await page.locator('[data-setting="autoCandidates"]').check();
  assert(await page.locator("#auto-candidates").isChecked(), "settings toggle turns the current game on");
  await page.locator('[data-close="settings-modal"]').click();
  assert((await page.locator(".marks span.on.auto").count()) > 0, "settings toggle shows candidates without a new game");
  await context.close();
});

await check("selected cell has no outset focus ring", async () => {
  const { context, page } = await openPage({ viewport: { width: 1280, height: 900 } });
  const cell = page.locator(".cell").nth(0);
  await cell.click();
  const clicked = await cell.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      outlineStyle: style.outlineStyle,
      outlineOffset: style.outlineOffset,
      boxShadow: style.boxShadow,
      zIndex: style.zIndex,
      background: style.backgroundColor,
    };
  });
  assertEqual(clicked.outlineStyle, "none", "mouse selection has no outline");
  assertEqual(clicked.outlineOffset, "0px", "mouse selection has no outline gap");
  assertEqual(clicked.boxShadow, "none", "mouse selection has no focus shadow");
  assertEqual(clicked.zIndex, "auto", "selected cell does not lift over the grid");
  assertEqual(clicked.background, "rgb(239, 125, 18)", "selected cell is a solid fill");
  await page.keyboard.press("ArrowRight");
  const keyed = await page.locator(".cell.selected").evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      outlineStyle: style.outlineStyle,
      outlineOffset: style.outlineOffset,
      boxShadow: style.boxShadow,
    };
  });
  assertEqual(keyed.outlineStyle, "none", "keyboard focus has no outset outline");
  assertEqual(keyed.outlineOffset, "0px", "keyboard focus has no gap");
  assert(keyed.boxShadow.includes("inset"), `keyboard focus is an inset ring: ${keyed.boxShadow}`);
  await context.close();
});

async function assertMarkGeometry(page, label) {
  const board = await boardOf(page);
  const index = board.findIndex((value) => value === 0);
  const geometry = await page.locator(".cell").nth(index).evaluate((el) => {
    const cell = el.getBoundingClientRect();
    const fontSize = Number.parseFloat(getComputedStyle(el.querySelector(".marks")).fontSize);
    const digits = [...el.querySelectorAll(".marks span")].map((span) => {
      const box = span.getBoundingClientRect();
      return {
        digit: Number(span.dataset.digit),
        cx: (box.left + box.right) / 2 - cell.left,
        cy: (box.top + box.bottom) / 2 - cell.top,
      };
    });
    return { width: cell.width, height: cell.height, fontSize, digits };
  });
  assert(geometry.fontSize >= 11, `${label} note font is readable (${geometry.fontSize}px)`);
  const byDigit = new Map(geometry.digits.map((digit) => [digit.digit, digit]));
  const expectZone = { 1: [0, 0], 5: [1, 1], 6: [2, 1], 9: [2, 2] };
  for (const [digit, [column, row]] of Object.entries(expectZone)) {
    const mark = byDigit.get(Number(digit));
    assert(mark, `${label} digit ${digit} exists`);
    assertEqual(zone(mark.cx, geometry.width), column, `${label} digit ${digit} column`);
    assertEqual(zone(mark.cy, geometry.height), row, `${label} digit ${digit} row`);
  }
}

await check("note digits sit in a 3x3 on desktop", async () => {
  const { context, page } = await openPage({ viewport: { width: 1280, height: 900 } });
  await assertMarkGeometry(page, "desktop");
  await context.close();
});

await check("touch selection shows candidates and notes stay in a 3x3", async () => {
  const { context, page } = await openPage({
    ...devices["iPhone 12"],
    viewport: { width: 390, height: 844 },
  });
  const coarse = await page.evaluate(
    () => !window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
  assert(coarse, "phone emulation has no fine hover");
  const board = await boardOf(page);
  const selected = await page.locator(".cell.selected").evaluate((el) => Number(el.dataset.index));
  assertEqual(
    await markDigits(page, selected, "preview"),
    candidatesFor(board, selected),
    "the selected cell shows candidates without a hover"
  );
  const other = board.findIndex((value, index) => value === 0 && index !== selected);
  const target = page.locator(".cell").nth(other);
  const point = await target.boundingBox();
  await page.touchscreen.tap(point.x + point.width / 2, point.y + point.height / 2);
  const after = await boardOf(page);
  assertEqual(
    await markDigits(page, other, "preview"),
    candidatesFor(after, other),
    "tapping an empty cell shows its candidates"
  );
  const ring = await page.locator(".cell.selected").evaluate((el) => {
    const style = getComputedStyle(el);
    return { outlineStyle: style.outlineStyle, outlineOffset: style.outlineOffset };
  });
  assertEqual(ring.outlineStyle, "none", "touch selection has no outset outline");
  assertEqual(ring.outlineOffset, "0px", "touch selection has no outline gap");
  await page.locator("#mode-notes").tap();
  await page.keyboard.press("6");
  assertEqual(await markDigits(page, other, "user-note"), [6], "touch notes mode still records a digit");
  await assertMarkGeometry(page, "mobile");
  await context.close();
});

await check("preview equals candidates after placements, a new game, and a resumed save", async () => {
  const { context, page } = await openPage({ viewport: { width: 1280, height: 900 } });
  await leaveBoard(page);
  const original = await saveOf(page);
  const placed = [];
  for (let index = 0; index < 81 && placed.length < 3; index += 1) {
    if (original.board[index] === 0) placed.push(index);
  }
  await page.locator("#mode-normal").click();
  for (const index of placed) {
    await page.locator(".cell").nth(index).click();
    await leaveBoard(page);
    await page.keyboard.press(String(original.solution[index]));
  }
  let board = await boardOf(page);
  for (const index of placed) assertEqual(board[index], original.solution[index], `placed solution at ${index}`);
  const empty = board.map((value, index) => (value === 0 ? index : -1)).filter((index) => index >= 0);
  for (const index of empty) {
    await page.locator(".cell").nth(index).hover();
    assertEqual(await markDigits(page, index, "user-note"), [], `placement left a note at ${index}`);
    assertEqual(await markDigits(page, index, "preview"), candidatesFor(board, index), `preview after placements at ${index}`);
  }
  await leaveBoard(page);
  for (const index of empty) {
    assertEqual(await markDigits(page, index, "preview"), [], `preview stuck at ${index}`);
  }

  const noted = empty[0];
  const blockingPeer = peerIndexes(noted).find((other) => board[other] !== 0);
  const remnant = board[blockingPeer];
  const stillPossible = candidatesFor(board, noted)[0];
  assert(remnant && stillPossible && remnant !== stillPossible, "need a remnant digit and a real candidate");
  const stale = await saveOf(page);
  stale.notes = stale.notes.map((list, index) => (index === noted ? [remnant, stillPossible] : list));
  await page.evaluate((payload) => {
    sessionStorage.setItem("keep-save", "1");
    localStorage.setItem("sudoku-progress", JSON.stringify(payload));
  }, stale);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("#resume-yes").click();
  await page.waitForFunction(() => {
    const cover = document.querySelector("#board-cover");
    return cover && cover.hidden && document.querySelectorAll(".cell.given").length > 0;
  });
  board = await boardOf(page);
  await page.locator(".cell").nth(noted).hover();
  const resumedNotes = await markDigits(page, noted, "user-note");
  const resumedPreview = await markDigits(page, noted, "preview");
  const expected = candidatesFor(board, noted);
  assert(!expected.includes(remnant), "remnant digit is already placed in the house");
  assertEqual(resumedNotes, [remnant, stillPossible].sort((a, b) => a - b), "resumed pencil marks stay notes");
  assert(!resumedPreview.includes(remnant), "a remnant note is not painted as a candidate");
  assertEqual(
    resumedPreview,
    expected.filter((number) => !resumedNotes.includes(number)),
    "preview equals candidates except digits stored as notes"
  );

  await page.locator('.difficulty-tabs button[data-difficulty="easy"]').click();
  await page.waitForFunction(() => {
    const cover = document.querySelector("#board-cover");
    const label = document.querySelector("#puzzle-label");
    return cover && cover.hidden && label && label.textContent === "Easy" && document.querySelectorAll(".cell.given").length > 0;
  }, null, { timeout: 60000 });
  assertEqual(await page.locator(".marks span.on.user-note").count(), 0, "a new game drops remnant notes");
  board = await boardOf(page);
  const freshEmpty = board.findIndex((value) => value === 0);
  await page.locator(".cell").nth(freshEmpty).hover();
  assertEqual(await markDigits(page, freshEmpty, "preview"), candidatesFor(board, freshEmpty), "new game preview");
  await context.close();

  const mobileSession = await openPage({
    ...devices["iPhone 12"],
    viewport: { width: 390, height: 844 },
  });
  const phone = mobileSession.page;
  const phoneSave = await saveOf(phone);
  const phoneEmpty = phoneSave.board.findIndex((value) => value === 0);
  const spot = await phone.locator(".cell").nth(phoneEmpty).boundingBox();
  await phone.touchscreen.tap(spot.x + spot.width / 2, spot.y + spot.height / 2);
  await phone.keyboard.press(String(phoneSave.solution[phoneEmpty]));
  const phoneBoard = await boardOf(phone);
  const nextEmpty = phoneBoard.findIndex((value) => value === 0);
  const nextSpot = await phone.locator(".cell").nth(nextEmpty).boundingBox();
  await phone.touchscreen.tap(nextSpot.x + nextSpot.width / 2, nextSpot.y + nextSpot.height / 2);
  assertEqual(
    await markDigits(phone, nextEmpty, "preview"),
    candidatesFor(phoneBoard, nextEmpty),
    "mobile preview after a placement"
  );
  await mobileSession.context.close();

  const staleContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await staleContext.addInitScript(() => {
    if (window !== window.top) return;
    localStorage.setItem(
      "sudoku-progress",
      JSON.stringify({
        version: 0,
        notes: Array.from({ length: 81 }, () => [1, 2, 3, 4, 5, 6, 7, 8, 9]),
        puzzle: Array(81).fill(1),
        board: Array(81).fill(1),
        solution: Array(81).fill(1),
      })
    );
  });
  const stalePage = await staleContext.newPage();
  await stalePage.route("**/*", (route) => {
    const url = route.request().url();
    if (/google|gstatic|doubleclick|googlesyndication/.test(url)) return route.abort();
    return route.continue();
  });
  await stalePage.goto(`${origin}/?difficulty=quick`, { waitUntil: "domcontentloaded" });
  await stalePage.waitForFunction(() => {
    const cover = document.querySelector("#board-cover");
    const modal = document.querySelector("#resume-modal");
    return cover && cover.hidden && modal && modal.hidden && document.querySelectorAll(".cell.given").length > 0;
  }, null, { timeout: 60000 });
  assertEqual(await stalePage.locator(".marks span.on.user-note").count(), 0, "an old save is not resumed");
  const ignoredBoard = await boardOf(stalePage);
  const ignoredEmpty = ignoredBoard.findIndex((value) => value === 0);
  await stalePage.locator(".cell").nth(ignoredEmpty).hover();
  assertEqual(
    await markDigits(stalePage, ignoredEmpty, "preview"),
    candidatesFor(ignoredBoard, ignoredEmpty),
    "ignored save does not change the preview"
  );
  await staleContext.close();
});

server.close();
await browser.close();

if (failures.length) {
  console.error(`\n${failures.length} failed`);
  process.exit(1);
}
console.log("\nall candidate tests passed");
