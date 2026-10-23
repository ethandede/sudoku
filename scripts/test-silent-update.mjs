import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { gameGate, shouldApplyUpdate } from "../functions/silent-update.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const playing = { counted: true, won: false, over: false };
const solved = { counted: true, won: true, over: false };
const failed = { counted: true, won: false, over: true };
const idle = { hidden: true, gate: "idle", pending: true, refreshing: false, reloadedAt: 0, now: 100000 };

assert.equal(gameGate(playing, true), "play");
assert.equal(gameGate(solved, true), "idle");
assert.equal(gameGate(failed, true), "idle");
assert.equal(gameGate({ counted: false, won: false, over: false }, true), "idle");
assert.equal(gameGate(playing, false), "idle");
assert.equal(gameGate(null, true), "idle");

assert.equal(shouldApplyUpdate(idle), false);
assert.equal(shouldApplyUpdate({ ...idle, hidden: false }), false);
assert.equal(shouldApplyUpdate({ ...idle, gate: "play" }), false);
assert.equal(shouldApplyUpdate({ ...idle, gate: "pending" }), false);
assert.equal(shouldApplyUpdate({ ...idle, pending: false }), false);
assert.equal(shouldApplyUpdate({ ...idle, refreshing: true }), false);
assert.equal(shouldApplyUpdate({ ...idle, reloadedAt: 90000, now: 100000 }), false);
assert.equal(shouldApplyUpdate({ ...idle, reloadedAt: 80000, now: 100000 }), false);

const sw = readFileSync(join(root, "assets/js/sw.js"), "utf8");
const page = readFileSync(join(root, "assets/js/sudoku.js"), "utf8");
const build = readFileSync(join(root, "scripts/build.mjs"), "utf8");
const header = readFileSync(join(root, "assets/scss/layout/_header.scss"), "utf8");
const install = sw.slice(sw.indexOf('addEventListener("install"'), sw.indexOf('addEventListener("activate"'));
const activate = sw.slice(sw.indexOf('addEventListener("activate"'), sw.indexOf('addEventListener("message"'));

assert.match(install, /self\.skipWaiting\(\)/);
assert.match(activate, /clients\.claim\(\)/);
assert.match(activate, /refreshShell\(/);
assert.match(sw, /networkFirstNavigation/);
assert.match(sw, /SKIP_WAITING/);
assert.equal(page.includes("shouldApplyUpdate"), false);
assert.match(page, /visibilityState === "visible"/);
assert.match(page, /writeSave\(\)/);
assert.equal(page.includes("app-update"), false);
assert.equal(page.includes("A new version is ready."), false);
assert.equal(page.includes("SKIP_WAITING"), false);
assert.equal(page.includes("SudokuUpdate"), false);
assert.equal(page.includes("location.replace"), false);
assert.equal(page.includes("location.reload"), false);
assert.equal(build.includes("A new version is ready."), false);
assert.equal(build.includes("app-update"), false);
assert.equal(build.includes("update-banner.js"), false);
assert.match(build, /silent-update\.js/);
assert.equal(header.includes("app-update"), false);

const built = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);

const dist = join(root, "dist");
const html = readFileSync(join(dist, "index.html"), "utf8");
const builtSw = readFileSync(join(dist, "sw.js"), "utf8");
assert.equal(html.includes("A new version is ready."), false);
assert.equal(html.includes("app-update"), false);
assert.match(html, /\/assets\/js\/silent-update\.js\?v=[0-9a-f]{12}/);
assert.match(html, /\/assets\/js\/sudoku\.js\?v=[0-9a-f]{12}/);
assert.equal(html.includes("update-banner.js"), false);
assert.match(builtSw, /skipWaiting\(\)/);
assert.match(builtSw, /clients\.claim\(\)/);

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
    const cache = path === "/sw.js" ? "no-cache" : "no-store";
    res.writeHead(200, {
      "content-type": types[extname(file)] || "application/octet-stream",
      "cache-control": cache,
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("missing");
  }
});
await new Promise((resolve) => site.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${site.address().port}`;

const oldPage = `<!DOCTYPE html><html><head><title>old</title></head><body>
<div id="app-update" hidden><p>A new version is ready.</p><button id="app-update-go">Refresh</button></div>
<script>
navigator.serviceWorker.register("/sw.js").then((registration) => {
  const show = (worker) => {
    const banner = document.getElementById("app-update");
    if (!banner) return;
    if (!worker || worker.state === "redundant") {
      if (!registration.waiting && !registration.installing) banner.hidden = true;
      return;
    }
    if (!navigator.serviceWorker.controller) {
      worker.postMessage({ type: "SKIP_WAITING" });
      worker.postMessage({ type: "skip-waiting" });
      return;
    }
    if (worker.state !== "installed") return;
    banner.hidden = false;
  };
  const track = (worker) => {
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed") show(worker);
      if (worker.state === "activated") show(registration.waiting);
    });
  };
  track(registration.installing);
  track(registration.waiting);
  show(registration.waiting);
  registration.addEventListener("updatefound", () => track(registration.installing));
  setInterval(() => { if (registration.waiting) show(registration.waiting); }, 200);
});
</script></body></html>`;

const cleanPage = "<!DOCTYPE html><html><head><title>new</title></head><body><p>Playing</p></body></html>";
const workerSource = readFileSync(join(root, "assets/js/sw.js"), "utf8")
  .replace("__SUDOKU_PWA_VERSION__", "silent-test")
  .replace("__SUDOKU_PWA_SHELL__", "[]");

function oldWorker(version) {
  return `const VERSION = ${JSON.stringify(version)};
