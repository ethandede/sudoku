// Board behavior: notes, auto-candidates, undo, and the selected-cell focus
// ring. Candidates render only when Auto candidates is checked. Requires the
// Playwright chromium build (`npx playwright install chromium`). Builds dist/ first.
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";
import { homeCopy } from "../home-copy.mjs";

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

const boardTokens = readFileSync(join(root, "assets/scss/pages/_sudoku.scss"), "utf8")
  .split("\n")
  .filter((line) => /--(?:board|cell|given)-bg:/.test(line));
assertEqual(boardTokens.length, 6, "light and dark board, cell, and given tokens");
for (const line of boardTokens) {
  assert(!/#fff\b|#ffffff/i.test(line), `pure white left on ${line.trim()}`);
}
assertEqual(boardTokens.filter((line) => line.includes("#fbfaf8")).length, 3, "light board is warm paper");
assertEqual(boardTokens.filter((line) => line.includes("#1e1d1b")).length, 3, "dark board is warm graphite");

const sudokuScss = readFileSync(join(root, "assets/scss/pages/_sudoku.scss"), "utf8");
assert(sudokuScss.includes("font-size: clamp(11px, 3.5cqi, 16px)"), "candidate size uses the phone clamp");
assert(!sudokuScss.includes("3.2cqi"), "the old candidate clamp is gone");
assert(!sudokuScss.includes("2.8cqi"), "hints no longer shrink candidates");
assert(sudokuScss.includes("font-variant-numeric: tabular-nums"), "candidates use tabular numerals");
assert(sudokuScss.includes('font-feature-settings: "tnum"'), "candidates enable tnum");
assert(sudokuScss.includes("--auto-ink: #4f4b46"), "light auto candidates use the warm ink");
assert(sudokuScss.includes("--auto-ink: #c4bfb8"), "dark auto candidates stay off the muted chrome");
assert(sudokuScss.includes("--auto-on-selected: #ecebe8"), "selected auto candidates lighten in dark mode");
assert(!sudokuScss.includes("#24303a") && !sudokuScss.includes("#2c4256") && !sudokuScss.includes("#355068"), "dark cell tints are no longer cool slate");
const phoneHeading = sudokuScss.slice(sudokuScss.indexOf("html .game-intro h1"), sudokuScss.indexOf("html .game-intro h1") + 360);
assert(phoneHeading.includes("font-size: clamp(14px, 3.9vw, 16px)"), "phone heading uses the tight clamp");
assert(phoneHeading.includes("padding: 8px 16px 2px"), "phone heading uses the tight padding");
assert(phoneHeading.includes("white-space: normal"), "phone heading keeps the default wrap");
assert(!phoneHeading.includes("ellipsis") && !phoneHeading.includes("nowrap"), "phone heading is not truncated");

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

async function selectCell(page, index) {
  const selected = await page.locator(".cell").nth(index).getAttribute("aria-selected");
  if (selected !== "true") await page.locator(".cell").nth(index).click();
}

async function spotPoint(page, index, digit) {
  const box = await page.locator(".cell").nth(index).locator(`.marks span[data-digit="${digit}"]`).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function ghostMarks(page) {
  return page.locator(".marks span.ghost").evaluateAll((nodes) =>
    nodes.map((node) => ({
      index: Number(node.closest(".cell").dataset.index),
      digit: Number(node.dataset.digit),
    }))
  );
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

async function assertNoComputedMarks(page, label) {
  assertEqual(await page.locator(".marks span.on.preview").count(), 0, `${label} shows no preview marks`);
  assertEqual(await page.locator(".marks span.on.auto").count(), 0, `${label} shows no auto marks`);
}

await check("hover shows one ghost digit on a selected empty cell and never the full set", async () => {
  const { context, page } = await openPage({ viewport: { width: 1280, height: 900 } });
  await leaveBoard(page);
  assert(!(await page.locator("#auto-candidates").isChecked()), "auto-candidates starts off");
  const board = await boardOf(page);
  const index = board.findIndex((value) => value === 0);
  const other = board.findIndex((value, cell) => value === 0 && cell !== index);
  assert(index >= 0 && other >= 0, "puzzle has two empty cells");
  await selectCell(page, index);
  const early = await spotPoint(page, index, 5);
  await page.mouse.move(early.x, early.y);
  await page.waitForTimeout(120);
  assertEqual(await ghostMarks(page), [], "a ghost waits out the hover delay");
  assertEqual(await markDigits(page, index, "preview"), [], "hover shows no candidate preview");
  assertEqual(await markDigits(page, index, "auto"), [], "hover shows no auto marks");
  await page.waitForTimeout(280);
  assertEqual(await ghostMarks(page), [{ index, digit: 5 }], "one ghost digit appears in its own spot");
  assertEqual(await markDigits(page, index, "user-note"), [], "the ghost does not write a note");
  assertEqual(await boardOf(page), board, "the ghost does not change the board");
  const corner = await spotPoint(page, index, 1);
  await page.mouse.move(corner.x, corner.y);
  await page.waitForTimeout(120);
  assertEqual(await ghostMarks(page), [], "moving to another spot clears the previous ghost");
  await page.waitForTimeout(280);
  assertEqual(await ghostMarks(page), [{ index, digit: 1 }], "the new spot ghosts only its own digit");
  await page.mouse.move(4, 4);
  await page.waitForTimeout(80);
  assertEqual(await ghostMarks(page), [], "leaving the cell clears the ghost");
  const unselected = await spotPoint(page, other, 9);
  await page.mouse.move(unselected.x, unselected.y);
  await page.waitForTimeout(450);
  assertEqual(await ghostMarks(page), [], "an unselected cell never ghosts");
  assertEqual(await markDigits(page, other, "preview"), [], "an unselected cell shows no preview");
  await page.keyboard.press("ArrowRight");
  const moved = await page.locator(".cell.selected").evaluate((el) => Number(el.dataset.index));
  assertEqual(await ghostMarks(page), [], "keyboard focus does not show a ghost");
  assertEqual(await markDigits(page, moved, "preview"), [], "keyboard focus shows no preview");
  assertEqual(await markDigits(page, moved, "auto"), [], "keyboard focus shows no auto marks");
  await assertNoComputedMarks(page, "with auto-candidates off");
  await context.close();
});

await check("clicking a spot toggles that note in normal mode and undo restores it", async () => {
  const { context, page } = await openPage({ viewport: { width: 1280, height: 900 } });
  await leaveBoard(page);
  const save = await saveOf(page);
  const index = save.board.findIndex((value) => value === 0);
  const other = save.board.findIndex((value, cell) => value === 0 && cell !== index);
  assertEqual(await page.locator("#mode-normal").getAttribute("aria-pressed"), "true", "starts in normal mode");
  const first = await spotPoint(page, other, 7);
  await page.mouse.click(first.x, first.y);
  assertEqual(
    await page.locator(".cell.selected").evaluate((el) => Number(el.dataset.index)),
    other,
    "the first click only selects the cell"
  );
  assertEqual(await markDigits(page, other, "user-note"), [], "the first click does not write a note");
  const spot = await spotPoint(page, other, 2);
  await page.mouse.click(spot.x, spot.y);
  assertEqual(await markDigits(page, other, "user-note"), [2], "the second click toggles that digit");
  assertEqual((await boardOf(page))[other], 0, "a spot click does not place a digit");
  assertEqual(await page.locator("#mode-normal").getAttribute("aria-pressed"), "true", "spot clicks stay in normal mode");
  await page.mouse.click(spot.x, spot.y);
  assertEqual(await markDigits(page, other, "user-note"), [], "clicking the spot again removes the note");
  await page.mouse.move(4, 4);
  await page.locator("#undo-btn").click();
  assertEqual(await markDigits(page, other, "user-note"), [2], "undo restores the spot note");
  await page.locator("#undo-btn").click();
  assertEqual(await markDigits(page, other, "user-note"), [], "undo removes the spot note");
  await selectCell(page, index);
  const placed = save.solution[index];
  await page.locator(`#number-pad button[data-number="${placed}"]`).click();
  assertEqual((await boardOf(page))[index], placed, "the keypad still places in normal mode");
  await page.locator("#mode-notes").click();
  const noted = save.board.findIndex((value, cell) => value === 0 && cell !== index && cell !== other);
  await selectCell(page, noted);
  await page.locator('#number-pad button[data-number="4"]').click();
  assertEqual(await markDigits(page, noted, "user-note"), [4], "notes mode on the keypad still toggles a note");
  assertEqual((await boardOf(page))[noted], 0, "notes mode on the keypad does not place");
  await context.close();
});

await check("a phone tap toggles one note spot and the keypad still places", async () => {
  const { context, page } = await openPage({
    ...devices["iPhone 12"],
    viewport: { width: 390, height: 844 },
  });
  const save = await saveOf(page);
  const selected = await page.locator(".cell.selected").evaluate((el) => Number(el.dataset.index));
  const other = save.board.findIndex((value, index) => value === 0 && index !== selected);
  const first = await spotPoint(page, other, 1);
  await page.touchscreen.tap(first.x, first.y);
  assertEqual(
    await page.locator(".cell.selected").evaluate((el) => Number(el.dataset.index)),
    other,
    "the first tap selects the cell"
  );
  assertEqual(await markDigits(page, other, "user-note"), [], "the first tap does not write a note");
  await page.waitForTimeout(450);
  assertEqual(await ghostMarks(page), [], "touch does not show a hover ghost");
  const again = await spotPoint(page, other, 1);
  await page.touchscreen.tap(again.x, again.y);
  assertEqual(await markDigits(page, other, "user-note"), [1], "tapping the same spot toggles that note");
  assertEqual(await ghostMarks(page), [], "the tapped note is not a ghost");
  const peers = new Set(peerIndexes(other));
  const placeAt = save.board.findIndex((value, index) => value === 0 && index !== other && !peers.has(index));
  assert(placeAt >= 0, "another empty cell is outside the noted cell");
  const placeBox = await page.locator(".cell").nth(placeAt).boundingBox();
  await page.touchscreen.tap(placeBox.x + placeBox.width / 2, placeBox.y + placeBox.height / 2);
  const digit = save.solution[placeAt];
  const key = await page.locator(`#number-pad button[data-number="${digit}"]`).boundingBox();
  await page.touchscreen.tap(key.x + key.width / 2, key.y + key.height / 2);
  assertEqual((await boardOf(page))[placeAt], digit, "tapping the keypad still places a digit");
  assertEqual(await markDigits(page, other, "user-note"), [1], "placing elsewhere keeps the spot note");
  await context.close();
});

await check("hovering an auto-candidate ghosts only that digit and a tap turns it into a note", async () => {
  const { context, page } = await openPage({ viewport: { width: 1280, height: 900 } });
  await leaveBoard(page);
  const save = await saveOf(page);
  let index = -1;
  let digit = 0;
  let kept = 0;
  for (let cell = 0; cell < 81; cell += 1) {
    if (save.board[cell] !== 0) continue;
    const options = candidatesFor(save.board, cell);
    if (options.length < 3) continue;
    index = cell;
    digit = options[0];
    kept = options[1];
    break;
  }
  assert(index >= 0, "an empty cell has three candidates");
  await selectCell(page, index);
  await page.locator("#auto-candidates").check();
  assert(await markDigits(page, index, "auto").then((marks) => marks.includes(digit)), "the digit starts as an auto-candidate");
  const spot = await spotPoint(page, index, digit);
  await page.mouse.move(spot.x, spot.y);
  await page.waitForTimeout(120);
  assertEqual(await ghostMarks(page), [], "the ghost waits before replacing the auto-candidate");
  await page.waitForTimeout(280);
  assertEqual(await ghostMarks(page), [{ index, digit }], "only the hovered auto-candidate becomes a ghost");
  assert(
    (await markDigits(page, index, "auto")).includes(kept),
    "the other auto-candidates stay visible"
  );
  const look = await page.locator(".cell").nth(index).evaluate((el, hovered) => {
    const ghost = el.querySelector(`.marks span.ghost[data-digit="${hovered}"]`);
    const auto = el.querySelector(".marks span.on.auto:not(.ghost)");
    const ghostStyle = getComputedStyle(ghost);
    const autoStyle = getComputedStyle(auto);
    return {
      ghostStyle: ghostStyle.fontStyle,
      ghostDecoration: ghostStyle.textDecorationLine,
      ghostDecorationStyle: ghostStyle.textDecorationStyle,
      ghostWeight: ghostStyle.fontWeight,
      autoStyle: autoStyle.fontStyle,
      autoDecoration: autoStyle.textDecorationLine,
      autoWeight: autoStyle.fontWeight,
      ghostColor: ghostStyle.color,
      autoColor: autoStyle.color,
    };
  }, digit);
  assertEqual(look.ghostStyle, "italic", "the ghost is italic");
  assertEqual(look.ghostDecorationStyle, "dotted", "the ghost underline is dotted");
  assertEqual(look.autoStyle, "normal", "auto-candidates are not italic");
  assert(!look.autoDecoration.includes("underline"), "auto-candidates are not underlined");
  assert(look.ghostColor !== look.autoColor, "the ghost color differs from auto-candidates");
  await page.mouse.click(spot.x, spot.y);
  assertEqual(await markDigits(page, index, "user-note"), [digit], "tapping the ghost makes it a player note");
  assert(!(await markDigits(page, index, "auto")).includes(digit), "the noted digit is no longer an auto-candidate");
  assert((await markDigits(page, index, "auto")).includes(kept), "the other auto-candidates remain");
  assertEqual(await ghostMarks(page), [], "the player note replaces the ghost");
  const note = await page.locator(".cell").nth(index).locator(".marks span.user-note").first().evaluate((el) => {
    const style = getComputedStyle(el);
    return { weight: style.fontWeight, decoration: style.textDecorationLine, style: style.fontStyle };
  });
  assert(Number(note.weight) <= 500, "the player note is not bold");
  assert(!note.decoration.includes("underline"), "the player note has no underline");
  assertEqual(note.style, "normal", "the player note is not italic");
  await context.close();
});

await check("notes add and remove from the keyboard and the number pad", async () => {
  const { context, page } = await openPage({ viewport: { width: 1280, height: 900 } });
  await leaveBoard(page);
  const board = await boardOf(page);
  const index = board.findIndex((value) => value === 0);
  const cell = page.locator(".cell").nth(index);
  await page.locator("#mode-notes").click();
  await selectCell(page, index);
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
  await selectCell(page, noted);
  await leaveBoard(page);
  await page.keyboard.press(String(digit));
  assertEqual(await markDigits(page, noted, "user-note"), [digit], "peer note exists");
  await page.locator("#mode-normal").click();
  await selectCell(page, placed);
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
  await selectCell(page, index);
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
  await selectCell(page, peer);
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

async function markStyle(page, index, kind) {
  return page.locator(".cell").nth(index).locator(`.marks span.on.${kind}`).first().evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      color: style.color,
      weight: style.fontWeight,
      decoration: style.textDecorationLine,
      opacity: Number(style.opacity),
    };
  });
}

function assertDistinct(note, auto, label) {
  assert(Number(note.weight) <= 500, `${label} notes are not bold`);
  assert(!note.decoration.includes("underline"), `${label} notes have no underline`);
  assert(!auto.decoration.includes("underline"), `${label} auto-candidates are not underlined`);
  assert(note.color !== auto.color, `${label} notes and auto-candidates use different colors`);
  assert(note.opacity >= 0.95 && auto.opacity >= 0.95, `${label} both layers stay opaque`);
}

await check("notes and auto-candidates show together and the toggle does not erase notes", async () => {
  const { context, page } = await openPage({ viewport: { width: 390, height: 844 } });
  const save = await saveOf(page);
  let index = -1;
  let noted = 0;
  for (let cell = 0; cell < 81; cell += 1) {
    if (save.board[cell] !== 0) continue;
    const options = candidatesFor(save.board, cell);
    if (options.length < 2) continue;
    index = cell;
    noted = options[0];
    break;
  }
  assert(index >= 0, "an empty cell has two candidates");
  await page.locator("#mode-notes").click();
  await selectCell(page, index);
  await page.keyboard.press(String(noted));
  const stored = (await saveOf(page)).notes[index].slice().sort((a, b) => a - b);
  assertEqual(stored, [noted], "the note is stored before auto-candidates");
  await page.locator("#auto-candidates").check();
  assertEqual(await markDigits(page, index, "user-note"), [noted], "the note stays visible with auto-candidates");
  const autoDigits = await markDigits(page, index, "auto");
  assert(autoDigits.length > 0, "other candidates stay visible beside the note");
  assert(!autoDigits.includes(noted), "the noted digit is not duplicated as an auto-candidate");
  assertEqual(
    autoDigits,
    candidatesFor(await boardOf(page), index).filter((number) => number !== noted),
    "auto-candidates are the remaining legal digits"
  );
  assertDistinct(await markStyle(page, index, "user-note"), await markStyle(page, index, "auto"), "selected light cell");
  await page.locator(".cell").nth((index + 1) % 81).click();
  const emptyPeer = (await boardOf(page)).findIndex((value, cell) => value === 0 && cell !== index);
  await selectCell(page, emptyPeer);
  await selectCell(page, index);
  assertDistinct(await markStyle(page, index, "user-note"), await markStyle(page, index, "auto"), "selected light cell again");
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
  });
  assertDistinct(await markStyle(page, index, "user-note"), await markStyle(page, index, "auto"), "selected dark cell");
  await page.locator("#auto-candidates").uncheck();
  assertEqual(await markDigits(page, index, "auto"), [], "auto-candidates hide without removing the note");
  assertEqual(await markDigits(page, index, "user-note"), [noted], "the note is still on the board");
  assertEqual(
    (await saveOf(page)).notes[index].slice().sort((a, b) => a - b),
    stored,
    "turning auto-candidates off does not rewrite stored notes"
  );
  await page.locator("#auto-candidates").check();
  assertEqual(
    (await saveOf(page)).notes[index].slice().sort((a, b) => a - b),
    stored,
    "turning auto-candidates on does not rewrite stored notes"
  );
  assertEqual(await markDigits(page, index, "user-note"), [noted], "the note is still distinct after toggling back on");
  await context.close();
});

