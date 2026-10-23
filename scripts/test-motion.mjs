import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const motion = read("assets/scss/components/_chrome-motion.scss");
const uiverse = read("assets/scss/components/_uiverse.scss");
const brand = read("assets/scss/components/_brand.scss");
const main = read("assets/scss/main.scss");
const icons = read("scripts/icons.mjs");
const stats = read("assets/js/stats-page.js");
const build = read("scripts/build.mjs");
const promos = read("scripts/house-promos.mjs");
const promoCss = read("assets/scss/components/_house-promos.scss");
const sudoku = read("assets/scss/pages/_sudoku.scss");

assert.match(main, /@use 'components\/chrome-motion'/);
assert.match(main, /@use 'components\/uiverse'/);
assert.match(brand, /radial-gradient\(rgba\(12, 79, 134/);
assert.match(motion, /prefers-reduced-motion:\s*no-preference/);
assert.match(motion, /translateY\(1px\)/);
assert.match(motion, /var\(--btn-duration\)/);
assert.match(motion, /var\(--btn-ease\)/);
const variables = read("assets/scss/abstracts/_variables.scss");
const buttonCss = read("assets/scss/components/_buttons.scss");
assert.match(variables, /--btn-duration:\s*180ms/);
assert.match(variables, /--btn-ease:\s*ease-out/);
assert.match(variables, /--btn-press:\s*1px/);
assert.match(variables, /--btn-icon-nudge:\s*2px/);
assert.match(variables, /--btn-focus-width:\s*1px/);
assert.match(buttonCss, /prefers-reduced-motion:\s*no-preference/);
assert.match(buttonCss, /translateX\(var\(--btn-icon-nudge\)\)/);
assert.equal(buttonCss.includes("cubic-bezier"), false);
assert.equal(buttonCss.includes("scale(1.1"), false);
assert.match(buttonCss, /\.btn-icon:hover svg[\s\S]*?scale\(1\.05\)/);
assert.equal(motion.includes("--hm-beam"), false);
assert.equal(motion.includes("framer-motion"), false);
assert.equal(motion.includes("@motionone"), false);
assert.match(uiverse, /From Uiverse\.io by Dear31/);
assert.match(uiverse, /From Uiverse\.io by G4b413l/);
assert.match(uiverse, /From Uiverse\.io by Na3ar-17/);
assert.match(uiverse, /From Uiverse\.io by adamgiebl/);
assert.match(uiverse, /From Uiverse\.io by Cksunandh/);
assert.match(uiverse, /https:\/\/uiverse\.io\/Dear31\/good-yak-38/);
assert.match(uiverse, /prefers-reduced-motion:\s*reduce/);
assert.match(build, /class="ui-dots"/);

for (const source of [motion, uiverse]) {
  for (const selector of [".sudoku-grid", ".number-pad", ".erase-key", ".mode-toggle", ".cell", "#timer", ".technique-controls", "#auto-candidates"]) {
    assert.equal(source.includes(selector), false, `${selector} leaked into chrome CSS`);
  }
}

assert.match(sudoku, /\.play-column[\s\S]*?height:\s*100dvh/);

assert.match(icons, /Copyright \(c\) 2023 Phosphor Icons/);
assert.match(icons, /Permission is hereby granted, free of charge/);
assert.match(icons, /M221\.66,133\.66l-72,72/);
assert.match(icons, /M224,128a8,8,0,0,1-8,8H59\.31/);

assert.match(build, /phosphorArrow\("right"\)/);
assert.match(build, /phosphorArrow\("left"\)/);
assert.match(build, /stats-empty stats-loading/);
assert.match(promos, /phosphorArrow\("right"\)/);
assert.equal(promoCss.includes('content: " \\2192"'), false);

assert.match(stats, /data-count/);
assert.match(stats, /RareCounter\.watch/);
assert.match(stats, /data-format="time"/);
assert.match(stats, /playerRecord/);
assert.match(build, /id="your-games"/);
const statsScript = build.indexOf('scriptTag("/assets/js/stats-page.js")');
const mergeScript = build.lastIndexOf('scriptTag("/assets/js/account-merge.js")', statsScript);
assert.ok(mergeScript > 0 && mergeScript < statsScript, "stats page loads account merge before the stats script");
assert.equal(stats.includes("from \"motion\""), false);
assert.equal(stats.includes("framer-motion"), false);
assert.match(stats, /function clock/);

const counter = read("assets/js/rare-counter.js");
const deleter = read("assets/js/rare-delete.js");
const rareCss = read("assets/scss/components/_rare.scss");
assert.match(counter, /Copyright \(c\) 2026 Swami Malode/);
assert.match(counter, /https:\/\/rareui\.com/);
assert.match(counter, /prefers-reduced-motion:\s*reduce/);
assert.match(counter, /minWidth/);
assert.match(counter, /IntersectionObserver/);
assert.match(deleter, /Copyright \(c\) 2026 Swami Malode/);
assert.match(deleter, /Escape/);
assert.match(deleter, /aria-expanded/);
assert.match(rareCss, /prefers-reduced-motion:\s*reduce/);
assert.equal(rareCss.includes("#FF5F2E"), false);
assert.equal(rareCss.includes("#ff5f2e"), false);
assert.match(build, /https:\/\/rareui\.com/);
for (const source of [rareCss]) {
  for (const selector of [".sudoku-grid", ".number-pad", ".erase-key", ".mode-toggle", ".undo-btn", ".cell", "#timer"]) {
    assert.equal(source.includes(selector), false, `${selector} leaked into rare CSS`);
  }
}

console.log("chrome motion tests passed");
