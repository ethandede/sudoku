// Apply and Apply all for elimination techniques, including the Hard puzzle
// Ethan played: hard.rsqhqyhm, Auto candidates off, then on.
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const built = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);

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

async function live(page, pattern) {
  await page.waitForFunction(
    (source) => new RegExp(source).test(document.getElementById("live-region").textContent || ""),
    pattern
  );
  return page.locator("#live-region").innerText();
}

async function reachPointing(page, { auto = false } = {}) {
  await page.goto(`${origin}/?p=hard.rsqhqyhm`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#sudoku-grid button.given");
  if (auto) await page.locator("#auto-candidates").check();
  await page.locator("#hint-btn").click();
  await page.locator("#hint-fill").click();
  await page.waitForFunction(() => document.getElementById("live-region").textContent.includes("Naked single"));
  await page.locator("#hint-btn").click();
  await page.locator("#hint-fill").click();
  await page.waitForFunction(() => document.getElementById("live-region").textContent.includes("Hidden single"));
  await page.locator("#hint-btn").click();
  await page.waitForSelector("#hint-kicker");
  assert.equal(await page.locator("#hint-kicker").innerText(), "Pointing");
  assert.equal(await page.locator("#hint-fill").innerText(), "Apply all pointing");
}

const browser = await chromium.launch();
try {
  const phone = { width: 390, height: 844 };

  const stage1 = await browser.newContext({ viewport: phone });
  const page = await stage1.newPage();
  await reachPointing(page);
  assert.equal(await page.locator("#hint-next").innerText(), "Show why");
  assert.equal(await page.locator(".eliminated").count(), 0);
  await page.locator("#hint-fill").click();
  assert.match(await live(page, "Pointing: ruled out 8 from 2 cells"), /Pointing: ruled out 8 from 2 cells/);
  assert.equal(await page.locator("#hint-sheet").getAttribute("hidden"), "");
  assert.ok((await page.locator(".eliminated").count()) >= 2);
  assert.match(await page.locator("#action-chip").innerText(), /Pointing: ruled out 8 from 2 cells/);
  assert.ok((await page.locator(".action-mark").count()) >= 2);
  const kept = await page.evaluate(() =>
    [...document.querySelectorAll(".eliminated")].map((mark) => mark.dataset.digit).join("")
  );
  assert.equal(kept, "88");
  await page.locator("#sudoku-grid button.cell").first().click();
  assert.equal(await page.locator("#action-chip").getAttribute("hidden"), "");
  assert.ok((await page.locator(".eliminated").count()) >= 2, "strikes stay after the highlight clears");
  await stage1.close();

  const shown = await browser.newContext({ viewport: phone });
  const why = await shown.newPage();
  await reachPointing(why);
  await why.locator("#hint-next").click();
  assert.equal(await why.locator("#hint-next").innerText(), "Apply");
  assert.ok((await why.locator(".struck").count()) >= 2);
  await why.locator("#hint-fill").click();
  assert.match(await live(why, "Pointing: ruled out"), /Pointing: ruled out 8 from 2 cells/);
  assert.ok((await why.locator(".eliminated").count()) >= 2);
  await shown.close();

  const closed = await browser.newContext({ viewport: phone });
  const shut = await closed.newPage();
  await reachPointing(shut);
  await shut.locator("#hint-next").click();
  await shut.locator("#hint-next").click();
  await live(shut, "Ruled out");
  await shut.locator("#hint-dismiss").click();
  assert.equal(await shut.locator("#hint-sheet").getAttribute("hidden"), "");
  assert.ok((await shut.locator(".eliminated").count()) >= 2, "single Apply stays on the board after the sheet closes");
  await closed.close();

  const applied = await browser.newContext({ viewport: phone });
  const once = await applied.newPage();
  await reachPointing(once);
  await once.locator("#hint-next").click();
  await once.locator("#hint-next").click();
  assert.match(await live(once, "Ruled out"), /Ruled out/);
  assert.ok((await once.locator(".struck").count()) >= 2);
  assert.equal(await once.locator("#hint-fill").innerText(), "Apply all pointing");
  await once.locator("#hint-fill").click();
  assert.equal(await live(once, "No more pointing"), "No more pointing steps. Next up: Naked pair.");
  assert.equal(await once.locator("#hint-sheet").getAttribute("hidden"), "");
  assert.ok((await once.locator(".eliminated").count()) >= 2, "single Apply stays visible after Apply all finds nothing new");
  await applied.close();

  const autoOn = await browser.newContext({ viewport: phone });
  const auto = await autoOn.newPage();
  await reachPointing(auto, { auto: true });
  assert.equal(await auto.locator("#auto-candidates").isChecked(), true);
  await auto.locator("#hint-fill").click();
  assert.match(await live(auto, "Pointing: ruled out"), /Pointing: ruled out/);
  assert.equal(await auto.locator(".eliminated").count(), 0);
  assert.ok((await auto.locator(".marks .auto").count()) > 0);
  const stillEight = await auto.evaluate(() => {
    const raw = localStorage.getItem("sudoku-progress");
    const removed = raw ? JSON.parse(raw).removed : [];
    return removed.some((item) => {
      const cell = document.querySelector(`#sudoku-grid button[data-index="${item.index}"]`);
      const mark = cell && cell.querySelector(`.marks span[data-digit="${item.digit}"]`);
      return mark && mark.classList.contains("auto");
    });
  });
  assert.equal(stillEight, false, "auto candidates drop the ruled-out digit");
  await autoOn.close();

  const dark = await browser.newContext({ viewport: phone, colorScheme: "dark" });
  const night = await dark.newPage();
  await night.addInitScript(() => {
    localStorage.setItem("sudoku-settings", JSON.stringify({ theme: "dark" }));
  });
  await reachPointing(night);
  await night.locator("#hint-fill").click();
  await live(night, "Pointing: ruled out");
  const ink = await night.locator(".eliminated").first().evaluate((mark) => getComputedStyle(mark).color);
  assert.equal(ink, "rgb(255, 180, 180)");
  await dark.close();
} finally {
  await browser.close();
  site.close();
}

console.log("apply all ok");