self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING" || data.type === "skip-waiting") event.waitUntil(self.skipWaiting());
  if (data.type === "GET_VERSION" && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ type: "VERSION", version: VERSION });
  }
});
`;
}

let fixtureHtml = oldPage;
let fixtureSw = oldWorker("old-1");
const fixture = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname === "/sw.js") {
    res.writeHead(200, { "content-type": "text/javascript", "cache-control": "no-cache" });
    res.end(fixtureSw);
    return;
  }
  res.writeHead(200, { "content-type": "text/html", "cache-control": "no-store" });
  res.end(fixtureHtml);
});
await new Promise((resolve) => fixture.listen(0, "127.0.0.1", resolve));
const fixtureOrigin = `http://127.0.0.1:${fixture.address().port}`;

function workerVersion(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const worker = navigator.serviceWorker.controller;
        if (!worker) {
          resolve("");
          return;
        }
        const channel = new MessageChannel();
        const timer = setTimeout(() => resolve(""), 800);
        channel.port1.onmessage = (event) => {
          clearTimeout(timer);
          resolve(event.data && event.data.version ? event.data.version : "");
        };
        worker.postMessage({ type: "GET_VERSION" }, [channel.port2]);
      })
  );
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const live = await context.newPage();
  await live.goto(origin, { waitUntil: "domcontentloaded" });
  assert.equal(await live.locator("#app-update").count(), 0);
  assert.equal(await live.getByText("A new version is ready.").count(), 0);
  const src = await live.locator("script[src*='sudoku.js']").first().getAttribute("src");
  assert.match(src, /sudoku\.js\?v=[0-9a-f]{12}/);
  await live.waitForFunction(() => localStorage.getItem("sudoku-progress"));
  const before = JSON.parse(await live.evaluate(() => localStorage.getItem("sudoku-progress")));
  assert.equal(before.counted, true);
  await live.waitForFunction(() => navigator.serviceWorker.controller);
  await live.reload({ waitUntil: "domcontentloaded" });
  assert.equal(await live.locator("#app-update").count(), 0);
  assert.equal(await live.getByText("A new version is ready.").count(), 0);
  const after = JSON.parse(await live.evaluate(() => localStorage.getItem("sudoku-progress")));
  assert.equal(after.puzzleId, before.puzzleId);
  assert.deepEqual(after.board, before.board);
  assert.deepEqual(after.puzzle, before.puzzle);
  await context.close();

  const stuck = await browser.newContext();
  const old = await stuck.newPage();
  await old.goto(fixtureOrigin, { waitUntil: "domcontentloaded" });
  await old.waitForFunction(() => navigator.serviceWorker.controller);
  assert.equal(await old.locator("#app-update").getAttribute("hidden"), "");

  fixtureSw = oldWorker("old-2");
  await old.evaluate(() => navigator.serviceWorker.getRegistration().then((registration) => registration.update()));
  await old.waitForFunction(() => {
    const banner = document.getElementById("app-update");
    return banner && banner.hidden === false;
  });
  assert.equal(await old.locator("#app-update p").innerText(), "A new version is ready.");

  fixtureSw = workerSource;
  await old.evaluate(() => navigator.serviceWorker.getRegistration().then((registration) => registration.update()));
  await old.waitForFunction(() => navigator.serviceWorker.controller);
  await old.waitForFunction(
    async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration && !registration.waiting && !registration.installing;
    }
  );
  assert.equal(await workerVersion(old), "silent-test");

  fixtureHtml = cleanPage;
  await old.reload({ waitUntil: "domcontentloaded" });
  assert.equal(await old.locator("#app-update").count(), 0);
  assert.equal(await old.getByText("A new version is ready.").count(), 0);
  assert.equal(await workerVersion(old), "silent-test");
  await stuck.close();
} finally {
  await browser.close();
  site.close();
  fixture.close();
}

console.log("silent update ok");
