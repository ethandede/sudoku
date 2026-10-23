// Every hint path that places a digit: singles, chained eliminations,
// a wrong digit first, the last cell, undo, and Enter on the place button.
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { chromium } from "playwright";
import { peerIndexes } from "../functions/hint-apply.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const built = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);

const context = { console, globalThis: null };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(
  readFileSync(join(root, "assets/js/solver.js"), "utf8") + "\n" + readFileSync(join(root, "assets/js/pools.js"), "utf8"),
  context
);
const { SudokuSolver, SudokuPools } = context;

function stepKey(step) {
  const eliminate = (step.eliminate || []).map((item) => `${item.index}:${item.digit}`).sort();
  return `${step.slug}|${(step.pattern || []).join(".")}|${eliminate.join(",")}`;
}

function walk(match) {
  for (const level of Object.keys(SudokuPools)) {
    for (const item of SudokuPools[level]) {
      const board = item.puzzle.slice();
      let removed = [];
      const seen = new Set();
      for (let guard = 0; guard < 240; guard += 1) {
        const step = SudokuSolver.explain(board, removed);
        if (!step) break;
        const key = stepKey(step);
        if (seen.has(key)) break;
        seen.add(key);
        if (match(step)) {
          return {
            puzzle: item.puzzle.slice(),
            solution: item.solution.slice(),
            board: board.slice(),
            removed: removed.map((entry) => ({ ...entry })),
            step,
          };
        }
        if (step.place && board[step.place.index] === 0 && step.place.digit === item.solution[step.place.index]) {
          board[step.place.index] = step.place.digit;
        }
        if (step.eliminate) removed = removed.concat(step.eliminate.filter((entry) => board[entry.index] === 0));
        removed = removed.filter((entry) => board[entry.index] === 0);
      }
    }
  }
  return null;
}

const naked = walk((step) => step.slug === "naked-single" && step.place);
const hidden = walk((step) => step.slug === "hidden-single" && step.place);
const pointing = walk((step) => step.slug === "pointing" && step.place && step.eliminate.length);
const claiming = walk((step) => step.slug === "claiming" && step.place && step.eliminate.length);
const nakedPair = walk((step) => step.slug === "naked-pair" && step.place && step.eliminate.length);
const xwing = walk((step) => step.slug === "x-wing" && step.place && step.eliminate.length);
if (!naked || !hidden || !pointing || !claiming || !nakedPair || !xwing) {
  throw new Error("missing a placement fixture");
}

function emptyNotes() {
  return Array.from({ length: 81 }, () => []);
}

function notePlan(board, index, digit, eliminate = []) {
  const banned = new Map();
  for (const item of eliminate) {
    if (!banned.has(item.index)) banned.set(item.index, new Set());
    banned.get(item.index).add(item.digit);
  }
  const spareFor = (cell) => {
    const gone = banned.get(cell) || new Set();
    for (let number = 1; number <= 9; number += 1) {
      if (number !== digit && !gone.has(number)) return number;
    }
    return null;
  };
  const notes = emptyNotes();
  const peer = peerIndexes(index).find((cell) => board[cell] === 0 && spareFor(cell) != null);
  const cellSpare = spareFor(index);
  if (cellSpare != null) notes[index] = [digit, cellSpare];
  const other = peer == null ? null : spareFor(peer);
  if (peer != null && other != null) notes[peer] = [digit, other];
  return { notes, peer, other };
}

function saveFor(found, { notes, auto, board }) {
  return {
    version: 1,
    updatedAt: Date.now(),
    kind: "easy",
    dailyDate: null,
    puzzle: found.puzzle,
    solution: found.solution,
    board: (board || found.board).slice(),
    notes: notes || emptyNotes(),
    removed: found.removed.map((item) => ({ ...item })),
    mistakes: 0,
    slashed: [],
    undo: [],
    selected: found.step.place ? found.step.place.index : 0,
    mode: "normal",
    elapsed: 25,
    auto: Boolean(auto),
    counted: true,
    scored: false,
    metadata: null,
    hintSlugs: [],
    train: null,
    puzzleId: "hint-place",
    anonPlayId: null,
    notesUsed: Boolean(notes && notes.some((list) => list.length)),
    over: false,
  };
}

