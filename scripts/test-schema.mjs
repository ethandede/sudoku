import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { articleJsonLd } from "./articles.mjs";
import { gitDate, gitFirstDate } from "./lastmod.mjs";
import { articleImage, breadcrumbList } from "./schema.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://sudokusudoku.com";
const DAY = /^\d{4}-\d{2}-\d{2}$/;

assert.equal(breadcrumbList(SITE, `${SITE}/`, "Home"), null);
const wing = breadcrumbList(SITE, `${SITE}/techniques/x-wing/`, "X-wing");
assert.deepEqual(
  wing.itemListElement.map((item) => item.name),
  ["Home", "Techniques", "X-wing"]
);
assert.deepEqual(
  wing.itemListElement.map((item) => item.position),
  [1, 2, 3]
);
assert.equal(wing.itemListElement[1].item, `${SITE}/techniques/`);

const image = articleImage(SITE, {
  src: "/articles/images/beginner-4x4.svg",
  width: "480",
  height: "520",
});
assert.equal(image["@type"], "ImageObject");
assert.equal(image.url, `${SITE}/articles/images/beginner-4x4.svg`);
assert.equal(image.width, 480);
assert.equal(image.height, 520);

const sample = articleJsonLd({
  title: "How to play Sudoku",
  description: "The rules of Sudoku.",
  url: `${SITE}/articles/beginners-guide/`,
  publishDate: "2025-10-12",
  dateModified: "2026-10-21",
  image,
});
assert.equal(sample.headline, "How to play Sudoku");
assert.equal(sample.datePublished, "2025-10-12");
assert.equal(sample.dateModified, "2026-10-21");
assert.equal(sample.author.name, "Ethan Ede");
assert.equal(sample.image.url, image.url);

const built = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith(".html") || name === "page-not-found.txt") out.push(path);
  }
  return out;
}

function graphs(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.ok(blocks.length > 0, "json-ld");
  return blocks.map((match) => JSON.parse(match[1]));
}

function visibleH1(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  assert.ok(match, "h1");
  return match[1]
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

for (const file of walk(join(root, "dist"))) {
  const html = readFileSync(file, "utf8");
  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/);
  assert.ok(canonical, file);
  const isHome = canonical[1] === `${SITE}/`;
  for (const data of graphs(html)) {
    assert.equal(data["@context"], "https://schema.org", file);
    assert.ok(Array.isArray(data["@graph"]), file);
    const crumbs = data["@graph"].filter((node) => node["@type"] === "BreadcrumbList");
    if (isHome) {
      assert.equal(crumbs.length, 0, file);
      continue;
    }
    assert.equal(crumbs.length, 1, file);
    const list = crumbs[0].itemListElement;
    assert.equal(list[0].name, "Home", file);
    assert.equal(list[0].item, `${SITE}/`, file);
    list.forEach((item, index) => {
      assert.equal(item["@type"], "ListItem");
      assert.equal(item.position, index + 1);
      assert.equal(item.name.includes("—"), false, file);
      assert.match(item.item, /^https:\/\/sudokusudoku.com\//, file);
    });
    assert.equal(list.at(-1).name, visibleH1(html), file);
    assert.equal(list.at(-1).item, canonical[1], file);
  }
}

function articleNode(relativePath) {
  const html = readFileSync(join(root, "dist", relativePath), "utf8");
  const article = graphs(html)
    .flatMap((data) => data["@graph"])
    .find((node) => node["@type"] === "Article");
  assert.ok(article, relativePath);
  return article;
}

function expectGuide(slug, source) {
  const article = articleNode(`articles/${slug}/index.html`);
  assert.equal(article.headline, visibleH1(readFileSync(join(root, "dist", `articles/${slug}/index.html`), "utf8")));
  assert.equal(article.datePublished, gitFirstDate(root, source));
  assert.equal(article.dateModified, gitDate(root, source));
  assert.equal(DAY.test(article.datePublished), true);
  assert.equal(article.dateModified >= article.datePublished, true);
  assert.equal(article.author["@type"], "Person");
  assert.equal(article.author.name, "Ethan Ede");
  assert.equal(article.author.url, `${SITE}/about/`);
  assert.equal(article.mainEntityOfPage, `${SITE}/articles/${slug}/`);
  assert.equal(article.image["@type"], "ImageObject");
  assert.match(article.image.url, /^https:\/\/sudokusudoku.com\/articles\/images\/.+\.svg$/);
  assert.equal(Number.isFinite(article.image.width), true);
  assert.equal(Number.isFinite(article.image.height), true);
}

expectGuide("beginners-guide", "articles/01-beginners-guide.md");
expectGuide("common-mistakes", "articles/02-common-mistakes.md");

const nyt = articleNode("articles/nyt-medium-vs-hard/index.html");
assert.equal(nyt.author["@type"], "Organization");
assert.equal(nyt.author.name, "SudokuSudoku");
assert.equal(nyt.datePublished, gitFirstDate(root, "articles/04-nyt-medium-vs-hard.md"));
assert.equal(nyt.dateModified, gitDate(root, "articles/04-nyt-medium-vs-hard.md"));
assert.equal(nyt.headline.length > 0, true);

console.log("schema tests passed");
