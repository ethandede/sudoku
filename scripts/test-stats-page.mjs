import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, normalize } from "node:path";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function shiftIso(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const today = new Date().toISOString().slice(0, 10);
const stats = {
  version: 1,
  daily: {
    played: 3,
    won: 2,
    best: 80,
    totalTime: 200,
    longestStreak: 9,
    completed: {
      [shiftIso(today, -1)]: { time: 100, mistakes: 0 },
      [today]: { time: 90, mistakes: 1 },
    },
  },
  easy: { played: 4, won: 2, best: 90, totalTime: 250 },
};

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
const shots = "/opt/cursor/artifacts";
fs.mkdirSync(shots, { recursive: true });

async function openStats(viewport, theme, reducedMotion) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion });
  await context.addInitScript(
    ({ theme, stats }) => {
      localStorage.clear();
      localStorage.setItem("sudoku-settings", JSON.stringify({ theme }));
      localStorage.setItem("sudoku-stats", JSON.stringify(stats));
    },
    { theme, stats }
  );
  const page = await context.newPage();
  await page.route("**/*", (route) => {
    const target = route.request().url();
    if (/google|gstatic|doubleclick|googlesyndication/.test(target)) return route.abort();
    return route.continue();
  });
  await page.goto(`${origin}/stats/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#your-games .your-games tbody tr");
  return { context, page };
}

async function cell(page, level, column) {
  const row = page.locator("#your-games tbody tr").filter({ has: page.locator("th", { hasText: new RegExp(`^${level}$`) }) });
  return row.locator("td").nth(column).evaluate((td) => {
    const sr = td.querySelector(".rare-sr");
    return (sr ? sr.textContent : td.innerText).trim();
  });
}

async function settle(page) {
  await page.waitForFunction(
    () => {
      const line = document.querySelector("#your-games .streak-line");
      const easy = [...document.querySelectorAll("#your-games tbody tr")].find((row) => row.querySelector("th")?.textContent === "Easy");
      const playedCell = easy && easy.querySelectorAll("td")[0];
      const bestCell = easy && easy.querySelectorAll("td")[1];
      const read = (node) => {
        if (!node) return "";
        const sr = node.querySelector(".rare-sr");
        return (sr ? sr.textContent : node.innerText).trim();
      };
      const srs = line ? [...line.querySelectorAll(".rare-sr")].map((node) => node.textContent.trim()) : [];
      const streakOk = srs.length
        ? line.textContent.includes("Daily streak") && line.textContent.includes("longest") && srs[0] === "2" && srs[1] === "9"
        : line && line.textContent.includes("Daily streak 2") && line.textContent.includes("longest 9");
      return streakOk && read(playedCell) === "4" && read(bestCell) === "1:30";
    },
    null,
    { timeout: 4000 }
  );
}

function checkLayout(box, name) {
  assert.ok(box.scrollWidth <= box.clientWidth + 1, `${name} page scrolls sideways ${box.scrollWidth}/${box.clientWidth}`);
  assert.ok(box.wrapScroll <= box.wrapClient + 1, `${name} table scrolls sideways ${box.wrapScroll}/${box.wrapClient}`);
  assert.equal(box.levels, 7, name);
}

async function layoutOf(page) {
  return page.evaluate(() => {
    const wrap = document.querySelector(".your-games-wrap");
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      wrapScroll: wrap.scrollWidth,
      wrapClient: wrap.clientWidth,
      levels: document.querySelectorAll("#your-games tbody tr").length,
    };
  });
}

const reduced = await openStats({ width: 390, height: 844 }, "light", "reduce");
const reducedPlayed = await cell(reduced.page, "Easy", 0);
assert.equal(reducedPlayed, "4", "reduced motion shows the final played count");
const reducedBest = await cell(reduced.page, "Easy", 1);
assert.equal(reducedBest, "1:30", "reduced motion shows the final best time");
await reduced.context.close();

for (const [name, viewport, theme] of [
  ["stats-phone-light", { width: 390, height: 844 }, "light"],
  ["stats-phone-dark", { width: 390, height: 844 }, "dark"],
  ["stats-desktop-light", { width: 1280, height: 800 }, "light"],
  ["stats-desktop-dark", { width: 1280, height: 800 }, "dark"],
]) {
  const { context, page } = await openStats(viewport, theme, "no-preference");
  await settle(page);
  assert.equal(await cell(page, "Daily", 0), "3");
  assert.equal(await cell(page, "Daily", 1), "1:20");
  assert.equal(await cell(page, "Daily", 2), "1:40");
  assert.equal(await cell(page, "Easy", 0), "4");
  assert.equal(await cell(page, "Easy", 1), "1:30");
  assert.equal(await cell(page, "Easy", 2), "2:05");
  assert.equal(await cell(page, "Hard", 0), "0");
  assert.equal(await cell(page, "Hard", 1), "–");
  assert.equal(await cell(page, "Hard", 2), "–");
  const line = await page.locator("#your-games .streak-line").evaluate((node) => {
    const srs = [...node.querySelectorAll(".rare-sr")].map((item) => item.textContent.trim());
    return srs.length ? `Daily streak ${srs[0]} longest ${srs[1]}` : node.innerText;
  });
  assert.match(line, /Daily streak 2/);
  assert.match(line, /longest 9/);
  await page.locator("#your-games").evaluate((el) => el.scrollIntoView({ block: "start" }));
  checkLayout(await layoutOf(page), name);
  await page.screenshot({ path: path.join(shots, `${name}.png`) });
  console.log("ok", name);
  await context.close();
}

await browser.close();
server.close();
console.log("stats page ui ok");