function wrongBoard(found) {
  const place = found.step.place.index;
  const blocked = new Set(peerIndexes(place));
  blocked.add(place);
  for (let index = 0; index < 81; index += 1) {
    if (!found.board[index] || found.puzzle[index] !== 0 || blocked.has(index)) continue;
    const wrong = found.solution[index] === 1 ? 2 : 1;
    const board = found.board.slice();
    board[index] = wrong;
    const cleared = board.slice();
    cleared[index] = 0;
    const follow = SudokuSolver.explain(cleared, []);
    if (follow && (follow.slug === "naked-single" || follow.slug === "hidden-single") && follow.place) {
      return { board, index, wrong, follow };
    }
  }
  return null;
}

function lastCell() {
  const item = SudokuPools["not easy"][0];
  const index = item.puzzle.findIndex((value) => value === 0);
  const board = item.solution.slice();
  board[index] = 0;
  const step = SudokuSolver.explain(board, []);
  if (!step || !step.place || step.place.index !== index || step.place.digit !== item.solution[index]) {
    throw new Error("last empty cell is not the hinted placement");
  }
  return {
    puzzle: item.puzzle.slice(),
    solution: item.solution.slice(),
    board,
    removed: [],
    step,
  };
}

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
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const failures = [];
const phone = { width: 390, height: 844 };
const desktop = { width: 1280, height: 800 };

function assert(condition, message) {
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

async function openGame(viewport, save, options = {}) {
  const context = await browser.newContext({
    viewport,
    colorScheme: options.colorScheme,
    reducedMotion: options.reducedMotion,
  });
  await context.addInitScript((payload) => {
    localStorage.setItem("sudoku-progress", JSON.stringify(payload.save));
    localStorage.setItem("sudoku-progress-at", String(payload.save.updatedAt));
    if (payload.settings) localStorage.setItem("sudoku-settings", JSON.stringify(payload.settings));
  }, { save, settings: options.settings || null });
  const page = await context.newPage();
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (/google|gstatic|doubleclick|googlesyndication/.test(url)) return route.abort();
    return route.continue();
  });
  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#resume-yes", { timeout: 15000 });
  await page.click("#resume-yes");
  await page.waitForFunction(() => {
    const cover = document.querySelector("#board-cover");
    return document.querySelectorAll(".cell").length === 81 && cover && cover.hidden;
  });
  return { context, page };
}

async function marks(page, index, kind) {
  return page
    .locator(".cell")
    .nth(index)
    .locator(`.marks span.on.${kind}`)
    .evaluateAll((nodes) => nodes.map((node) => node.textContent));
}

async function valueAt(page, index) {
  return Number(await page.locator(".cell").nth(index).getAttribute("data-value"));
}

async function placeSingle(page) {
  await page.click("#hint-btn");
  await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Show why");
  await page.click("#hint-next");
  await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Place it");
  await page.click("#hint-next");
  await page.waitForFunction(() => /Placed/.test(document.getElementById("hint-text").textContent));
}

async function placeChain(page, afterApply) {
  await page.click("#hint-btn");
  await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Show why");
  await page.click("#hint-next");
  await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Apply");
  const why = await page.locator("#hint-text").innerText();
  assert(/Rules out \d+ in row \d+, column \d+/.test(why), "stage 2 names the ruled-out digit");
  assert(!why.includes("—"), "stage 2 has no em dash");
  await page.click("#hint-next");
  await page.waitForFunction(() => {
    const next = document.getElementById("hint-next");
    return next && !next.hidden && next.textContent === "Place it";
  });
  if (afterApply) await afterApply(page);
  await page.click("#hint-next");
  await page.waitForFunction(() => /Placed/.test(document.getElementById("hint-text").textContent));
}

function openElimination(found) {
  const empty = (found.step.eliminate || []).filter((item) => found.board[item.index] === 0);
  return empty.find((item) => item.index !== found.step.place.index) || empty[0] || null;
}

function fadeMark(page, index, digit) {
  return page.locator(".cell").nth(index).locator(`.marks span[data-digit="${digit}"]`);
}

