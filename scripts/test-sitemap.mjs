import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gitDate, lastmod } from "./lastmod.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const guide = "articles/01-beginners-guide.md";
const guideDate = gitDate(root, guide);
assert.match(guideDate, /^\d{4}-\d{2}-\d{2}$/);
assert.equal(lastmod(root, [guide]), guideDate);
const homeDate = lastmod(root, ["src/game.html", "home-copy.mjs"]);
assert.equal(homeDate >= gitDate(root, "src/game.html"), true);
assert.equal(homeDate >= gitDate(root, "home-copy.mjs"), true);

const built = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);

const xml = readFileSync(join(root, "dist/sitemap.xml"), "utf8");
const entries = [...xml.matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)].map((match) => ({
  loc: match[1],
  lastmod: match[2],
}));
assert.equal(entries.length > 10, true);
for (const entry of entries) assert.match(entry.lastmod, /^\d{4}-\d{2}-\d{2}$/);

function entry(path) {
  const found = entries.find((item) => item.loc === `https://sudokusudoku.com${path}`);
  assert.ok(found, path);
  return found;
}

assert.equal(entry("/articles/beginners-guide/").lastmod, guideDate);
assert.equal(entry("/").lastmod, homeDate);
assert.equal(entry("/how-difficulty-works/").lastmod, gitDate(root, "how-difficulty-works-content.html"));
assert.equal(entry("/techniques/x-wing/").lastmod, gitDate(root, "scripts/technique-copy.mjs"));
assert.equal(xml.includes("<lastmod></lastmod>"), false);
assert.equal(entries.some((item) => item.loc.endsWith("/skills/")), false);
assert.equal(entries.some((item) => item.loc.endsWith("/404.html")), false);

const build = readFileSync(join(root, "scripts/build.mjs"), "utf8");
const sitemapWriter = build.slice(build.indexOf('write(\n  "sitemap.xml"'));
assert.equal(sitemapWriter.includes("new Date()"), false);
assert.match(sitemapWriter, /lastmod\(root, entry\.sources\)/);

const grading = readFileSync(join(root, "dist/how-difficulty-works/index.html"), "utf8");
assert.match(grading, /<title>How Difficulty Works \| SudokuSudoku<\/title>/);
assert.match(grading, /How difficulty works/);

console.log("sitemap lastmod tests passed");
