// Document titles and meta descriptions. Home copy stays in home-copy.mjs.
// A title and a description are unique across the site, contain that page's
// search phrase, and do not use an em dash.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BRAND = "SudokuSudoku";
const EM_DASH = /—|&mdash;|&#8212;|&#x2014;/i;

export const TECHNIQUE_SEARCH = {
  "naked-single": "Naked Single",
  "hidden-single": "Hidden Single",
  pointing: "Pointing",
  claiming: "Claiming",
  "naked-pair": "Naked Pair",
  "hidden-pair": "Hidden Pair",
  "naked-triple": "Naked Triple",
  "hidden-triple": "Hidden Triple",
  quads: "Quads",
  "x-wing": "X-Wing",
  swordfish: "Swordfish",
  skyscraper: "Skyscraper",
  "two-string-kite": "Two-String Kite",
  "xy-wing": "XY-Wing",
  "xyz-wing": "XYZ-Wing",
  coloring: "Simple Coloring",
  "xy-chain": "XY-Chain",
};

const STATIC_PAGES = {
  "/about/": {
    title: "About SudokuSudoku | SudokuSudoku",
    description:
      "About SudokuSudoku. Ethan Ede builds websites and plays Sudoku almost every day. Puzzles are graded by the hardest move, and the hints teach that move.",
    term: "about sudokusudoku",
  },
  "/links/": {
    title: "Sudoku Links and Other Resources | SudokuSudoku",
    description:
      "Sudoku links to other sites, books, and communities, listed separately from the puzzles on SudokuSudoku.",
    term: "sudoku links",
  },
  "/contact/": {
    title: "Contact SudokuSudoku | SudokuSudoku",
    description:
      "Contact SudokuSudoku about a bug, a technique page, or the site. The form uses a spam check and does not show an email address.",
    term: "contact sudokusudoku",
  },
  "/privacy-policy/": {
    title: "SudokuSudoku Privacy Policy | SudokuSudoku",
    description:
      "SudokuSudoku privacy policy for on-device puzzle data, the optional email account, anonymous community stats, Google Analytics, AdSense consent, and the contact form.",
    term: "privacy policy",
  },
  "/terms/": {
    title: "SudokuSudoku Terms of Use | SudokuSudoku",
    description:
      "SudokuSudoku terms of use for a free browser Sudoku game with an optional email account, a contact form, and ads.",
    term: "terms of use",
  },
  "/articles/": {
    title: "Sudoku Articles on How to Play and Difficulty | SudokuSudoku",
    description:
      "Sudoku articles on how to play, what makes a puzzle hard, and notes from building SudokuSudoku.",
    term: "sudoku articles",
  },
  "/techniques/": {
    title: "Sudoku Techniques, From Singles to XY-Chains | SudokuSudoku",
    description:
      "Sudoku techniques from naked singles to XY-chains, each explained on a real board from this site's solver.",
    term: "sudoku techniques",
  },
  "/stats/": {
    title: "Sudoku Stats by Difficulty | SudokuSudoku",
    description:
      "Sudoku stats for your hint record, plus anonymous community stats by difficulty: median solve time, average hints, and the techniques players need hints for.",
    term: "sudoku stats",
  },
  "/skills/": {
    title: "Sudoku Skill Ladder | SudokuSudoku",
    description:
      "Sudoku skill ladder stored on this device: what you have solved, what to train next, and badges from finished puzzles.",
    term: "skill ladder",
  },
  "/404.html": {
    title: "Page not found | SudokuSudoku",
    description: "Page not found. That URL is not on SudokuSudoku.",
    term: "page not found",
  },
  "/offline.html": {
    title: "Offline | SudokuSudoku",
    description: "SudokuSudoku is offline. The puzzle on this device still opens.",
    term: "offline",
  },
};

// Descriptions that did not already contain the search phrase. The visible
// article text is unchanged. These are the meta descriptions only.
const ARTICLE_DESCRIPTION = {
  "beginners-guide":
    "How to play Sudoku: the rules, a 4x4 puzzle with one solution, and the same checks you use on the full 9x9 board.",
  "what-makes-a-sudoku-hard":
    "What actually makes a Sudoku hard: a 68-clue puzzle that needs an XY-wing, a 17-clue one you can finish with singles, and 2,280 graded puzzles. Clue count barely predicts difficulty.",
  "history-of-sudoku":
    "Where Sudoku came from: Euler, 1890s Paris, a 1979 Dell magazine, Nikoli, and a Hong Kong judge. It is not Japanese at heart, and it is not new.",
  "why-ai-is-bad-at-sudoku":
    "Why AI is surprisingly bad at Sudoku: chatbots that write essays often fail a puzzle a child can finish, and a short program never misses.",
  "does-sudoku-keep-your-brain-sharp":
    "Does Sudoku keep your brain sharp? An honest look at the research on puzzles and brain health: what the big studies found, what they cannot prove, and what I take from it.",
  "why-being-stuck-is-good-for-you":
    "Why being stuck on a Sudoku is good for you. Learning science says those stuck moments are where you actually improve, and that shaped the hints and the skill ladder.",
  "fewest-and-most-sudoku-clues":
    "The fewest and most clues a Sudoku can have: 17 is the proven minimum for one answer, 77 clues can still leave two answers, and 40 is the record for a puzzle with no spare clue.",
};