async function expectPlaced(page, found, { notes, auto, chain }) {
  const index = found.step.place.index;
  const digit = String(found.step.place.digit);
  assert((await valueAt(page, index)) === found.step.place.digit, "placed digit");
  assert(/Placed/.test(await page.locator("#hint-text").innerText()), "placement sentence");
  const plan = notes ? notePlan(found.board, index, found.step.place.digit, found.step.eliminate) : null;
  if (plan && plan.peer != null) {
    const left = await marks(page, plan.peer, "user-note");
    assert(!left.includes(digit), "peer note lost the placed digit");
    assert(left.includes(String(plan.other)), "peer kept its other note");
  }
  if (plan) assert((await marks(page, index, "user-note")).length === 0, "placed cell notes cleared");
  if (auto) {
    const peer = peerIndexes(index).find((cell) => found.board[cell] === 0);
    if (peer != null) assert(!(await marks(page, peer, "auto")).includes(digit), "auto-candidates drop the placed digit");
  } else {
    assert((await page.locator(".marks span.on.auto").count()) === 0, "auto-candidates stay off");
  }
  if (chain) {
    const eliminated = (found.step.eliminate || []).find((item) => found.board[item.index] === 0 && item.index !== index);
    if (eliminated) {
      const stuck = await page
        .locator(".cell")
        .nth(eliminated.index)
        .locator(`.marks span.on.struck:not(.fading)[data-digit="${eliminated.digit}"]`)
        .count();
      assert(stuck === 0, "elimination does not stay struck after it fades");
      if (auto) assert(!(await marks(page, eliminated.index, "auto")).includes(String(eliminated.digit)), "eliminated digit left auto-candidates");
    }
    assert((await page.locator(".cell").nth(index).locator(".marks span.struck").count()) === 0, "filled cell has no strike");
  }
}

const viewports = [
  ["phone", phone],
  ["desktop", desktop],
];

for (const [name, found, chain] of [
  ["naked single", naked, false],
  ["hidden single", hidden, false],
  ["pointing chain", pointing, true],
  ["claiming chain", claiming, true],
  ["naked pair chain", nakedPair, true],
  ["x-wing chain", xwing, true],
]) {
  for (const [viewportName, viewport] of viewports) {
    for (const auto of [false, true]) {
      for (const withNotes of [false, true]) {
        const label = `${name} ${viewportName} auto ${auto ? "on" : "off"} notes ${withNotes ? "on" : "off"}`;
        await check(label, async () => {
          const plan = withNotes
            ? notePlan(found.board, found.step.place.index, found.step.place.digit, found.step.eliminate)
            : null;
          const { context, page } = await openGame(viewport, saveFor(found, { auto, notes: plan && plan.notes }));
          try {
            assert((await page.locator("#auto-candidates").isChecked()) === auto, "auto toggle matches");
            const eliminated = chain ? openElimination(found) : null;
            const watchFade = chain && name === "x-wing chain" && viewportName === "phone" && !auto && !withNotes;
            const notedDigit =
              Boolean(withNotes && plan && eliminated && (plan.notes[eliminated.index] || []).includes(eliminated.digit));
            if (chain) {
              await placeChain(page, async () => {
                if (!eliminated) return;
                const mark = fadeMark(page, eliminated.index, eliminated.digit);
                const className = (await mark.getAttribute("class")) || "";
                if (notedDigit) {
                  assert(!className.includes("struck"), "a noted digit is removed with no strike");
                  return;
                }
                assert(className.includes("struck") && className.includes("fading"), "eliminated digit fades when it was not in notes");
                if (!watchFade) return;
                await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/elimination-apply-phone-light.png" });
                const style = await mark.evaluate((el) => {
                  const computed = getComputedStyle(el);
                  return {
                    color: computed.color,
                    weight: computed.fontWeight,
                    thickness: computed.textDecorationThickness,
                  };
                });
                assert(style.color === "rgb(176, 0, 22)", "strike uses the danger color");
                assert(style.weight === "700", "strike weight");
                assert(style.thickness === "2px", "strike thickness");
                const cellStyle = await page.locator(".cell").nth(eliminated.index).evaluate((el) => {
                  const computed = getComputedStyle(el);
                  return `${el.className} | ${computed.boxShadow} | ${computed.backgroundColor}`;
                });
                assert(cellStyle.includes("176, 0, 22") && cellStyle.includes("2px"), `eliminate ring uses danger (${cellStyle})`);
                await page.waitForTimeout(720);
                const after = (await mark.getAttribute("class")) || "";
                assert(!after.includes("struck"), "the strike is gone after the fade");
              });
            } else await placeSingle(page);
            await expectPlaced(page, found, { notes: withNotes, auto, chain });
            if (watchFade && eliminated) {
              const afterPlace = (await fadeMark(page, eliminated.index, eliminated.digit).getAttribute("class")) || "";
              assert(!afterPlace.includes("struck"), "placing does not restart a finished fade");
            }
            if (name === "pointing chain" && viewportName === "phone" && !auto && !withNotes) {
              await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/chained-place-phone.png" });
            }
            if (name === "pointing chain" && viewportName === "desktop" && auto && withNotes) {
              await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/chained-place-desktop.png" });
            }
          } finally {
            await context.close();
          }
        });
      }
    }
  }
}

