const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const AUTHOR_NAME = "Ethan Ede";
export const AUTHOR_URL = "https://sudokusudoku.com/about/";
export const AUTHOR_SAME_AS = "https://ethanede.com";

export function losAngelesToday(now = new Date(), override = process.env.SUDOKU_TODAY || "") {
  if (override) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(override)) {
      throw new Error(`SUDOKU_TODAY must be YYYY-MM-DD, got ${override}`);
    }
    return override;
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isPublished(publishDate, today) {
  if (!publishDate) return true;
  return publishDate <= today;
}

export function formatPublishDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!match) return "";
  const month = MONTHS[Number(match[2]) - 1];
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

export function parseFrontMatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return { data: {}, body: normalized };
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) return { data: {}, body: normalized };
  const data = {};
  for (const line of normalized.slice(4, end).split("\n")) {
    const match = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[match[1]] = value;
  }
  return { data, body: normalized.slice(end + 5) };
}

export function relatedSlugsFromRequires(markdown) {
  const comment = markdown.match(/<!--\s*REQUIRES:([\s\S]*?)-->/);
  if (!comment) return [];
  const slugs = [];
  for (const match of comment[1].matchAll(/\/articles\/([a-z0-9-]+)\/?/g)) {
    if (!slugs.includes(match[1])) slugs.push(match[1]);
  }
  return slugs;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function puzzleCells(body) {
  const lines = body.replace(/\s+$/, "").split("\n");
  if (!lines.length) return null;
  const cells = [];
  for (const line of lines) {
    if (line.startsWith("+")) continue;
    if (!line.startsWith("|")) return null;
    const groups = line.split("|").slice(1, -1);
    if (groups.length !== 3) return null;
    for (const group of groups) {
      const tokens = group.trim().split(/\s+/);
      if (tokens.length !== 3) return null;
      for (const token of tokens) {
        if (!/^[1-9.]$/.test(token)) return null;
        cells.push(token);
      }
    }
  }
  return cells.length === 81 ? cells : null;
}

export function renderPuzzleGrids(markdown) {
  return markdown.replace(/```[^\n]*\n([\s\S]*?)```/g, (full, body) => {
    const cells = puzzleCells(body);
    if (!cells) return full;
    const spans = cells
      .map((token) => {
        if (token === ".") return `<span class="puzzle-cell is-empty"></span>`;
        return `<span class="puzzle-cell">${escapeHtml(token)}</span>`;
      })
      .join("");
    return `<div class="puzzle-grid" aria-hidden="true">${spans}</div>`;
  });
}

export function stripHtmlComments(markdown) {
  return markdown.replace(/<!--[\s\S]*?-->/g, "");
}

export function prepareArticle(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const relatedSlugs = relatedSlugsFromRequires(normalized);
  const { data, body } = parseFrontMatter(normalized);
  const content = renderPuzzleGrids(stripHtmlComments(body));
  return { data, relatedSlugs, content };
}

export function stripUnpublishedLinks(html, unpublishedSlugs) {
  if (!unpublishedSlugs || unpublishedSlugs.size === 0) return html;
  return html.replace(/<a\b([^>]*\s)?href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g, (full, _before, href, _after, inner) => {
    const match = href.match(/^\/articles\/([a-z0-9-]+)\/?(?:#[^"]*)?$/);
    if (!match || !unpublishedSlugs.has(match[1])) return full;
    return inner;
  });
}

export function wrapTables(html) {
  return html.replace(/<table\b[\s\S]*?<\/table>/g, (table) => `<div class="table-scroll">${table}</div>`);
}

export function shortBio(authorMarkdown) {
  const match = authorMarkdown.match(/## Short bio[^\n]*\n+([\s\S]*?)(?=\n## |$)/);
  return match ? match[1].trim() : "";
}

export function personNode() {
  return {
    "@type": "Person",
    name: AUTHOR_NAME,
    url: AUTHOR_URL,
    sameAs: AUTHOR_SAME_AS,
  };
}

export function articleJsonLd({ title, description, url, publishDate }) {
  return {
    "@type": "Article",
    headline: title,
    description,
    mainEntityOfPage: url,
    datePublished: publishDate,
    dateModified: publishDate,
    author: personNode(),
    publisher: {
      "@type": "Organization",
      name: "SudokuSudoku",
      logo: {
        "@type": "ImageObject",
        url: "https://sudokusudoku.com/icons/icon-512.png",
      },
    },
  };
}