const ARTICLE_TERM = {
  "beginners-guide": "how to play sudoku",
  "common-mistakes": "sudoku mistakes",
  "nyt-medium-vs-hard": "nyt medium",
  "what-makes-a-sudoku-hard": "makes a sudoku hard",
  "history-of-sudoku": "where sudoku came from",
  "sudoku-variants": "sudoku variants",
  "why-ai-is-bad-at-sudoku": "bad at sudoku",
  "does-sudoku-keep-your-brain-sharp": "brain sharp",
  "why-being-stuck-is-good-for-you": "stuck on a sudoku",
  "fewest-and-most-sudoku-clues": "fewest and most clues",
};

export function withBrand(title) {
  const text = String(title || "").trim();
  if (text.endsWith(`| ${BRAND}`)) return text;
  return `${text} | ${BRAND}`;
}

export function decodeHtml(value) {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&mdash;", "—")
    .replaceAll("&#8212;", "—")
    .replaceAll("&#x2014;", "—");
}

export function hasEmDash(value) {
  return EM_DASH.test(String(value)) || EM_DASH.test(decodeHtml(value));
}

export function staticMeta(path) {
  const page = STATIC_PAGES[path];
  if (!page) throw new Error(`No search title for ${path}`);
  return { path, ...page };
}

export function homeMeta(home) {
  return {
    path: "/",
    title: home.title,
    description: home.description,
    term: home.term,
  };
}

export function techniqueMeta(technique) {
  const search = TECHNIQUE_SEARCH[technique.slug];
  if (!search) throw new Error(`No search name for ${technique.slug}`);
  return {
    path: `/techniques/${technique.slug}/`,
    title: `${search} Sudoku Technique, Explained on Real Boards | ${BRAND}`,
    description: technique.description,
    term: search.toLowerCase() === "quads" ? "quad" : search.toLowerCase(),
  };
}

export function articleMeta(article) {
  const term = ARTICLE_TERM[article.slug];
  if (!term) throw new Error(`No search phrase for article ${article.slug}`);
  return {
    path: `/articles/${article.slug}/`,
    title: withBrand(article.title),
    description: ARTICLE_DESCRIPTION[article.slug] || article.excerpt,
    term,
  };
}

export function catalogPages({ home, techniques, articles }) {
  return [
    homeMeta(home),
    ...Object.keys(STATIC_PAGES).map((path) => staticMeta(path)),
    ...techniques.map((technique) => techniqueMeta(technique)),
    ...articles.map((article) => articleMeta(article)),
  ];
}

function fold(value) {
  return decodeHtml(value).toLowerCase().replace(/\s+/g, " ").trim();
}

export function assertUniqueMeta(pages) {
  const titles = new Map();
  const descriptions = new Map();
  for (const page of pages) {
    const title = fold(page.title);
    const description = fold(page.description);
    const where = page.path || page.file || "page";
    if (!title) throw new Error(`${where} is missing a title`);
    if (!description) throw new Error(`${where} is missing a meta description`);
    if (hasEmDash(page.title)) throw new Error(`${where} title has an em dash`);
    if (hasEmDash(page.description)) throw new Error(`${where} description has an em dash`);
    if (titles.has(title)) {
      throw new Error(`Duplicate title on ${where} and ${titles.get(title)}: ${page.title}`);
    }
    if (descriptions.has(description)) {
      throw new Error(`Duplicate description on ${where} and ${descriptions.get(description)}`);
    }
    titles.set(title, where);
    descriptions.set(description, where);
  }
}

export function assertSearchTerms(pages) {
  for (const page of pages) {
    const where = page.path || "page";
    const term = fold(page.term);
    if (!term) throw new Error(`${where} is missing a search phrase`);
    if (!fold(page.title).includes(term)) throw new Error(`${where} title is missing "${page.term}"`);
    if (!fold(page.description).includes(term)) {
      throw new Error(`${where} description is missing "${page.term}"`);
    }
  }
}

export function readHtmlMeta(distDir) {
  const pages = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".html")) continue;
      const html = readFileSync(full, "utf8");
      const title = html.match(/<title>([^<]*)<\/title>/);
      const description = html.match(/<meta name="description" content="([^"]*)">/);
      const path = full.slice(distDir.length).split("\\").join("/");
      pages.push({
        path: path.endsWith("/index.html") ? path.slice(0, -"index.html".length) || "/" : path,
        file: path,
        title: title ? title[1] : "",
        description: description ? description[1] : "",
      });
    }
  }
  walk(distDir);
  return pages;
}

export function assertBuiltPages(distDir, catalog) {
  const built = readHtmlMeta(distDir);
  assertUniqueMeta(built);
  const titles = new Set(catalog.map((page) => fold(page.title)));
  for (const page of built) {
    if (!titles.has(fold(page.title))) {
      throw new Error(`Built ${page.path} title is not in the catalog: ${page.title}`);
    }
  }
}

export function assertSiteMeta({ dist, home, techniques, articles }) {
  const catalog = catalogPages({ home, techniques, articles });
  assertUniqueMeta(catalog);
  assertSearchTerms(catalog);
  if (dist) assertBuiltPages(dist, catalog);
}