function nakedWithWrong() {
  for (const level of Object.keys(SudokuPools)) {
    for (const item of SudokuPools[level]) {
      const board = item.puzzle.slice();
      let removed = [];
      const seen = new Set();
      for (let guard = 0; guard < 80; guard += 1) {
        const step = SudokuSolver.explain(board, removed);
        if (!step) break;
        const key = stepKey(step);
        if (seen.has(key)) break;
        seen.add(key);
        if (step.slug === "naked-single" && step.place) {
          const found = {
            puzzle: item.puzzle.slice(),
            solution: item.solution.slice(),
            board: board.slice(),
            removed: removed.map((entry) => ({ ...entry })),
            step,
          };
          const flagged = wrongBoard(found);
          if (flagged) return { found, flagged };
        }
        if (step.place && board[step.place.index] === 0 && step.place.digit === item.solution[step.place.index]) {
          board[step.place.index] = step.place.digit;
        }
        if (step.eliminate) removed = removed.concat(step.eliminate.filter((entry) => board[entry.index] === 0));
        removed = removed.filter((entry) => board[entry.index] === 0);
      }
    }
  }
  return null;
}

await check("wrong digit then placement", async () => {
  const ready = nakedWithWrong();
  assert(ready, "a wrong digit still leaves a single");
  const { found, flagged } = ready;
  const { context, page } = await openGame(phone, saveFor(found, { board: flagged.board, auto: false }));
  try {
    await page.click("#hint-btn");
    await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Show it");
    await page.click("#hint-next");
    await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Clear it");
    assert(
      await page.locator(".cell").nth(flagged.index).evaluate((cell) => cell.classList.contains("hint-place")),
      "the wrong cell is flagged"
    );
    await page.click("#hint-next");
    await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Next hint");
    assert((await valueAt(page, flagged.index)) === 0, "wrong digit cleared");
    await page.click("#hint-next");
    await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Show why");
    await page.click("#hint-next");
    await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Place it");
    const before = await page.$$eval(".cell", (cells) => cells.map((cell) => Number(cell.dataset.value)));
    await page.click("#hint-next");
    await page.waitForFunction(() => /Placed/.test(document.getElementById("hint-text").textContent));
    const after = await page.$$eval(".cell", (cells) => cells.map((cell) => Number(cell.dataset.value)));
    const changed = after.map((value, index) => (value !== before[index] ? index : -1)).filter((index) => index >= 0);
    assert(changed.length === 1, "one cell filled");
    assert(after[changed[0]] === found.solution[changed[0]], "the placed digit matches the solution");
  } finally {
    await context.close();
  }
});

await check("last cell hint solves and records the hint", async () => {
  const found = lastCell();
  const { context, page } = await openGame(phone, saveFor(found, { auto: true }));
  try {
    await page.click("#hint-btn");
    await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Show why");
    await page.click("#hint-next");
    await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Place it");
    await page.click("#hint-next");
    await page.waitForSelector("#solved-modal:not([hidden])");
    assert((await page.locator("#solved-title").innerText()) === "Solved", "completion title");
    assert((await valueAt(page, found.step.place.index)) === found.step.place.digit, "last cell filled");
    const stored = await page.evaluate(() => ({
      stats: JSON.parse(localStorage.getItem("sudoku-stats")),
      skills: JSON.parse(localStorage.getItem("sudoku-skills")),
      progress: localStorage.getItem("sudoku-progress"),
    }));
    assert(stored.stats.easy.won === 1, "win recorded");
    assert(stored.skills.history[0].hinted.includes(found.step.slug), "hint slug recorded");
    assert(stored.progress == null, "finished game is cleared");
  } finally {
    await context.close();
  }
});

