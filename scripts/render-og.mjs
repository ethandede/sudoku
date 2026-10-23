// Draws the committed 1200x630 share cards. Palette A, Open Sans, the
// house grid mark. Run this when a technique or article title changes,
// then commit the PNGs under assets/og/.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { techniques } from "./technique-copy.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fontDir = join(root, "assets/fonts");

const PATTERNS = {
  "naked-single": { focus: [40] },
  "hidden-single": { soft: [36, 37, 38, 39, 41, 42, 43, 44], focus: [40] },
  pointing: { soft: [0, 1, 9, 10, 18, 19], focus: [2, 11, 20] },
  claiming: { soft: [3, 4, 5, 6, 7, 8], focus: [0, 1, 2] },
  "naked-pair": { focus: [10, 13] },
  "hidden-pair": { soft: [27, 28, 29, 31, 33, 34, 35], focus: [30, 32] },
  "naked-triple": { focus: [54, 58, 62] },
  "hidden-triple": { soft: [3, 4, 5, 12, 14, 21, 22, 23], focus: [13, 22, 4] },
  quads: { focus: [0, 1, 9, 10] },
  "x-wing": { focus: [11, 15, 47, 51] },
  swordfish: { focus: [2, 6, 29, 33, 56, 60] },
  "xy-wing": { focus: [20, 24, 56] },
  "w-wing": { focus: [10, 19, 55, 64] },
  skyscraper: { focus: [1, 19, 14, 68] },
  "two-string-kite": { focus: [2, 20, 23, 47] },
  "xyz-wing": { focus: [30, 34, 66] },
  coloring: { focus: [10, 28, 46], accent: [16, 34, 52] },
  "xy-chain": { focus: [0, 4, 22, 40, 44, 62, 80] },
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function articleCards() {
  const source = readFileSync(join(root, "scripts/build.mjs"), "utf8");
  const cards = [];
  for (const match of source.matchAll(/file: "(articles\/[^"]+)", slug: "([^"]+)"/g)) {
    const markdown = readFileSync(join(root, match[1]), "utf8");
    const heading = markdown.match(/^# (.+)$/m);
    if (!heading) throw new Error(`No heading in ${match[1]}`);
    cards.push({ slug: match[2], title: heading[1].trim(), kicker: "Article" });
  }
  if (!cards.length) throw new Error("No article cards found");
  return cards;
}

function boardHtml(slug) {
  const pattern = PATTERNS[slug];
  if (!pattern) throw new Error(`No OG pattern for ${slug}`);
  const focus = new Set(pattern.focus || []);
  const soft = new Set(pattern.soft || []);
  const accent = new Set(pattern.accent || []);
  let cells = "";
  for (let index = 0; index < 81; index += 1) {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const classes = ["cell"];
    if (col % 3 === 0) classes.push("bl");
    if (row % 3 === 0) classes.push("bt");
    if (col === 8) classes.push("br");
    if (row === 8) classes.push("bb");
    if (focus.has(index)) classes.push("focus");
    else if (accent.has(index)) classes.push("accent");
    else if (soft.has(index)) classes.push("soft");
    cells += `<i class="${classes.join(" ")}"></i>`;
  }
  return `<div class="board" aria-hidden="true">${cells}</div>`;
}

function pageHtml({ title, kicker, art }) {
  const size = title.length > 48 ? 52 : title.length > 32 ? 62 : 76;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @font-face { font-family: "Open Sans"; src: url("file://${fontDir}/open-sans-latin-400.woff2") format("woff2"); font-weight: 400; }
  @font-face { font-family: "Open Sans"; src: url("file://${fontDir}/open-sans-latin-600.woff2") format("woff2"); font-weight: 600; }
  @font-face { font-family: "Open Sans"; src: url("file://${fontDir}/open-sans-latin-700.woff2") format("woff2"); font-weight: 700; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  #card {
    width: 1200px;
    height: 630px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 48px;
    padding: 64px 72px;
    background-color: #f4f6f8;
    background-image: radial-gradient(rgba(12, 79, 134, 0.18) 1.2px, transparent 1.35px);
    background-size: 22px 22px;
    color: #1e232b;
    font-family: "Open Sans", sans-serif;
  }
  .copy { width: 640px; }
  .brand { display: flex; align-items: center; gap: 12px; color: #0c4f86; font-weight: 700; font-size: 22px; letter-spacing: 0.01em; }
  .brand svg { width: 28px; height: 28px; }
  h1 { margin: 28px 0 0; font-size: ${size}px; line-height: 1.05; font-weight: 700; letter-spacing: -0.03em; }
  .kicker { margin: 22px 0 0; color: #5c6670; font-size: 28px; font-weight: 600; }
  .site { margin: 36px 0 0; color: #0c4f86; font-size: 22px; font-weight: 700; }
  .board { width: 392px; height: 392px; display: grid; grid-template-columns: repeat(9, 1fr); background: #f4f6f8; border-radius: 8px; }
  .cell { border: 1px solid #8aa4bb; background: #f4f6f8; }
  .cell.bl { border-left-width: 3px; border-left-color: #0c4f86; }
  .cell.bt { border-top-width: 3px; border-top-color: #0c4f86; }
  .cell.br { border-right-width: 3px; border-right-color: #0c4f86; }
  .cell.bb { border-bottom-width: 3px; border-bottom-color: #0c4f86; }
  .cell.focus { background: #0c4f86; }
  .cell.accent { background: #0b6e5f; }
  .cell.soft { background: #d4e8f7; }
  .sheet { width: 280px; height: 340px; background: #f4f6f8; border: 3px solid #0c4f86; border-radius: 10px; padding: 36px 28px; }
  .sheet i { display: block; height: 8px; margin: 0 0 22px; background: #8aa4bb; }
  .sheet i:nth-child(1) { width: 78%; }
  .sheet i:nth-child(2) { width: 62%; }
  .sheet i:nth-child(3) { width: 44%; }
  .sheet b { display: block; width: 36px; height: 36px; margin-top: 28px; background: #0c4f86; }
</style>
</head>
<body>
  <div id="card">
    <div class="copy">
      <div class="brand"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.2 1.2h13.6v13.6H1.2z" fill="none" stroke="currentColor" stroke-width="1.15"/><path d="M5.7 1.2v13.6M10.3 1.2v13.6M1.2 5.7h13.6M1.2 10.3h13.6" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/><rect x="6.15" y="6.15" width="3.7" height="3.7" fill="currentColor"/></svg><span>SudokuSudoku</span></div>
      <h1>${escapeHtml(title)}</h1>
      <p class="kicker">${escapeHtml(kicker)}</p>
      <p class="site">sudokusudoku.com</p>
    </div>
    ${art}
  </div>
</body>
</html>`;
}

const cards = [
  ...techniques.map((technique) => ({
    dir: "techniques",
    slug: technique.slug,
    title: technique.name,
    kicker: `${technique.level} technique`,
    art: boardHtml(technique.slug),
  })),
  ...articleCards().map((article) => ({
    dir: "articles",
    slug: article.slug,
    title: article.title,
    kicker: article.kicker,
    art: `<div class="sheet" aria-hidden="true"><i></i><i></i><i></i><b></b></div>`,
  })),
];

<<<<<<< HEAD
const only = process.argv[2];
=======
const only = process.argv[2] || "";
>>>>>>> origin/main
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const card of cards) {
  if (only && card.slug !== only) continue;
  await page.setContent(pageHtml(card), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const target = join(root, "assets/og", card.dir, `${card.slug}.png`);
  mkdirSync(dirname(target), { recursive: true });
  const png = await page.locator("#card").screenshot({ type: "png" });
  writeFileSync(target, png);
  console.log(card.dir, card.slug, png.length);
}
await browser.close();
