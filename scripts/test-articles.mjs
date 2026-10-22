import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { marked } from "marked";
import {
  articleJsonLd,
  formatPublishDate,
  isPublished,
  losAngelesToday,
  prepareArticle,
  renderPuzzleGrids,
  shortBio,
  stripUnpublishedLinks,
  wrapTables,
} from "./articles.mjs";

const schedule = {
  "what-makes-a-sudoku-hard": "2026-10-28",
  "history-of-sudoku": "2026-10-28",
  "sudoku-variants": "2026-11-04",
  "why-ai-is-bad-at-sudoku": "2026-11-04",
  "does-sudoku-keep-your-brain-sharp": "2026-11-11",
  "why-being-stuck-is-good-for-you": "2026-11-11",
};

function readArticle(slug) {
  return readFileSync(new URL(`../articles/${slug}.md`, import.meta.url), "utf8");
}

const catalog = Object.keys(schedule).map((slug) => {
  const prepared = prepareArticle(readArticle(slug));
  assert.equal(prepared.data.slug, slug);
  assert.equal(prepared.data.publishDate, schedule[slug]);
  assert.equal(prepared.content.includes("REQUIRES:"), false);
  assert.equal(prepared.content.includes("<!--"), false);
  return { slug, publishDate: prepared.data.publishDate, related: prepared.relatedSlugs };
});

function live(today) {
  return catalog.filter((article) => isPublished(article.publishDate, today)).map((article) => article.slug);
}

assert.deepEqual(live("2026-10-21"), []);
assert.deepEqual(live("2026-10-27"), []);
assert.deepEqual(live("2026-10-28"), ["what-makes-a-sudoku-hard", "history-of-sudoku"]);
assert.deepEqual(live("2026-11-03"), ["what-makes-a-sudoku-hard", "history-of-sudoku"]);
assert.deepEqual(live("2026-11-04"), [
  "what-makes-a-sudoku-hard",
  "history-of-sudoku",
  "sudoku-variants",
  "why-ai-is-bad-at-sudoku",
]);
assert.deepEqual(live("2026-11-11"), Object.keys(schedule));
assert.equal(isPublished("", "2026-10-21"), true);
assert.equal(formatPublishDate("2026-10-28"), "October 28, 2026");
assert.equal(formatPublishDate("2026-11-04"), "November 4, 2026");

assert.equal(losAngelesToday(new Date("2026-10-22T06:30:00Z"), ""), "2026-10-21");
assert.equal(losAngelesToday(new Date("2026-10-22T07:00:00Z"), ""), "2026-10-22");
assert.equal(losAngelesToday(new Date("2026-11-11T18:00:00Z"), ""), "2026-11-11");

const hard = prepareArticle(readArticle("what-makes-a-sudoku-hard"));
assert.deepEqual(hard.relatedSlugs, [
  "nyt-medium-vs-hard",
  "history-of-sudoku",
  "why-being-stuck-is-good-for-you",
]);
const rendered = renderPuzzleGrids(hard.content);
const grids = rendered.match(/class="puzzle-grid"/g) || [];
assert.equal(grids.length, 4);
assert.equal((rendered.match(/class="puzzle-cell/g) || []).length, 324);
assert.equal(rendered.includes("+-------+-------+-------+"), false);
assert.equal(rendered.includes("`008735206"), true);

const unpublished = new Set(["why-being-stuck-is-good-for-you", "sudoku-variants", "why-ai-is-bad-at-sudoku"]);
let html = wrapTables(stripUnpublishedLinks(marked.parse(rendered), unpublished));
assert.equal(html.includes("REQUIRES"), false);
assert.equal(html.includes("<!--"), false);
assert.equal(html.includes('href="/stats/"'), true);
assert.equal(html.includes('href="/articles/why-being-stuck-is-good-for-you/"'), false);
assert.equal(html.includes("raise mine"), true);
assert.equal(html.includes('href="/articles/history-of-sudoku/"'), true);
assert.equal(html.includes('href="/articles/nyt-medium-vs-hard/"'), true);
assert.equal(html.includes("<table"), true);
assert.equal(html.includes('class="table-scroll"'), true);
assert.equal(html.includes("—"), false);

const linked = stripUnpublishedLinks(html, new Set());
assert.equal(marked.parse(rendered).includes('href="/articles/why-being-stuck-is-good-for-you/"'), true);
assert.equal(linked.includes("raise mine"), true);

const history = prepareArticle(readArticle("history-of-sudoku"));
const historyHtml = stripUnpublishedLinks(marked.parse(history.content), unpublished);
assert.equal(historyHtml.includes('href="/articles/what-makes-a-sudoku-hard/"'), true);
assert.equal(historyHtml.includes('href="/articles/sudoku-variants/"'), false);
assert.equal(historyHtml.includes('href="/articles/why-ai-is-bad-at-sudoku/"'), false);
assert.match(historyHtml, /wrote up the variants too/);

const bio = shortBio(readFileSync(new URL("../author-bio.md", import.meta.url), "utf8"));
assert.match(bio, /^I'm Ethan\./);
assert.match(bio, /Neither pet has ever helped with a puzzle\.$/);
assert.equal(bio.includes("##"), false);
assert.equal(bio.includes("—"), false);

const ld = articleJsonLd({
  title: "More Clues Doesn't Mean Easier: What Actually Makes a Sudoku Hard",
  description: hard.data.meta_description,
  url: "https://sudokusudoku.com/articles/what-makes-a-sudoku-hard/",
  publishDate: "2026-10-28",
});
assert.equal(ld["@type"], "Article");
assert.equal(ld.author["@type"], "Person");
assert.equal(ld.author.name, "Ethan Ede");
assert.equal(ld.author.url, "https://sudokusudoku.com/about/");
assert.equal(ld.author.sameAs, "https://ethanede.com");
assert.equal(ld.datePublished, "2026-10-28");

const redirects = readFileSync(new URL("../src/_redirects", import.meta.url), "utf8");
for (const [from, to] of [
  ["/techniques/pointing-and-claiming/", "/techniques/pointing/"],
  ["/techniques/naked-quad/", "/techniques/quads/"],
  ["/techniques/simple-coloring/", "/techniques/coloring/"],
]) {
  assert.match(redirects, new RegExp(`${from.replaceAll("/", "\\/")} ${to.replaceAll("/", "\\/")} 301`));
}

const about = readFileSync(new URL("../about-page-content.md", import.meta.url), "utf8");
assert.match(about, /^Hi, I'm Ethan Ede\./);
assert.match(about, /Teddy, chief puzzle supervisor\. Never once helpful\./);
assert.match(about, /\/contact\//);
assert.equal(about.includes("DRAFT"), false);
assert.equal(about.includes("—"), false);

console.log("article publish tests passed");
