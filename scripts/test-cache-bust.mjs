import assert from "node:assert/strict";
import { assetVersion, versionFontUrls, withVersion } from "./asset-version.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

assert.equal(withVersion("/assets/js/sudoku.js", "abc123"), "/assets/js/sudoku.js?v=abc123");
assert.equal(withVersion("/assets/css/style.css", "abc123"), "/assets/css/style.css?v=abc123");
assert.equal(
  withVersion("/assets/fonts/open-sans-latin-400.woff2", "abc123"),
  "/assets/fonts/open-sans-latin-400.woff2?v=abc123"
);
assert.equal(withVersion("/icons/icon-192.png", "abc123"), "/icons/icon-192.png?v=abc123");
assert.equal(withVersion("/favicon.svg", "abc123"), "/favicon.svg?v=abc123");
assert.equal(withVersion("/assets/js/sudoku.js?v=abc123", "def"), "/assets/js/sudoku.js?v=abc123");
assert.equal(
  withVersion("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub", "abc123"),
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub"
);

const css = versionFontUrls(
  `@font-face{src:url("/assets/fonts/open-sans-latin-400.woff2") format("woff2")}@font-face{src:url(/assets/fonts/open-sans-latin-600.woff2) format("woff2")}`,
  "abc123"
);
assert.equal(css.includes('url("/assets/fonts/open-sans-latin-400.woff2?v=abc123")'), true);
assert.equal(css.includes("url(/assets/fonts/open-sans-latin-600.woff2?v=abc123)"), true);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = assetVersion(root);
assert.match(version, /^[0-9a-f]{7,40}$/);

console.log("cache bust tests passed");