await check("undo of a placement restores one step and the next hint places again", async () => {
  const plan = notePlan(naked.board, naked.step.place.index, naked.step.place.digit);
  const { context, page } = await openGame(desktop, saveFor(naked, { notes: plan.notes, auto: true }));
  try {
    await placeSingle(page);
    assert((await valueAt(page, naked.step.place.index)) === naked.step.place.digit, "digit placed");
    await page.evaluate(() => document.getElementById("undo-btn").click());
    await page.waitForFunction((index) => document.querySelectorAll(".cell")[index].dataset.value === "0", naked.step.place.index);
    if (plan.peer != null) {
      const restored = await marks(page, plan.peer, "user-note");
      assert(restored.includes(String(naked.step.place.digit)), "undo restores the peer note");
    }
    await placeSingle(page);
    assert((await valueAt(page, naked.step.place.index)) === naked.step.place.digit, "next hint places again");
    const undoCount = await page.evaluate(() => JSON.parse(localStorage.getItem("sudoku-progress")).undo.length);
    assert(undoCount === 1, "the second placement is one undo step");
  } finally {
    await context.close();
  }
});

await check("undo of a chained placement leaves the elimination in place", async () => {
  const index = pointing.step.place.index;
  const digit = pointing.step.place.digit;
  const plan = notePlan(pointing.board, index, digit, pointing.step.eliminate);
  const { context, page } = await openGame(phone, saveFor(pointing, { notes: plan.notes, auto: true }));
  try {
    await placeChain(page);
    await page.evaluate(() => document.getElementById("undo-btn").click());
    await page.waitForFunction((cell) => document.querySelectorAll(".cell")[cell].dataset.value === "0", index);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("sudoku-progress")));
    assert(saved.undo.length === 1, "only the placement was undone");
    for (const item of pointing.step.eliminate) {
      if (saved.board[item.index] !== 0) continue;
      assert(
        saved.removed.some((kept) => kept.index === item.index && kept.digit === item.digit),
        "the elimination remains recorded"
      );
    }
    if (plan.peer != null) {
      assert((await marks(page, plan.peer, "user-note")).includes(String(digit)), "peer note restored");
    }
    await page.click("#hint-btn");
    await page.waitForFunction(() => document.getElementById("hint-kicker").textContent === "Naked single" || document.getElementById("hint-kicker").textContent === "Hidden single");
    await page.click("#hint-next");
    await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Place it");
    await page.click("#hint-next");
    await page.waitForFunction(() => /Placed/.test(document.getElementById("hint-text").textContent));
    assert((await valueAt(page, index)) === digit, "the following hint places the same digit");
  } finally {
    await context.close();
  }
});

await check("Enter on the place button places and returns focus to the cell", async () => {
  const { context, page } = await openGame(desktop, saveFor(naked, { auto: false }));
  try {
    await page.click("#hint-btn");
    await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Show why");
    await page.click("#hint-next");
    await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Place it");
    assert((await page.evaluate(() => document.activeElement.id)) === "hint-next", "place button is focused");
    assert((await page.getAttribute("#hint-next", "aria-keyshortcuts")) === "Enter", "Enter is the place shortcut");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => /Placed/.test(document.getElementById("hint-text").textContent));
    const focused = await page.evaluate(() => Number(document.activeElement.dataset.index));
    assert(focused === naked.step.place.index, "focus returns to the placed cell");
    assert((await valueAt(page, naked.step.place.index)) === naked.step.place.digit, "Enter placed the digit");
  } finally {
    await context.close();
  }
});

