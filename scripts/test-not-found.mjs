import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { legacyWordPressHome, pageNotFound } from "../functions/not-found.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function url(search) {
  return new URL(`https://sudokusudoku.com/${search}`);
}

assert.equal(legacyWordPressHome(url("?p=123")), true);
assert.equal(legacyWordPressHome(url("?p=0")), true);
assert.equal(legacyWordPressHome(url("?page_id=2")), true);
assert.equal(legacyWordPressHome(url("?attachment_id=9")), true);
assert.equal(legacyWordPressHome(url("?s=sudoku")), true);
assert.equal(legacyWordPressHome(url("?feed=rss2")), true);
assert.equal(legacyWordPressHome(url("?rest_route=/wp/v2/posts")), true);
assert.equal(legacyWordPressHome(url("?p=not-easy.abcdefgh")), false);
assert.equal(legacyWordPressHome(url("?p=not-easy.g.abc123")), false);
assert.equal(legacyWordPressHome(url("?difficulty=hard")), false);
assert.equal(legacyWordPressHome(url("?daily")), false);
assert.equal(legacyWordPressHome(url("?practice=x-wing")), false);
assert.equal(legacyWordPressHome(url("?train=x-wing")), false);
assert.equal(legacyWordPressHome(url("?fc=alwaysshow&fctype=gdpr")), false);
assert.equal(legacyWordPressHome(url("")), false);

const page = await pageNotFound({
  request: new Request("https://sudokusudoku.com/404"),
  env: {
    ASSETS: {
      async fetch(request) {
        assert.equal(new URL(request.url).pathname, "/page-not-found.txt");
        return new Response("<title>Page not found | SudokuSudoku</title><h1>Page not found</h1>", {
          status: 200,
          headers: { "content-type": "text/plain" },
        });
      },
    },
  },
});
assert.equal(page.status, 404);
assert.equal(page.headers.get("x-robots-tag"), "noindex");
assert.equal(page.headers.get("content-type"), "text/html; charset=utf-8");
assert.match(await page.text(), /Page not found \| SudokuSudoku/);

const fallback = await pageNotFound({
  request: new Request("https://sudokusudoku.com/?p=123"),
  env: {
    ASSETS: {
      async fetch() {
        return new Response("missing", { status: 404 });
      },
    },
  },
});
assert.equal(fallback.status, 404);
assert.match(await fallback.text(), /<title>Page not found \| SudokuSudoku<\/title>/);

const redirects = readFileSync(join(root, "src/_redirects"), "utf8");
const redirectRules = redirects.split("\n").filter((line) => {
  const trimmed = line.trim();
  return trimmed && !trimmed.startsWith("#");
});
for (const line of redirectRules) {
  const source = line.split(/\s+/)[0];
  assert.equal(source === "/*" || source === "*" || source === "/:splat", false);
}
assert.match(redirects, /\/page\/\* \/articles\/ 301/);
assert.match(redirects, /\/techniques\/:name \/techniques\/:name\/ 301/);
assert.doesNotMatch(redirects, /^\/\* /m);

const build = readFileSync(join(root, "scripts/build.mjs"), "utf8");
assert.match(build, /const notFoundHtml = layout\(\{[\s\S]*?\}\);[\s\S]*?write\(\s*"404\.html",\s*notFoundHtml\s*\);[\s\S]*?write\(\s*"page-not-found\.txt",\s*notFoundHtml\s*\);/);
assert.match(build, /\/page-not-found\.txt\n {2}X-Robots-Tag: noindex/);

const sw = readFileSync(join(root, "assets/js/sw.js"), "utf8");
const navigation = sw.slice(sw.indexOf("async function networkFirstNavigation"), sw.indexOf("async function shellFirst"));
assert.match(navigation, /response\.status === 404\) return response/);
assert.equal(navigation.includes("cache.put(path, response.clone())"), true);

console.log("not-found tests passed");
