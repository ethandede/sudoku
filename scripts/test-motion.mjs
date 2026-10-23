import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const motion = read("assets/scss/components/_chrome-motion.scss");
const brand = read("assets/scss/components/_brand.scss");
const main = read("assets/scss/main.scss");
const icons = read("scripts/icons.mjs");
const stats = read("assets/js/stats-page.js");
const build = read("scripts/build.mjs");
const promos = read("scripts/house-promos.mjs");
const promoCss = read("assets/scss/components/_house-promos.scss");
const sudoku = read("assets/scss/pages/_sudoku.scss");

assert.match(main, /@use 'components\/chrome-motion'/);
assert.match(brand, /radial-gradient\(rgba\(12, 79, 134/);
assert.match(motion, /prefers-reduced-motion:\s*no-preference/);
assert.match(motion, /translateY\(1px\)/);
assert.match(motion, /@property --hm-beam/);
assert.match(motion, /animation-play-state:\s*paused/);
assert.match(motion, /stats-loading::after/);
assert.equal(motion.includes("framer-motion"), false);
assert.equal(motion.includes("@motionone"), false);

for (const selector of [".sudoku-grid", ".number-pad", ".erase-key", ".mode-toggle", ".cell", "#timer", ".technique-controls"]) {
  assert.equal(motion.includes(selector), false, `${selector} leaked into motion CSS`);
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
assert.match(stats, /prefers-reduced-motion:\s*reduce/);
assert.match(stats, /minWidth/);
assert.equal(stats.includes("from \"motion\""), false);
assert.equal(stats.includes("framer-motion"), false);
assert.match(stats, /function clock/);

console.log("chrome motion tests passed");