await check("a noted elimination is removed without a strike", async () => {
  const eliminated = openElimination(xwing);
  const banned = new Set(
    xwing.step.eliminate.filter((item) => item.index === eliminated.index).map((item) => item.digit)
  );
  const spare = [1, 2, 3, 4, 5, 6, 7, 8, 9].find((digit) => !banned.has(digit));
  const notes = emptyNotes();
  notes[eliminated.index] = [eliminated.digit, spare];
  const row = Math.floor(eliminated.index / 9) + 1;
  const col = (eliminated.index % 9) + 1;
  const { context, page } = await openGame(phone, saveFor(xwing, { auto: false, notes }));
  try {
    await page.click("#hint-btn");
    await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Show why");
    await page.click("#hint-next");
    await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Apply");
    const why = await page.locator("#hint-text").innerText();
    assert(why.includes(`${eliminated.digit} in row ${row}, column ${col}`), "stage 2 names this cell");
    const before = (await fadeMark(page, eliminated.index, eliminated.digit).getAttribute("class")) || "";
    assert(before.includes("struck") && !before.includes("fading"), "stage 2 strikes the digit in its slot");
    await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/elimination-stage2-phone-light.png" });
    await page.click("#hint-next");
    await page.waitForFunction(() => {
      const next = document.getElementById("hint-next");
      return next && !next.hidden && next.textContent === "Place it";
    });
    const after = (await fadeMark(page, eliminated.index, eliminated.digit).getAttribute("class")) || "";
    assert(!after.includes("struck"), "a noted digit is removed with no strike");
    const left = await marks(page, eliminated.index, "user-note");
    assert(!left.includes(String(eliminated.digit)), "the noted digit is gone");
    assert(left.includes(String(spare)), "the other note stays");
    assert(/Removed /.test(await page.locator("#hint-text").innerText()), "the result stays in the past tense");
    await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/elimination-apply-noted-phone-light.png" });
  } finally {
    await context.close();
  }
});

await check("dark stage 2 uses the danger color", async () => {
  const eliminated = openElimination(xwing);
  const { context, page } = await openGame(phone, saveFor(xwing, { auto: true }), {
    colorScheme: "dark",
    settings: { theme: "dark", version: 1 },
  });
  try {
    await page.click("#hint-btn");
    await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Show why");
    await page.click("#hint-next");
    await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Apply");
    const mark = fadeMark(page, eliminated.index, eliminated.digit);
    const style = await mark.evaluate((el) => {
      const computed = getComputedStyle(el);
      return { color: computed.color, weight: computed.fontWeight, thickness: computed.textDecorationThickness };
    });
    assert(style.color === "rgb(255, 180, 180)", "dark strike uses the danger color");
    assert(style.weight === "700", "dark strike weight");
    assert(style.thickness === "2px", "dark strike thickness");
    const ring = await page.locator(".cell").nth(eliminated.index).evaluate((el) => {
      const computed = getComputedStyle(el);
      return `${el.className} | ${computed.boxShadow} | ${computed.backgroundColor}`;
    });
    assert(ring.includes("255, 180, 180") && ring.includes("2px"), `dark eliminate ring uses danger (${ring})`);
    await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/elimination-stage2-phone-dark.png" });
    await page.click("#hint-next");
    await page.waitForFunction(() => {
      const next = document.getElementById("hint-next");
      return next && !next.hidden && next.textContent === "Place it";
    });
    const fading = (await mark.getAttribute("class")) || "";
    assert(fading.includes("struck") && fading.includes("fading"), "dark apply fades a digit that was not noted");
    await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/elimination-apply-phone-dark.png" });
  } finally {
    await context.close();
  }
});

await check("reduced motion drops an unnoted digit immediately", async () => {
  const eliminated = openElimination(xwing);
  const { context, page } = await openGame(phone, saveFor(xwing, { auto: false }), { reducedMotion: "reduce" });
  try {
    await page.click("#hint-btn");
    await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Show why");
    await page.click("#hint-next");
    await page.waitForFunction(() => document.getElementById("hint-next").textContent === "Apply");
    await page.click("#hint-next");
    await page.waitForFunction(() => {
      const next = document.getElementById("hint-next");
      return next && !next.hidden && next.textContent === "Place it";
    });
    const after = (await fadeMark(page, eliminated.index, eliminated.digit).getAttribute("class")) || "";
    assert(!after.includes("struck") && !after.includes("fading"), "reduced motion removes the digit with no fade");
  } finally {
    await context.close();
  }
});

await browser.close();
server.close();
if (failures.length) {
  console.error(`\n${failures.length} failed`);
  process.exit(1);
}
console.log("hint place ok");