await check("selected cell has no outset focus ring", async () => {
  const { context, page } = await openPage({ viewport: { width: 1280, height: 900 } });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "light";
  });
  const cell = page.locator(".cell").nth(0);
  await cell.click();
  const clicked = await cell.evaluate((el) => {
    const style = getComputedStyle(el);
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--selected)";
    el.appendChild(probe);
    const selectedFill = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return {
      outlineStyle: style.outlineStyle,
      outlineOffset: style.outlineOffset,
      boxShadow: style.boxShadow,
      zIndex: style.zIndex,
      background: style.backgroundColor,
      selectedFill,
    };
  });
  assertEqual(clicked.outlineStyle, "none", "mouse selection has no outline");
  assertEqual(clicked.outlineOffset, "0px", "mouse selection has no outline gap");
  assertEqual(clicked.boxShadow, "none", "mouse selection has no focus shadow");
  assertEqual(clicked.zIndex, "auto", "selected cell does not lift over the grid");
  assertEqual(clicked.background, clicked.selectedFill, "selected cell uses the palette fill");
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

await check("touch selection does not show candidates and notes stay in a 3x3", async () => {
  const { context, page } = await openPage({
    ...devices["iPhone 12"],
    viewport: { width: 390, height: 844 },
  });
  const coarse = await page.evaluate(
    () => !window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
  assert(coarse, "phone emulation has no fine hover");
  assert(!(await page.locator("#auto-candidates").isChecked()), "auto-candidates starts off");
  const board = await boardOf(page);
  const selected = await page.locator(".cell.selected").evaluate((el) => Number(el.dataset.index));
  assertEqual(await markDigits(page, selected, "preview"), [], "the selected cell shows no preview");
  assertEqual(await markDigits(page, selected, "auto"), [], "the selected cell shows no auto marks");
  const other = board.findIndex((value, index) => value === 0 && index !== selected);
  const target = page.locator(".cell").nth(other);
  const point = await target.boundingBox();
  await page.touchscreen.tap(point.x + point.width / 2, point.y + point.height / 2);
  assertEqual(await markDigits(page, other, "preview"), [], "tapping an empty cell shows no preview");
  assertEqual(await markDigits(page, other, "auto"), [], "tapping an empty cell shows no auto marks");
  await assertNoComputedMarks(page, "a phone with auto-candidates off");
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

await check("candidates stay off after placements until auto-candidates is checked", async () => {
  const { context, page } = await openPage({ viewport: { width: 1280, height: 900 } });
  await leaveBoard(page);
  const original = await saveOf(page);
  const placed = [];
  for (let index = 0; index < 81 && placed.length < 3; index += 1) {
    if (original.board[index] === 0) placed.push(index);
  }
  await page.locator("#mode-normal").click();
  for (const index of placed) {
    await selectCell(page, index);
    await leaveBoard(page);
    await page.keyboard.press(String(original.solution[index]));
  }
  let board = await boardOf(page);
  for (const index of placed) assertEqual(board[index], original.solution[index], `placed solution at ${index}`);
  const empty = board.map((value, index) => (value === 0 ? index : -1)).filter((index) => index >= 0);
  for (const index of empty) {
    await page.locator(".cell").nth(index).hover();
    await selectCell(page, index);
    assertEqual(await markDigits(page, index, "user-note"), [], `placement left a note at ${index}`);
    assertEqual(await markDigits(page, index, "preview"), [], `hover or select shows a preview at ${index}`);
    assertEqual(await markDigits(page, index, "auto"), [], `hover or select shows auto marks at ${index}`);
  }
  await leaveBoard(page);
  await assertNoComputedMarks(page, "after placements");

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
  await selectCell(page, noted);
  const resumedNotes = await markDigits(page, noted, "user-note");
  const expected = candidatesFor(board, noted);
  assert(!expected.includes(remnant), "remnant digit is already placed in the house");
  assertEqual(resumedNotes, [remnant, stillPossible].sort((a, b) => a - b), "resumed pencil marks stay notes");
  assertEqual(await markDigits(page, noted, "preview"), [], "a resumed note is not a hover preview");
  assertEqual(await markDigits(page, noted, "auto"), [], "resumed notes do not turn auto-candidates on");
  await page.locator("#auto-candidates").check();
  const resumedAuto = await markDigits(page, noted, "auto");
  assert(!resumedAuto.includes(remnant), "a remnant note is not painted as an auto-candidate");
  assert(!resumedAuto.includes(stillPossible), "a real note is not also painted as an auto-candidate");
  assertEqual(
    resumedAuto,
    expected.filter((number) => !resumedNotes.includes(number)),
    "auto-candidates fill the digits the player has not noted"
  );
  assertEqual(await markDigits(page, noted, "user-note"), resumedNotes, "turning auto-candidates on keeps the notes");
  for (let cell = 0; cell < 81; cell += 1) {
    if (board[cell] !== 0) continue;
    const notes = await markDigits(page, cell, "user-note");
    assertEqual(
      await markDigits(page, cell, "auto"),
      candidatesFor(board, cell).filter((number) => !notes.includes(number)),
      `checked auto-candidates in cell ${cell}`
    );
  }
  await page.locator("#auto-candidates").uncheck();
  assertEqual(await markDigits(page, noted, "auto"), [], "turning auto-candidates off hides the computed marks");
  assertEqual(await markDigits(page, noted, "user-note"), resumedNotes, "turning auto-candidates off keeps the notes");

  await page.locator("#puzzle-label").click();
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
  await selectCell(page, freshEmpty);
  assertEqual(await markDigits(page, freshEmpty, "preview"), [], "a new game does not preview on hover");
  assertEqual(await markDigits(page, freshEmpty, "auto"), [], "a new game does not show auto marks");
  assert(!(await page.locator("#auto-candidates").isChecked()), "a new game leaves auto-candidates off");
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
  assertEqual(await markDigits(phone, nextEmpty, "preview"), [], "mobile selection after a placement shows no preview");
  assertEqual(await markDigits(phone, nextEmpty, "auto"), [], "mobile selection after a placement shows no auto marks");
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
  assertEqual(await markDigits(stalePage, ignoredEmpty, "preview"), [], "an ignored save does not preview candidates");
  assertEqual(await markDigits(stalePage, ignoredEmpty, "auto"), [], "an ignored save does not show auto marks");
  await staleContext.close();
});

function luminance(color) {
  const text = String(color);
  const rgb = text.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  const srgb = text.match(/color\(srgb\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/);
  const channels = rgb
    ? rgb.slice(1).map(Number)
    : srgb
      ? srgb.slice(1).map((channel) => Number(channel) * 255)
      : null;
  if (!channels) throw new Error(`unparsed color ${text}`);
  const [red, green, blue] = channels;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

await check("selection fills keep givens distinct from entries", async () => {
  const { context, page } = await openPage({ viewport: { width: 1280, height: 900 } });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "light";
  });
  await leaveBoard(page);
  const index = await page.evaluate(() => {
    const cells = [...document.querySelectorAll(".cell")];
    const given = cells.map((cell) => cell.classList.contains("given"));
    const values = cells.map((cell) => Number(cell.dataset.value));
    const peersOf = (i) => {
      const row = Math.floor(i / 9);
      const col = i % 9;
      const set = [];
      for (let n = 0; n < 9; n += 1) set.push(row * 9 + n, n * 9 + col);
      const boxRow = Math.floor(row / 3) * 3;
      const boxCol = Math.floor(col / 3) * 3;
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) set.push((boxRow + r) * 9 + boxCol + c);
      }
      return [...new Set(set)].filter((other) => other !== i);
    };
    for (let i = 0; i < 81; i += 1) {
      if (values[i] !== 0) continue;
      const peers = peersOf(i);
      const row = Math.floor(i / 9);
      const col = i % 9;
      const boxRow = Math.floor(row / 3);
      const boxCol = Math.floor(col / 3);
      const givenPeer = (pred) => peers.some((other) => given[other] && pred(other));
      if (
        givenPeer((other) => Math.floor(other / 9) === row) &&
        givenPeer((other) => other % 9 === col) &&
        givenPeer((other) => Math.floor(other / 9 / 3) === boxRow && Math.floor((other % 9) / 3) === boxCol)
      ) {
        return i;
      }
    }
    return -1;
  });
  assert(index >= 0, "an empty cell has a given in its row, column, and box");
  await selectCell(page, index);
  await leaveBoard(page);
  const fills = await page.evaluate(() => {
    const background = (el) => (el ? getComputedStyle(el).backgroundColor : "");
    const cells = [...document.querySelectorAll(".cell")];
    const selected = cells.find((cell) => cell.classList.contains("selected"));
    const givenPeer = cells.find((cell) => cell.classList.contains("given") && cell.classList.contains("peer"));
    const emptyPeer = cells.find(
      (cell) => cell.classList.contains("peer") && !cell.classList.contains("given") && !cell.classList.contains("same")
    );
    const given = cells.find(
      (cell) =>
        cell.classList.contains("given") &&
        !cell.classList.contains("peer") &&
        !cell.classList.contains("selected") &&
        !cell.classList.contains("same")
    );
    const open = cells.find(
      (cell) =>
        cell.dataset.value === "0" &&
        !cell.classList.contains("given") &&
        !cell.classList.contains("peer") &&
        !cell.classList.contains("selected") &&
        !cell.classList.contains("same")
    );
    const entered = cells.find(
      (cell) =>
        cell.classList.contains("user") &&
        !cell.classList.contains("peer") &&
        !cell.classList.contains("selected") &&
        !cell.classList.contains("same")
    );
    const host = document.querySelector(".sudoku-page");
    const paint = (name) => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = `var(${name})`;
      host.appendChild(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    };
    const inkOf = (name) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${name})`;
      host.appendChild(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    return {
      selected: background(selected),
      selectedFill: paint("--selected"),
      selectedOutline: getComputedStyle(selected).outlineStyle,
      givenPeer: background(givenPeer),
      emptyPeer: background(emptyPeer),
      given: background(given),
      open: background(open),
      entered: background(entered),
      givenInk: given ? getComputedStyle(given).color : "",
      userInk: inkOf("--user-ink"),
    };
  });
  assertEqual(fills.selected, fills.selectedFill, "selected cell uses the palette fill");
  assertEqual(fills.selectedOutline, "none", "selection has no border");
  // Approved color change: the board is warm paper, not pure white.
  const paper = "rgb(251, 250, 248)";
  assertEqual(fills.given, paper, "givens sit on the warm board");
  assertEqual(fills.open, paper, "empty cells use the warm board");
  if (fills.entered) assertEqual(fills.entered, paper, "player entries use the warm board");
  assert(fills.givenPeer && fills.emptyPeer, "the highlight includes a given and an open cell");
  assert(fills.givenPeer !== fills.given, "a highlighted given is tinted");
  assert(fills.emptyPeer !== fills.open, "a highlighted open cell is tinted");
  assertEqual(fills.givenPeer, fills.emptyPeer, "givens and empty cells share the peer tint");
  assert(luminance(fills.selected) < luminance(fills.emptyPeer), "the selected fill is stronger than the peer tint");
  assert(fills.givenInk !== fills.userInk, "givens stay charcoal and entries use the accent");
  await context.close();
});

await check("digits, notes, and auto-candidates meet WCAG AA", async () => {
  const { context, page } = await openPage({ viewport: { width: 1280, height: 900 } });
  const report = await page.evaluate(() => {
    const lin = (channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    const channels = (color) => color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/).slice(1).map(Number);
    const lum = (color) => {
      const [red, green, blue] = channels(color);
      return 0.2126 * lin(red) + 0.7152 * lin(green) + 0.0722 * lin(blue);
    };
    const contrast = (fg, bg) => {
      const hi = Math.max(lum(fg), lum(bg));
      const lo = Math.min(lum(fg), lum(bg));
      return (hi + 0.05) / (lo + 0.05);
    };
    const paint = (prop, as) => {
      const probe = document.createElement("span");
      probe.style[as] = `var(${prop})`;
      document.querySelector(".sudoku-page").appendChild(probe);
      const color = getComputedStyle(probe)[as === "color" ? "color" : "backgroundColor"];
      probe.remove();
      return color;
    };
    const out = {};
    for (const theme of ["light", "dark"]) {
      document.documentElement.dataset.theme = theme;
      for (const ink of ["--ink", "--user-ink", "--note-ink", "--auto-ink", "--ghost-ink", "--slash"]) {
        for (const surface of ["--cell-bg", "--selected", "--peer", "--same"]) {
          out[`${theme} ${ink} on ${surface}`] = contrast(paint(ink, "color"), paint(surface, "backgroundColor"));
        }
      }
      const toggle = getComputedStyle(document.querySelector("#mode-normal"));
      out[`${theme} toggle`] = contrast(toggle.color, toggle.backgroundColor);
      const given = document.querySelector(".cell.given");
      given.classList.add("selected");
      out[`${theme} given digit on selected`] = contrast(getComputedStyle(given).color, getComputedStyle(given).backgroundColor);
      given.classList.remove("selected");
      const empty = document.querySelector('.cell[data-value="0"]');
      empty.classList.add("selected");
      out[`${theme} entry ink on selected`] = contrast(getComputedStyle(empty).color, getComputedStyle(empty).backgroundColor);
      empty.classList.remove("selected");
      out[`${theme} map distinct`] = paint("--map-empty", "backgroundColor") === paint("--map-fill", "backgroundColor") ? 1 : 5;
      out[`${theme} digit on map fill`] = contrast(paint("--pad-ink", "color"), paint("--map-fill", "backgroundColor"));
      out[`${theme} digit on map empty`] = contrast(paint("--pad-ink", "color"), paint("--map-empty", "backgroundColor"));
      out[`${theme} count on map fill`] = contrast(paint("--count-ink", "color"), paint("--map-fill", "backgroundColor"));
      out[`${theme} count on map empty`] = contrast(paint("--count-ink", "color"), paint("--map-empty", "backgroundColor"));
      const accentFill = paint("--accent-btn", "backgroundColor");
      out[`${theme} map is a tint`] = paint("--map-fill", "backgroundColor") === accentFill ? 1 : 5;
      const cell = lum(paint("--cell-bg", "backgroundColor"));
      const peer = lum(paint("--peer", "backgroundColor"));
      const same = lum(paint("--same", "backgroundColor"));
      const selected = lum(paint("--selected", "backgroundColor"));
      const ordered = theme === "light" ? cell > peer && peer > same && same > selected : cell < peer && peer < same && same < selected;
      out[`${theme} fill order`] = ordered ? 5 : 1;
      const note = paint("--note-ink", "color");
      const auto = paint("--auto-ink", "color");
      const ghost = paint("--ghost-ink", "color");
      out[`${theme} mark colors differ`] = note !== auto && note !== ghost && auto !== ghost ? 5 : 1;
    }
    document.documentElement.dataset.theme = "light";
    return out;
  });
  for (const [name, value] of Object.entries(report)) {
    assert(value >= 4.5, `${name} is ${Number(value).toFixed(2)}`);
  }
  await context.close();
});

await check("the phone keypad keys and mini-grid cells are square", async () => {
  const { context, page } = await openPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
  });
  assert(await page.locator("#undo-btn").isDisabled(), "undo starts disabled");
  const keySizes = {};
  for (const [width, height] of [
    [390, 844],
    [375, 667],
    [360, 740],
    [430, 932],
  ]) {
    await page.setViewportSize({ width, height });
    const metrics = await page.evaluate(() => {
      const box = (el) => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom, left: rect.left };
      };
      const erase = box(document.querySelector("#erase-btn"));
      const aux = document.querySelector(".aux-row").getBoundingClientRect();
      const board = document.querySelector(".sudoku-grid").getBoundingClientRect();
      const keys = [...document.querySelectorAll("#number-pad button, #erase-btn")].map(box);
      const cells = [...document.querySelectorAll("#number-pad .box-map i")].slice(0, 9).map(box);
      const footer = document.querySelector(".site-footer").getBoundingClientRect();
      const h1 = document.querySelector(".game-intro h1");
      const h1Style = getComputedStyle(h1);
      const h1Box = h1.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(h1);
      const chrome = document.querySelector(".play-chrome").getBoundingClientRect();
      const mode = document.querySelector(".mode-toggle").getBoundingClientRect();
      return {
        eraseBottom: erase.bottom,
        auxBottom: aux.bottom,
        vh: window.innerHeight,
        keys,
        cells,
        boardWidth: board.width,
        boardHeight: board.height,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        footerTop: footer.top,
        keypadBottom: Math.max(...keys.map((key) => key.bottom)),
        columnJustify: getComputedStyle(document.querySelector(".board-column")).justifyContent,
        header: getComputedStyle(document.querySelector(".site-header")).display,
        intro: getComputedStyle(document.querySelector(".game-intro")).display,
        subhead: getComputedStyle(document.querySelector(".game-intro .supporting-text")).display,
        h1: {
          height: h1Box.height,
          width: h1Box.width,
          text: h1.textContent,
          lines: range.getClientRects().length,
          fontSize: h1Style.fontSize,
          fontWeight: h1Style.fontWeight,
          lineHeight: h1Style.lineHeight,
          letterSpacing: h1Style.letterSpacing,
          padding: h1Style.padding,
          margin: h1Style.margin,
          whiteSpace: h1Style.whiteSpace,
          textOverflow: h1Style.textOverflow,
          color: h1Style.color,
          ink: getComputedStyle(document.querySelector(".sudoku-page")).color,
        },
        gapAbove: board.top - chrome.bottom,
        gapBelow: mode.top - board.bottom,
        help: getComputedStyle(document.querySelector(".key-help")).display,
        padDisplay: getComputedStyle(document.querySelector("#number-pad")).display,
      };
    });
    assert(metrics.header === "none", `${width} hides the site header`);
    assert(metrics.intro !== "none", `${width} shows the heading`);
    assert(metrics.subhead === "none", `${width} hides the subhead`);
    assert(metrics.h1.text === homeCopy.h1, `${width} heading words`);
    assert(metrics.h1.lines === 1, `${width} heading is one line (${metrics.h1.lines}, ${metrics.h1.height})`);
    assert(metrics.h1.height > 0 && metrics.h1.height <= 34, `${width} heading height is ${metrics.h1.height}`);
    assert(metrics.h1.width <= metrics.clientWidth + 1, `${width} heading stays on screen`);
    assert(metrics.h1.fontWeight === "600", `${width} heading weight`);
    assert(metrics.h1.letterSpacing === "0px" || metrics.h1.letterSpacing === "normal", `${width} heading tracking is ${metrics.h1.letterSpacing}`);
    assert(metrics.h1.padding === "8px 16px 2px", `${width} heading padding`);
    assert(metrics.h1.margin === "0px", `${width} heading margin`);
    assert(metrics.h1.whiteSpace === "normal", `${width} heading can wrap`);
    assert(metrics.h1.textOverflow === "clip", `${width} heading is not ellipsized`);
    assert(metrics.h1.color === metrics.h1.ink, `${width} heading uses the ink color`);
    const expectedSize = Math.min(16, Math.max(14, width * 0.039));
    assert(Math.abs(parseFloat(metrics.h1.fontSize) - expectedSize) <= 0.2, `${width} heading size ${metrics.h1.fontSize}`);
    assert(Math.abs(parseFloat(metrics.h1.lineHeight) - parseFloat(metrics.h1.fontSize) * 1.25) <= 0.2, `${width} heading line height`);
    assert(Math.abs(metrics.gapAbove - metrics.gapBelow) <= 4, `${width} board gaps ${metrics.gapAbove.toFixed(2)} and ${metrics.gapBelow.toFixed(2)}`);
    assert(metrics.help === "none", `${width} hides the instructions`);
    assert(metrics.padDisplay === "contents", `${width} keeps the 5 by 2 pad`);
    assert(metrics.eraseBottom <= metrics.vh + 1, `${width} keypad bottom ${metrics.eraseBottom} is inside ${metrics.vh}`);
    assert(metrics.columnJustify === "center", `${width} centers the board in the column`);
    if (width === 390 && height === 844) {
      assert(metrics.keypadBottom <= 792, `${width} keypad bottom ${metrics.keypadBottom} is past 792`);
      assert(Math.abs(metrics.h1.height - 26) <= 4, `390 heading height ${metrics.h1.height}px is about 26px`);
      const dark = await page.evaluate(() => {
        document.documentElement.dataset.theme = "dark";
        const h1 = document.querySelector(".game-intro h1");
        const style = getComputedStyle(h1);
        const range = document.createRange();
        range.selectNodeContents(h1);
        const board = document.querySelector(".sudoku-grid").getBoundingClientRect();
        const chrome = document.querySelector(".play-chrome").getBoundingClientRect();
        const mode = document.querySelector(".mode-toggle").getBoundingClientRect();
        const keys = [...document.querySelectorAll("#number-pad button, #erase-btn")].map((el) => {
          const rect = el.getBoundingClientRect();
          return { width: rect.width, height: rect.height, bottom: rect.bottom };
        });
        return {
          lines: range.getClientRects().length,
          text: h1.textContent,
          color: style.color,
          ink: getComputedStyle(document.querySelector(".sudoku-page")).color,
          gapAbove: board.top - chrome.bottom,
          gapBelow: mode.top - board.bottom,
          keypadBottom: Math.max(...keys.map((key) => key.bottom)),
          square: keys.every((key) => Math.abs(key.width - key.height) <= 1.5),
        };
      });
      await page.evaluate(() => {
        document.documentElement.dataset.theme = "light";
      });
      assert(dark.text === homeCopy.h1, "dark heading words");
      assert(dark.lines === 1, "dark heading is one line");
      assert(dark.color === dark.ink, `dark heading color ${dark.color} is not ink ${dark.ink}`);
      assert(Math.abs(dark.gapAbove - dark.gapBelow) <= 4, `dark board gaps ${dark.gapAbove.toFixed(2)} and ${dark.gapBelow.toFixed(2)}`);
      assert(dark.keypadBottom <= 792, `dark keypad bottom ${dark.keypadBottom} is past 792`);
      assert(dark.square, "dark keys stay square");
    }
    assert(metrics.auxBottom <= metrics.vh + 1, `${width} controls bottom ${metrics.auxBottom} is inside ${metrics.vh}`);
    assert(metrics.vh - metrics.auxBottom <= 16, `${width} leaves ${metrics.vh - metrics.auxBottom}px under the controls`);
    assert(metrics.keys.length === 10, `${width} has 9 digits and erase`);
    for (const key of metrics.keys) {
      assert(Math.abs(key.width - key.height) <= 1.5, `${width} key is ${key.width.toFixed(1)}×${key.height.toFixed(1)}`);
      assert(key.width >= 44 && key.height >= 44, `${width} key is ${key.width.toFixed(1)}px`);
    }
    const widths = metrics.keys.map((key) => key.width);
    assert(Math.max(...widths) - Math.min(...widths) <= 1.5, `${width} keys differ in width`);
    assert(metrics.keys[5].top >= metrics.keys[0].bottom - 2, `${width} second row is below the first`);
    assert(Math.abs(metrics.keys[4].top - metrics.keys[0].top) <= 1.5, `${width} first row is one line`);
    for (const cell of metrics.cells) {
      assert(Math.abs(cell.width - cell.height) <= 1.5, `${width} mini-grid cell is ${cell.width.toFixed(1)}×${cell.height.toFixed(1)}`);
    }
    assert(Math.abs(metrics.boardWidth - metrics.boardHeight) <= 1.5, `${width} board is square`);
    assert(metrics.boardWidth <= metrics.clientWidth + 1, `${width} board stays on screen`);
    if (width >= 390) {
      assert(metrics.boardWidth >= metrics.clientWidth - 2, `${width} board is full width (${metrics.boardWidth})`);
    }
    assert(metrics.scrollWidth <= metrics.clientWidth + 1, `${width} has no horizontal scroll`);
    assert(metrics.footerTop >= metrics.vh - 1, `${width} footer is below the play viewport`);
    keySizes[`${width}x${height}`] = metrics.keys[0].height;
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  const taller = await page.evaluate(() => {
    const key = document.querySelector("#number-pad button").getBoundingClientRect();
    const aux = document.querySelector(".aux-row").getBoundingClientRect();
    return { height: key.height, width: key.width, under: window.innerHeight - aux.bottom };
  });
  assert(Math.abs(taller.height - keySizes["390x844"]) <= 1.5, "extra phone height does not stretch the keys");
  assert(Math.abs(taller.width - taller.height) <= 1.5, "keys stay square on a taller phone");
  assert(taller.under <= 16, `taller phone leaves ${taller.under}px under the controls`);
  await page.setViewportSize({ width: 1280, height: 900 });
  const desktop = await page.evaluate(() => {
    const board = document.querySelector(".sudoku-grid").getBoundingClientRect();
    const erase = document.querySelector("#erase-btn").getBoundingClientRect();
    const aux = document.querySelector(".aux-row").getBoundingClientRect();
    const h1 = document.querySelector(".game-intro h1");
    const h1Style = getComputedStyle(h1);
    return {
      boardRight: board.right,
      eraseLeft: erase.left,
      eraseBottom: erase.bottom,
      auxBottom: aux.bottom,
      vh: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      header: getComputedStyle(document.querySelector(".site-header")).display,
      columnJustify: getComputedStyle(document.querySelector(".board-column")).justifyContent,
      subhead: getComputedStyle(document.querySelector(".game-intro .supporting-text")).display,
      h1: h1.textContent,
      h1Weight: h1Style.fontWeight,
      h1Spacing: h1Style.letterSpacing,
      h1White: h1Style.whiteSpace,
      h1Padding: h1Style.padding,
      h1Size: parseFloat(h1Style.fontSize),
    };
  });
  assert(desktop.header === "none", "desktop uses the app header");
  assert(desktop.columnJustify === "flex-start", "desktop leaves the board at the top of its column");
  assert(desktop.subhead !== "none", "desktop shows the subhead");
  assert(desktop.h1 === homeCopy.h1, "desktop heading");
  assert(desktop.h1Weight === "750", "desktop heading weight stays 750");
  assert(parseFloat(desktop.h1Spacing) < 0, "desktop heading keeps its tracking");
  assert(desktop.h1White === "nowrap", "desktop heading stays on one line");
  assert(desktop.h1Padding === "0px", "desktop heading padding is unchanged");
  assert(desktop.h1Size > 18, `desktop heading stays at ${desktop.h1Size}px`);
  assert(desktop.eraseLeft >= desktop.boardRight - 2, "desktop keypad sits beside the board");
  assert(desktop.eraseBottom <= desktop.vh + 1, "desktop keypad is inside the viewport");
  assert(desktop.auxBottom <= desktop.vh + 1, "desktop controls are inside the viewport");
  assert(desktop.scrollWidth <= desktop.clientWidth + 1, "desktop has no horizontal scroll");
  for (const [width, height] of [
    [1280, 800],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width, height });
    const edges = await page.evaluate(() => {
      const box = (selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, width: rect.width, height: rect.height };
      };
      return {
        mark: box(".game-brand-mark"),
        icons: box(".icon-row"),
        status: box(".status-bar"),
        board: box(".sudoku-grid"),
        controls: box(".controls"),
        brandTop: document.querySelector(".game-brand").getBoundingClientRect().top,
        name: document.querySelector(".game-brand-name").textContent,
        subhead: getComputedStyle(document.querySelector(".game-intro .supporting-text")).display,
      };
    });
    assert(edges.mark.width >= 22 && edges.mark.height >= 22, `${width} logo is ${edges.mark.width}px`);
    assert(edges.name === "SudokuSudoku", `${width} wordmark`);
    assert(edges.subhead !== "none", `${width} keeps the subhead`);
    assert(edges.brandTop >= 16, `${width} header starts ${edges.brandTop}px down`);
    assert(Math.abs(edges.icons.left - edges.board.left) <= 2, `${width} icon row left ${edges.icons.left} vs board ${edges.board.left}`);
    assert(Math.abs(edges.icons.right - edges.controls.right) <= 2, `${width} icon row right ${edges.icons.right} vs panel ${edges.controls.right}`);
    assert(Math.abs(edges.status.left - edges.board.left) <= 2, `${width} status left ${edges.status.left} vs board ${edges.board.left}`);
    assert(Math.abs(edges.status.right - edges.controls.right) <= 2, `${width} status right ${edges.status.right} vs panel ${edges.controls.right}`);
  }
  await context.close();
});

await check("side-by-side keypad uses the pre-redesign 3x3 key size", async () => {
  const { context, page } = await openPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  async function measure() {
    return page.evaluate(() => {
      const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const expected = (220 - 2 * 0.4 * root) / 3;
      const rect = (el) => {
        const box = el.getBoundingClientRect();
        return { width: box.width, height: box.height, top: box.top, bottom: box.bottom, left: box.left, right: box.right };
      };
      const digits = [...document.querySelectorAll("#number-pad button")].map(rect);
      const erase = rect(document.querySelector("#erase-btn"));
      const board = rect(document.querySelector(".sudoku-grid"));
      const controls = rect(document.querySelector(".controls"));
      const mode = rect(document.querySelector(".mode-toggle"));
      const aux = rect(document.querySelector(".aux-row"));
      return {
        expected,
        digits,
        erase,
        board,
        controls,
        mode,
        auxBottom: aux.bottom,
        padDisplay: getComputedStyle(document.querySelector("#number-pad")).display,
        vh: window.innerHeight,
        vw: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
  }
  for (const [width, height] of [
    [1280, 800],
    [1440, 900],
    [1024, 768],
    [721, 768],
  ]) {
    await page.setViewportSize({ width, height });
    const metrics = await measure();
    assert(metrics.padDisplay === "grid", `${width} number pad is a grid`);
    assert(metrics.digits.length === 9, `${width} has 9 digit keys`);
    const widths = metrics.digits.map((key) => key.width);
    const heights = metrics.digits.map((key) => key.height);
    assert(
      Math.abs(widths[0] - metrics.expected) <= 1.5 && Math.abs(heights[0] - metrics.expected) <= 1.5,
      `${width} digit key is ${widths[0].toFixed(1)}×${heights[0].toFixed(1)}, expected ${metrics.expected.toFixed(1)}`
    );
    assert(Math.abs(widths[0] - heights[0]) <= 1.5, `${width} digit keys are square`);
    assert(Math.max(...widths) - Math.min(...widths) <= 1.5, `${width} digit widths differ`);
    assert(metrics.digits[1].top === metrics.digits[0].top || Math.abs(metrics.digits[1].top - metrics.digits[0].top) <= 1, `${width} first row`);
    assert(metrics.digits[3].top >= metrics.digits[0].bottom - 2, `${width} second row is below the first`);
    assert(metrics.digits[6].top >= metrics.digits[3].bottom - 2, `${width} third row is below the second`);
    assert(metrics.erase.top >= metrics.digits[8].bottom - 2, `${width} erase sits under the 3x3`);
    assert(metrics.erase.width >= metrics.expected * 2, `${width} erase is a wide button`);
    assert(metrics.mode.bottom <= metrics.digits[0].top + 1, `${width} mode toggle is above the digits`);
    assert(metrics.digits[0].left >= metrics.board.right - 2, `${width} keypad sits beside the board`);
    assert(metrics.board.top >= 0, `${width} board starts on screen`);
    assert(metrics.board.bottom <= metrics.vh - 4, `${width} board bottom ${metrics.board.bottom.toFixed(1)} is inside ${metrics.vh}`);
    assert(metrics.controls.bottom <= metrics.vh - 4, `${width} keypad column bottom ${metrics.controls.bottom.toFixed(1)} is inside ${metrics.vh}`);
    assert(metrics.controls.top >= 0, `${width} keypad column starts on screen`);
    assert(metrics.scrollWidth <= metrics.clientWidth + 1, `${width} has no horizontal scroll`);
    assert(metrics.controls.height >= metrics.board.height * 0.6, `${width} keypad column is a large block next to the board`);
  }
  await page.setViewportSize({ width: 720, height: 1280 });
  const phone = await measure();
  assert(phone.padDisplay === "contents", "720px keeps the phone pad");
  assert(phone.erase.top >= phone.board.bottom - 2, "720px keeps the keypad under the board");
  assert(Math.min(...phone.digits.map((key) => key.height), phone.erase.height) >= 44, "720px keys stay at least 44px");
  assert(phone.auxBottom <= phone.vh + 1, "720px controls fit");
  assert(phone.vh - phone.auxBottom <= 16, `720px leaves ${phone.vh - phone.auxBottom}px under the controls`);
  assert(phone.scrollWidth <= phone.clientWidth + 1, "720px has no horizontal scroll");
  await leaveBoard(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  const board = await boardOf(page);
  const index = board.findIndex((value) => value === 0);
  const cell = page.locator(".cell").nth(index);
  await cell.hover();
  assertEqual(await markDigits(page, index, "preview"), [], "hover beside the keypad shows no preview");
  assertEqual(await markDigits(page, index, "auto"), [], "hover beside the keypad shows no auto marks");
  await context.close();
});

await check("the mode toggle segments are equal and the shortcut badge does not crowd", async () => {
  async function measure(page) {
    return page.evaluate(() => {
      return [...document.querySelectorAll(".mode-toggle button")].map((el) => {
        const box = el.getBoundingClientRect();
        const label = el.querySelector(".mode-label").getBoundingClientRect();
        const kbd = el.querySelector("kbd");
        const kbdBox = kbd && getComputedStyle(kbd).display !== "none" ? kbd.getBoundingClientRect() : null;
        return {
          width: box.width,
          left: box.left,
          right: box.right,
          labelLeft: label.left,
          labelRight: label.right,
          kbdLeft: kbdBox ? kbdBox.left : null,
          kbdRight: kbdBox ? kbdBox.right : null,
          overflow: el.scrollWidth - el.clientWidth,
          kbdDisplay: kbd ? getComputedStyle(kbd).display : "none",
        };
      });
    });
  }

  const phone = await openPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
  });
  for (const [width, height] of [
    [360, 740],
    [390, 844],
    [430, 932],
  ]) {
    await phone.page.setViewportSize({ width, height });
    const buttons = await measure(phone.page);
    assert(buttons.length === 2, `${width} has two mode segments`);
    assert(Math.abs(buttons[0].width - buttons[1].width) <= 1.5, `${width} segments are ${buttons[0].width.toFixed(1)} and ${buttons[1].width.toFixed(1)}`);
    assert(buttons.every((button) => button.kbdDisplay === "none"), `${width} hides the shortcut badge`);
    assert(buttons.every((button) => button.overflow <= 1), `${width} label is clipped`);
    for (const button of buttons) {
      assert(button.labelLeft - button.left >= 8, `${width} label starts ${ (button.labelLeft - button.left).toFixed(1) }px in`);
      assert(button.right - button.labelRight >= 8, `${width} label ends ${(button.right - button.labelRight).toFixed(1)}px in`);
    }
  }
  await phone.context.close();

  const desktop = await openPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const buttons = await measure(desktop.page);
  assert(Math.abs(buttons[0].width - buttons[1].width) <= 1.5, `desktop segments are ${buttons[0].width.toFixed(1)} and ${buttons[1].width.toFixed(1)}`);
  assert(buttons.every((button) => button.overflow <= 1), "desktop label is clipped");
  const candidate = buttons[1];
  if (candidate.kbdDisplay !== "none") {
    assert(candidate.kbdLeft - candidate.labelRight >= 4, `desktop badge gap is ${(candidate.kbdLeft - candidate.labelRight).toFixed(1)}px`);
    assert(candidate.right - candidate.kbdRight >= 6, `desktop badge inset is ${(candidate.right - candidate.kbdRight).toFixed(1)}px`);
  } else {
    assert(candidate.right - candidate.labelRight >= 8, "desktop label stays inset when the badge is hidden");
  }
  await desktop.context.close();
});

server.close();
await browser.close();

if (failures.length) {
  console.error(`\n${failures.length} failed`);
  process.exit(1);
}
console.log("\nall candidate tests passed");
