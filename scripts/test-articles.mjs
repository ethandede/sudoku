import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { marked } from "marked";
import { techniques } from "./technique-copy.mjs";
import {
  articleJsonLd,
  formatPublishDate,
  gateHomepageCopy,
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
  "fewest-and-most-sudoku-clues": "2026-11-18",
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
const beforeFewest = [
  "what-makes-a-sudoku-hard",
  "history-of-sudoku",
  "sudoku-variants",
  "why-ai-is-bad-at-sudoku",
  "does-sudoku-keep-your-brain-sharp",
  "why-being-stuck-is-good-for-you",
];
assert.deepEqual(live("2026-11-11"), beforeFewest);
assert.deepEqual(live("2026-11-17"), beforeFewest);
assert.deepEqual(live("2026-11-18"), Object.keys(schedule));
assert.equal(isPublished("", "2026-10-21"), true);
assert.equal(formatPublishDate("2026-10-28"), "October 28, 2026");
assert.equal(formatPublishDate("2026-11-04"), "November 4, 2026");
assert.equal(formatPublishDate("2026-11-18"), "November 18, 2026");

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

const clues = prepareArticle(readArticle("fewest-and-most-sudoku-clues"));
assert.deepEqual(clues.relatedSlugs, [
  "what-makes-a-sudoku-hard",
  "history-of-sudoku",
  "nyt-medium-vs-hard",
]);
assert.equal(clues.content.includes("By Ethan"), false);
assert.equal(clues.content.includes("—"), false);
assert.equal(clues.content.includes("```"), false);
assert.equal(clues.content.includes("+-------+-------+-------+"), false);
assert.equal((clues.content.match(/class="puzzle-grid"/g) || []).length, 3);
assert.equal((clues.content.match(/class="puzzle-strip"/g) || []).length, 1);
assert.equal((clues.content.match(/class="puzzle-cell/g) || []).length, 3 * 81 + 18);
assert.match(clues.content, /class="puzzle-strip-label">row 1</);
assert.match(clues.content, /class="puzzle-strip-label">row 2</);
assert.match(
  clues.content,
  /`576821349\.\.2934567934576182741358296358692471629147853463715928\.\.5269734297483615`/
);
assert.match(
  clues.content,
  /`\.\.\.\.\.\.\.\.\.\.12\.34567\.345\.6182\.\.1\.582\.6\.\.86\.\.\.\.1\.2\.\.\.7\.5\.\.\.37\.5\.28\.8\.\.6\.7\.\.2\.7\.83615`/
);
const cluesHtml = marked.parse(clues.content);
assert.equal(cluesHtml.includes("—"), false);
assert.equal(cluesHtml.includes('href="/techniques/pointing/"'), true);
assert.equal(cluesHtml.includes('href="/techniques/coloring/"'), true);
assert.equal(cluesHtml.includes('href="/techniques/hidden-single/"'), true);
assert.equal(cluesHtml.includes('href="/techniques/x-wing/"'), true);
assert.equal(cluesHtml.includes('href="/techniques/xy-chain/"'), true);
assert.equal(cluesHtml.includes('href="/techniques/naked-single/"'), true);
assert.equal(cluesHtml.includes('href="/?difficulty=quick"'), true);
assert.equal(cluesHtml.includes('href="/?difficulty=mental"'), true);

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

const HARD_LINK =
  '<a href="/articles/what-makes-a-sudoku-hard/">Here\'s what actually makes a Sudoku hard</a>';
const homepage = readFileSync(new URL("../src/game.html", import.meta.url), "utf8");
const copyStart = homepage.indexOf('<div class="sudoku-copy">');
const copy = homepage.slice(copyStart, homepage.indexOf("</div>", copyStart));
assert.match(copy, /<h2>Sudoku, graded honestly\.<\/h2>/);
assert.equal(copy.includes("<h1"), false);
assert.equal(copy.includes(HARD_LINK), true);
assert.equal(copy.includes('href="/techniques/"'), true);
assert.equal(copy.includes("—"), false);
assert.equal(copy.includes("<!--"), false);
for (const phrase of ["easybrain", "sudoku.com", "livesudoku", "sudoku.cba.si", "sudoku app no ads"]) {
  assert.equal(copy.toLowerCase().includes(phrase), false, phrase);
}

const early = gateHomepageCopy(copy, "2026-10-21");
assert.equal(early.includes(HARD_LINK), false);
assert.equal(early.includes("Here's what actually makes a Sudoku hard."), true);
assert.equal(early.includes('href="/techniques/"'), true);
assert.equal(early.includes('href="/?difficulty=easy"'), true);

const liveDay = gateHomepageCopy(copy, "2026-10-28");
assert.equal(liveDay.includes(HARD_LINK), true);
assert.equal(liveDay.includes('href="/techniques/"'), true);

const noLibrary = gateHomepageCopy(copy, "2026-10-28", { techniques: false });
assert.equal(noLibrary.includes('href="/techniques/"'), false);
assert.equal(noLibrary.includes("the technique behind it"), true);
assert.equal(noLibrary.includes(HARD_LINK), true);

const build = readFileSync(new URL("./build.mjs", import.meta.url), "utf8");
assert.match(build, /SudokuSudoku\. All rights reserved\./);
assert.equal(build.includes("Sudoku Online"), false);
assert.match(build, /articles\/fewest-and-most-sudoku-clues\.md/);

const techniqueSlugs = new Set(techniques.map((technique) => technique.slug));
const articleSlugs = new Set([
  ...Object.keys(schedule),
  "beginners-guide",
  "common-mistakes",
  "nyt-medium-vs-hard",
]);
const staticPaths = new Set([
  "/",
  "/techniques/",
  "/articles/",
  "/stats/",
  "/about/",
  "/contact/",
  "/privacy-policy/",
  "/skills/",
  "/links/",
]);
const difficulties = new Set(["quick", "easy", "not-easy", "hard", "expert", "mental"]);

function slashPath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function redirectsFrom(text) {
  const map = new Map();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [from, to, code] = trimmed.split(/\s+/);
    if (code !== "301" || !from || !to) continue;
    map.set(slashPath(from), to);
  }
  return map;
}

const redirectMap = redirectsFrom(redirects);

function routeExists(path, search) {
  if (path === "/" && search.has("daily") && search.size === 1) return true;
  if (path === "/" && search.has("difficulty") && search.size === 1) {
    return difficulties.has(search.get("difficulty"));
  }
  if (search.size > 0) return false;
  if (staticPaths.has(path)) return true;
  const technique = path.match(/^\/techniques\/([a-z0-9-]+)\/$/);
  if (technique) return techniqueSlugs.has(technique[1]);
  const article = path.match(/^\/articles\/([a-z0-9-]+)\/$/);
  if (article) return articleSlugs.has(article[1]);
  return false;
}

function linkResolves(raw) {
  const url = new URL(raw, "https://sudokusudoku.com");
  const path = slashPath(url.pathname);
  if (routeExists(path, url.searchParams)) return true;
  const target = redirectMap.get(path);
  if (!target) return false;
  const next = new URL(target, "https://sudokusudoku.com");
  return routeExists(slashPath(next.pathname), next.searchParams);
}

const broken = [];
for (const slug of Object.keys(schedule)) {
  const markdown = readArticle(slug);
  for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const href = match[1];
    if (!href.startsWith("/")) continue;
    if (!linkResolves(href)) broken.push(`${slug}: ${href}`);
  }
}
assert.deepEqual(broken, []);

console.log("article publish tests passed");
