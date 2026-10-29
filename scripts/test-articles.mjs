import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
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
  "sudoku-techniques-in-order": "2026-10-29",
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
assert.deepEqual(live("2026-11-03"), [
  "what-makes-a-sudoku-hard",
  "history-of-sudoku",
  "sudoku-techniques-in-order",
]);
assert.deepEqual(live("2026-11-04"), [
  "what-makes-a-sudoku-hard",
  "history-of-sudoku",
  "sudoku-techniques-in-order",
  "sudoku-variants",
  "why-ai-is-bad-at-sudoku",
]);
const beforeFewest = [
  "what-makes-a-sudoku-hard",
  "history-of-sudoku",
  "sudoku-techniques-in-order",
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
assert.match(bio, /SudokuSudoku started as my way to finally learn the techniques I'd been too lazy to figure out: hints that teach the move on your own board, and honest difficulty\./);
assert.match(bio, /Neither pet has ever helped with a puzzle\.$/);
assert.equal(bio.includes("##"), false);
assert.equal(bio.includes("—"), false);
assert.equal(bio.includes("the site I wanted to play on"), false);

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
assert.equal(ld.dateModified, "2026-10-28");
assert.equal(ld.image, undefined);

const redirects = readFileSync(new URL("../src/_redirects", import.meta.url), "utf8");
for (const [from, to] of [
  ["/techniques/pointing-and-claiming/", "/techniques/pointing/"],
  ["/techniques/naked-quad/", "/techniques/quads/"],
  ["/techniques/simple-coloring/", "/techniques/coloring/"],
  ["/the-complete-beginners-guide-to-sudoku-from-zero-to-your-first-solved-puzzle/", "/articles/beginners-guide/"],
  ["/7-common-sudoku-mistakes-and-how-to-fix-them/", "/articles/common-mistakes/"],
  ["/x-wing-swordfish-beyond-master-these-6-advanced-sudoku-techniques/", "/techniques/"],
  ["/contact", "/contact/"],
  ["/about", "/about/"],
  ["/feed/", "/articles/"],
  ["/category/sudoku-guides/", "/articles/"],
  ["/tag/hidden-pairs/", "/techniques/hidden-pair/"],
  ["/medium/", "/?difficulty=not-easy"],
  ["/difficulty/hard/", "/?difficulty=hard"],
  ["/page/*", "/articles/"],
  ["/tag/*", "/articles/"],
  ["/author/*", "/about/"],
]) {
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(redirects, new RegExp(`${escape(from)} ${escape(to)} 301`));
}
const redirectRules = redirects.split("\n").filter((line) => {
  const trimmed = line.trim();
  return trimmed && !trimmed.startsWith("#");
});
assert.equal(redirectRules.some((line) => /wp-admin|wp-login|xmlrpc/.test(line)), false);
const dynamicAt = redirectRules.findIndex((line) => line.includes("*") || line.includes(":"));
assert.equal(dynamicAt > 0 && redirectRules.slice(0, dynamicAt).every((line) => !line.includes("*") && !line.includes(":")), true);

function visibleWords(text) {
  const plain = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`]/g, " ");
  return plain.split(/\s+/).filter((token) => /[A-Za-z]/.test(token)).length;
}

const about = readFileSync(new URL("../about-page-content.md", import.meta.url), "utf8");
assert.match(about, /^Hi, I'm Ethan Ede\./);
assert.match(about, /Teddy, chief puzzle supervisor\. Never once helpful\./);
assert.match(about, /\/assets\/img\/teddy\/teddy\.svg/);
assert.match(about, /\/assets\/img\/teddy\/teddy-icon\.svg/);
assert.match(about, /red collar/);
assert.equal(about.includes("anime style"), false);
assert.equal(about.includes("teddy-256.webp"), false);
assert.match(about, /\/contact\//);
assert.match(about, /\/how-difficulty-works\//);
assert.match(about, /\/techniques\//);
assert.equal(about.includes("DRAFT"), false);
assert.equal(about.includes("—"), false);
assert.equal(about.includes("–"), false);
assert.match(
  about,
  /For years I solved on singles and stubbornness, and when a puzzle needed an X-wing or a coloring chain, I'd guess or give up\./
);
assert.match(about, /The honest difficulty grades came along for the ride\./);
assert.equal(about.includes("Some days I fly through a Hard"), false);
assert.ok(visibleWords(about) >= 450, `about words ${visibleWords(about)}`);

const HARD_LINK =
  '<a href="/articles/what-makes-a-sudoku-hard/">Here\'s what actually makes a Sudoku hard</a>';
const copy = `<div class="sudoku-copy"><p>Stuck? The hint won't just fill in a number. It points at the move, names it, and links to the <a href="/techniques/">technique</a> behind it. Curious why some puzzles feel harder than they should? ${HARD_LINK}.</p><p><a href="/?difficulty=easy">Easy</a></p></div>`;
assert.equal(copy.includes("—"), false);

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
assert.match(build, /"404.html"[\s\S]*?ads: false/);
assert.match(build, /\/assets\/img\/teddy\/teddy\.svg/);
assert.equal(build.includes("anime style"), false);
assert.equal(build.includes("teddy-256.webp"), false);
const teddy = readFileSync(new URL("../assets/img/teddy/teddy.svg", import.meta.url), "utf8");
const teddyIcon = readFileSync(new URL("../assets/img/teddy/teddy-icon.svg", import.meta.url), "utf8");
assert.equal(/#FFB08C/i.test(teddy + teddyIcon), false);
assert.equal(/#F4A0AE|#FFD24A|#E98A9C/i.test(teddy), false);
assert.match(teddyIcon, /#F4A0AE/i);
assert.match(teddy, /#E5402A/i);
assert.match(teddyIcon, /#fbfaf8/i);
assert.match(teddy, /#1A1A1A/);
assert.match(teddyIcon, /#1A1A1A/);
assert.match(teddy, /#A06A42/i);
assert.match(teddy, /role="img"/);
assert.match(teddyIcon, /role="img"/);
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
  "/terms/",
  "/skills/",
  "/links/",
  "/how-difficulty-works/",
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

const grading = readFileSync(new URL("../how-difficulty-works-content.html", import.meta.url), "utf8");
assert.equal(grading.includes("—"), false);
assert.equal(grading.includes("–"), false);
const gradingWords = grading.replace(/<[^>]+>/g, " ").match(/[A-Za-z]+/g) || [];
assert.ok(gradingWords.length >= 600 && gradingWords.length <= 900, `grading words ${gradingWords.length}`);
const puzzleMatch = grading.match(/data-puzzle="(\d{81})"/);
assert.ok(puzzleMatch, "example board");
const cells = [...puzzleMatch[1]].map((digit) => Number(digit));
const context = { console, Math, performance };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(readFileSync(new URL("../assets/js/solver.js", import.meta.url), "utf8"), context);
const { grade, countSolutions } = context.SudokuSolver;
assert.equal(countSolutions(cells, 2), 1);
const graded = grade(cells);
assert.equal(graded.solved, true);
assert.equal(graded.corrupt, false);
assert.equal(graded.hardestName, "naked_pair");
assert.equal(graded.steps, 11);
assert.equal(graded.stalls, 1);
assert.equal(graded.bottlenecks, 8);
assert.equal(graded.clues, 25);
for (const figure of ["1,483", "495", "387", "314", "5.0", "8.9", "51 percent", "18 percent", "24 percent"]) {
  assert.equal(grading.includes(figure), true, figure);
}
assert.match(grading, /August 30, 2021 through March 2, 2024/);
assert.equal(grading.includes("January 2023"), false);
assert.match(build, /href="\/how-difficulty-works\/">How difficulty works<\/a>/);
assert.match(build, /href="\/terms\/">Terms<\/a>/);
const game = readFileSync(new URL("../src/game.html", import.meta.url), "utf8");
assert.match(game, /class="difficulty-help" href="\/how-difficulty-works\/"/);
assert.match(readFileSync(new URL("../home-copy.mjs", import.meta.url), "utf8"), /href: "\/how-difficulty-works\/"/);
const hiddenGrade = stripUnpublishedLinks(grading, new Set(["what-makes-a-sudoku-hard"]));
assert.equal(hiddenGrade.includes('href="/articles/what-makes-a-sudoku-hard/"'), false);
assert.match(stripUnpublishedLinks(grading, new Set()), /what-makes-a-sudoku-hard/);
assert.match(readFileSync(new URL("../src/_redirects", import.meta.url), "utf8"), /\/how-difficulty-works \/how-difficulty-works\/ 301/);

function proseWords(markdown) {
  let text = markdown.replace(/\r\n/g, "\n");
  text = text.replace(/^# .+$/m, "");
  text = text.replace(/\*\*Meta Description:\*\*.*/i, "");
  text = text.replace(/\*\*Keywords:\*\*.*/i, "");
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  text = text.replace(/[#>*_`]/g, " ");
  return (text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g) || []).length;
}

function pipeBoard(body) {
  const cells = [];
  for (const line of body.replace(/\s+$/, "").split("\n")) {
    if (!line.trim() || line.startsWith("+")) continue;
    if (!line.startsWith("|")) return null;
    const groups = line.split("|").slice(1, -1);
    if (groups.length !== 3) return null;
    for (const group of groups) {
      const tokens = group.trim().split(/\s+/);
      if (tokens.length !== 3) return null;
      for (const token of tokens) {
        if (!/^[1-9.]$/.test(token)) return null;
        cells.push(token === "." ? 0 : Number(token));
      }
    }
  }
  return cells.length === 81 ? cells : null;
}

function exampleBoards(markdown) {
  const boards = [];
  for (const match of markdown.matchAll(/```[^\n]*\n([\s\S]*?)```/g)) {
    if (!match[1].includes("|")) continue;
    const cells = pipeBoard(match[1]);
    if (!cells) return null;
    boards.push(cells);
  }
  return boards;
}

function assertGuideArticle(file, minBoards) {
  const text = readFileSync(new URL(file, import.meta.url), "utf8");
  assert.equal(text.includes("\u2014"), false, `${file} em dash`);
  assert.equal(text.includes("\u2013"), false, `${file} en dash`);
  assert.equal(text.includes("&mdash;"), false, file);
  assert.equal(text.includes("&ndash;"), false, file);
  const words = proseWords(text);
  assert.ok(words >= 1200, `${file} words ${words}`);
  const boards = exampleBoards(text);
  assert.ok(boards, `${file} has a pipe grid that did not parse`);
  assert.ok(boards.length >= minBoards, `${file} boards ${boards.length}`);
  boards.forEach((cells, index) => {
    assert.equal(cells.length, 81, `${file} board ${index + 1}`);
    assert.equal(countSolutions(cells, 2), 1, `${file} board ${index + 1} solutions`);
  });
  return text;
}

const beginners = assertGuideArticle("../articles/01-beginners-guide.md", 2);
assert.equal(beginners.includes("publishDate:"), false);
assert.match(beginners, /^# How to play Sudoku$/m);

const mistakes = assertGuideArticle("../articles/02-common-mistakes.md", 1);
assert.equal(mistakes.includes("publishDate:"), false);
assert.equal(mistakes.includes("Print this checklist"), false);
assert.match(mistakes, /^# 7 Common Sudoku Mistakes \(And How to Fix Them\)$/m);

const contact = readFileSync(new URL("../contact-page-content.html", import.meta.url), "utf8");
assert.equal(contact.includes("There is no account"), false);
assert.match(contact, /An account is optional/);
assert.match(contact, /6-digit code/);
assert.match(contact, /no password/i);
assert.match(contact, /id="contact-form"/);
assert.match(contact, /Bug reports are welcome/);
assert.match(contact, /Puzzle issues are welcome/);
assert.match(contact, /Technique questions are welcome/);
assert.match(contact, /not a promise/);
assert.equal(contact.includes("—"), false);
assert.equal(contact.includes("–"), false);
assert.ok(visibleWords(contact) >= 450, `contact words ${visibleWords(contact)}`);

const home = readFileSync(new URL("../home-copy.mjs", import.meta.url), "utf8");
assert.match(home, /title: "Free Sudoku, Graded by the Hardest Move \| SudokuSudoku"/);
assert.equal(home.includes("—"), false);
assert.match(build, /title: homeCopy\.title/);
assert.match(build, /canonical: `\$\{SITE\}\/skills\/`,\s*robots: "noindex, follow"/);
assert.equal(build.includes('"/skills"'), false);

const links = readFileSync(new URL("../links-page-content.html", import.meta.url), "utf8");
assert.equal(links.includes("—"), false);
assert.equal(links.includes("Ultimate"), false);
assert.equal(/[\u{1F300}-\u{1FAFF}]/u.test(links), false);
for (const dead of [
  "https://www.youtube.com/@BremSter\"",
  "https://twitter.com/CrackingTheCryptic",
  "https://apps.apple.com/app/sudoku-brain-game/id302397913",
  "https://play.google.com/store/apps/details?id=com.googlecode.andoku3",
  "https://apps.apple.com/app/sudokupad/id1631123763",
  "https://play.google.com/store/apps/details?id=com.sudokupad.app",
]) {
  assert.equal(links.includes(dead), false, dead);
}
assert.match(links, /https:\/\/www\.youtube\.com\/@BremSterPuzzles/);
assert.match(links, /https:\/\/x\.com\/crypticcracking/);
assert.match(links, /https:\/\/apps\.apple\.com\/us\/app\/svens-sudokupad\/id1570622073/);

const brain = readArticle("does-sudoku-keep-your-brain-sharp");
assert.equal(brain.includes("publishDate: 2026-11-11"), true);
assert.equal(brain.includes("lumosity-pay-2-million-settle-ftc-deceptive-advertising-charges-its-brain-training-program"), false);
assert.match(brain, /132-3212-lumos-labs-inc-lumosity-mobile-online-cognitive-game/);
assert.equal(brain.includes("—"), false);

const terms = readFileSync(new URL("../terms-of-use-content.html", import.meta.url), "utf8");
const termsWords = terms.replace(/<[^>]+>/g, " ").match(/[A-Za-z]+/g) || [];
assert.equal(terms.includes("—"), false);
assert.equal(terms.includes("–"), false);
assert.ok(termsWords.length >= 400 && termsWords.length <= 600, `terms words ${termsWords.length}`);
assert.match(terms, /optional account/i);
assert.match(terms, /6-digit code/);
assert.match(terms, /no password/i);
assert.match(terms, /under 13/);
assert.match(terms, /href="\/privacy-policy\/"/);
assert.match(build, /href="\/terms\/">Terms<\/a>/);
assert.match(build, /"terms\/index.html"[\s\S]{0,600}ads:\s*false/);
assert.match(build, /"terms\/index.html"[\s\S]{0,700}analytics:\s*false/);
assert.match(build, /"terms\/index.html"[\s\S]{0,800}privacyChoices:\s*false/);
assert.match(redirects, /\/terms \/terms\/ 301/);

const nytRange = "August 30, 2021 through March 2, 2024";
const nytSources = {
  comparison: readFileSync(new URL("../articles/04-nyt-medium-vs-hard.md", import.meta.url), "utf8"),
  "what-makes": readArticle("what-makes-a-sudoku-hard"),
  ai: readArticle("why-ai-is-bad-at-sudoku"),
  generator: readFileSync(new URL("../assets/js/generator.js", import.meta.url), "utf8"),
  techniques: readFileSync(new URL("./technique-copy.mjs", import.meta.url), "utf8"),
};
for (const [label, text] of Object.entries(nytSources)) {
  assert.equal(text.includes(nytRange), true, label);
  assert.equal(text.includes("January 2023"), false, label);
  assert.equal(text.includes("Jan 2023"), false, label);
  assert.equal(text.includes("—"), false, `${label} em dash`);
}
assert.equal(nytSources["what-makes"].includes("publishDate: 2026-10-28"), true);
assert.equal(nytSources.ai.includes("publishDate: 2026-11-04"), true);

const order = readArticle("sudoku-techniques-in-order");
assert.equal(order.includes("\u2014"), false);
assert.equal(order.includes("\u2013"), false);
const orderBody = order.split("---").slice(2).join("---").replace(/<!--[\s\S]*?-->/g, "");
const orderWords = orderBody.trim().split(/\s+/).filter(Boolean);
assert.ok(orderWords.length >= 1000 && orderWords.length <= 1400, `technique order words ${orderWords.length}`);
const orderSummary = JSON.parse(
  readFileSync(new URL("../articles/data/technique-order/summary.json", import.meta.url), "utf8")
);
assert.equal(orderSummary.nyt.levels.hard.steps.pointing, 1795);
assert.equal(orderSummary.nyt.levels.medium.steps.pointing, 1211);
assert.equal(orderSummary.nyt.levels.hard.techniqueSteps, 2917);
assert.equal(orderSummary.nyt.levels.easy.singlePlacements, 21285);
assert.equal(orderSummary.generated.levels.expert.puzzles.xwing, 53);
assert.equal(orderSummary.generated.perLevel, 300);
for (const figure of ["1,795", "1,211", "2,917", "21,285", "played one on 53 of them"]) {
  assert.equal(order.includes(figure), true, figure);
}
assert.match(order, /articles\/data\/technique-order\/analyze\.mjs/);
assert.match(order, /href="\/articles\/nyt-medium-vs-hard\/"|\]\(\/articles\/nyt-medium-vs-hard\/\)/);
assert.match(build, /articles\/sudoku-techniques-in-order\.md/);

console.log("article publish tests passed");
