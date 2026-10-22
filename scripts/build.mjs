import { createHash } from "node:crypto";
import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import * as sass from "sass";
import { captureExamples } from "./capture-examples.mjs";
import { techniques } from "./technique-copy.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const year = new Date().getFullYear();
const SITE = "https://sudokusudoku.com";
const sitemap = [];

const articles = [
  { file: "articles/01-beginners-guide.md", slug: "beginners-guide" },
  { file: "articles/02-common-mistakes.md", slug: "common-mistakes" },
  { file: "articles/03-advanced-techniques.md", slug: "advanced-techniques" },
  { file: "articles/04-nyt-medium-vs-hard.md", slug: "nyt-medium-vs-hard" },
];

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function write(relativePath, contents) {
  const target = join(dist, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function publish(relativePath, contents, path) {
  write(relativePath, contents);
  if (path) sitemap.push(path);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function layout({ title, description, main, game = false, canonical, jsonLd, demo = false }) {
  const fontAwesome = "";
  const descriptionTag = description
    ? `<meta name="description" content="${escapeHtml(description)}">`
    : "";
  const canonicalTag = canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : "";
  const jsonLdTag = jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f7f4ef">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#141218">
  <meta name="color-scheme" content="light dark">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Sudoku">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>${escapeHtml(title)}</title>
  ${descriptionTag}
  ${canonicalTag}
  ${jsonLdTag}
  <script>
    try {
      var storedTheme = JSON.parse(localStorage.getItem("sudoku-settings") || "{}").theme || "system";
      var themeDark = storedTheme === "dark" || (storedTheme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.theme = themeDark ? "dark" : "light";
      if (matchMedia("(display-mode: standalone)").matches || navigator.standalone) {
        document.documentElement.classList.add("is-standalone");
      }
    } catch (e) {}
  </script>
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/style.css">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/icons/icon-192.png" type="image/png" sizes="192x192">
  <link rel="icon" href="/icons/icon-512.png" type="image/png" sizes="512x512">
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-TFNKPH6DNY"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-TFNKPH6DNY');
  </script>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9345046210950956" crossorigin="anonymous"></script>
</head>
<body>
<div id="app-update" class="app-update" hidden>
  <p>A new version is ready.</p>
  <button type="button" id="app-update-go">Refresh</button>
</div>
<header class="site-header">
  <div class="container">
    <nav class="main-navigation" role="navigation">
      <div class="nav-brand">
        <a href="/" class="site-logo">Sudoku</a>
      </div>
      <button class="mobile-menu-toggle" aria-label="Toggle menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div class="nav-menu">
        <ul class="nav-primary">
          <li class="menu-item has-dropdown">
            <a href="/" class="dropdown-toggle">Play Sudoku <span class="arrow">▼</span></a>
            <ul class="dropdown-menu">
              <li><a href="/?daily">Daily</a></li>
              <li><a href="/?difficulty=quick">Quick</a></li>
              <li><a href="/?difficulty=easy">Easy</a></li>
              <li><a href="/?difficulty=not-easy">Not Easy</a></li>
              <li><a href="/?difficulty=hard">Hard</a></li>
              <li><a href="/?difficulty=expert">Expert</a></li>
              <li><a href="/?difficulty=mental">Mental</a></li>
            </ul>
          </li>
          <li class="menu-item">
            <a href="/techniques">Techniques</a>
          </li>
          <li class="menu-item">
            <a href="/links">Links</a>
          </li>
          <li class="menu-item">
            <a href="/articles">Articles</a>
          </li>
          <li class="menu-item">
            <a href="/about">About</a>
          </li>
        </ul>
      </div>
    </nav>
  </div>
</header>
${fontAwesome}
${main}
<footer class="site-footer">
  <div class="container">
    <nav class="footer-nav">
      <ul class="footer-links">
        <li><a href="/about">About</a></li>
        <li><a href="/techniques">Techniques</a></li>
        <li><a href="/articles">Articles</a></li>
        <li><a href="/links">Links</a></li>
        <li><a href="/contact">Contact</a></li>
        <li><a href="/privacy-policy">Privacy Policy</a></li>
      </ul>
    </nav>
    <p class="copyright">&copy; ${year} SudokuSudoku. All rights reserved.</p>
  </div>
</footer>
${game ? '<script src="/assets/js/solver.js"></script>\n<script src="/assets/js/pools.js"></script>\n<script src="/assets/js/generator.js"></script>' : ""}
<script src="/assets/js/sudoku.js"></script>
${demo ? '<script src="/assets/js/technique-demo.js"></script>' : ""}
</body>
</html>
`;
}

function standardPage(title, bodyHtml, description, path) {
  return layout({
    title: `${title} - Sudoku Sudoku Online`,
    description,
    canonical: path ? `${SITE}${path}` : "",
    main: `<main class="standard-page">
  <div class="container">
    <article class="page-content">
      <header class="page-header">
        <h1 class="page-title">${escapeHtml(title)}</h1>
      </header>
      <div class="page-body">
        ${bodyHtml}
      </div>
    </article>
  </div>
</main>`,
  });
}

function parseArticle(markdown) {
  let content = markdown.replace(/\r\n/g, "\n");
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "Article";
  if (titleMatch) content = content.replace(/^# .+$/m, "");

  const excerptMatch = content.match(/\*\*Meta Description:\*\*\s*(.+)/i);
  const excerpt = excerptMatch ? excerptMatch[1].trim() : "";
  const keywordsMatch = content.match(/\*\*Keywords:\*\*\s*(.+)/i);
  const tags = keywordsMatch
    ? keywordsMatch[1].split(",").map((tag) => tag.trim()).filter(Boolean)
    : [];

  content = content.replace(/\*\*Meta Description:\*\*.*/i, "");
  content = content.replace(/\*\*Keywords:\*\*.*/i, "");
  content = content.replace(/^---+$/gm, "");

  const imageMatch = content.match(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/);
  let image = null;
  if (imageMatch) {
    image = {
      alt: imageMatch[1],
      src: imageMatch[2],
      title: imageMatch[3] || "",
    };
    content = content.replace(imageMatch[0], "");
  }

  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));

  return {
    title,
    excerpt,
    tags,
    image,
    minutes,
    html: marked.parse(content.trim()),
  };
}

function imageTag(image) {
  if (!image) return "";
  const title = image.title ? ` title="${escapeHtml(image.title)}"` : "";
  return `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}"${title}>`;
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const compiled = sass.compile(join(root, "assets/scss/main.scss"), {
  style: "compressed",
});
write("assets/css/style.css", compiled.css);
write("assets/js/solver.js", read("assets/js/solver.js"));
write("assets/js/pools.js", read("assets/js/pools.js"));
write("assets/js/generator.js", read("assets/js/generator.js"));
write("assets/js/sudoku.js", read("assets/js/sudoku.js"));
write("assets/js/technique-demo.js", read("assets/js/technique-demo.js"));
write("ads.txt", read("ads.txt").trim() + "\n");
write("_redirects", read("src/_redirects"));
copyFileSync(join(root, "src/favicon.ico"), join(dist, "favicon.ico"));
copyFileSync(join(root, "src/favicon.svg"), join(dist, "favicon.svg"));

const parsedArticles = articles.map((article) => ({
  ...article,
  ...parseArticle(read(article.file)),
  href: `/articles/${article.slug}`,
}));

publish(
  "index.html",
  layout({
    title: "SudokuSudoku",
    description:
      "Every puzzle on SudokuSudoku is graded by its hardest move, not the number of clues. Hints name the move and teach the technique behind it. Just play.",
    canonical: `${SITE}/`,
    game: true,
    main: read("src/game.html").trim(),
  }),
  "/"
);

write(
  "404.html",
  layout({
    title: "Page not found - Sudoku Sudoku Online",
    description: "That page does not exist.",
    main: `<main class="standard-page">
  <div class="container">
    <article class="page-content">
      <header class="page-header">
        <h1 class="page-title">Page not found</h1>
      </header>
      <div class="page-body">
        <p>That page doesn't exist. The puzzle is still here.</p>
        <p><a href="/">Play Sudoku</a>, or browse the <a href="/articles">articles</a>.</p>
      </div>
    </article>
  </div>
</main>`,
  })
);

const aboutMarkdown = read("about-page-content.md")
  .replace(/^# .+$/m, "")
  .replace(/^---+$/gm, "")
  .trim();
publish(
  "about/index.html",
  standardPage("About", marked.parse(aboutMarkdown), "About Sudoku Sudoku Online.", "/about"),
  "/about"
);

publish(
  "links/index.html",
  standardPage(
    "Links",
    read("links-page-content.html").trim(),
    "Sudoku websites, tutorials, apps, and communities.",
    "/links"
  ),
  "/links"
);

publish(
  "contact/index.html",
  standardPage(
    "Contact",
    read("contact-page-content.html").trim(),
    "Contact Sudoku Sudoku Online.",
    "/contact"
  ),
  "/contact"
);

publish(
  "privacy-policy/index.html",
  standardPage(
    "Privacy Policy",
    read("privacy-policy-content.html").trim(),
    "Privacy policy for Sudoku Sudoku Online.",
    "/privacy-policy"
  ),
  "/privacy-policy"
);

const cards = parsedArticles
  .map((article) => {
    const thumb = article.image
      ? `<div class="article-thumbnail"><a href="${article.href}">${imageTag(article.image)}</a></div>`
      : "";
    return `<article class="article-card">
      ${thumb}
      <div class="article-content">
        <div class="article-meta">
          <span class="article-reading-time">${article.minutes} min read</span>
        </div>
        <h2 class="article-title"><a href="${article.href}">${escapeHtml(article.title)}</a></h2>
        <div class="article-excerpt"><p>${escapeHtml(article.excerpt)}</p></div>
        <a href="${article.href}" class="read-more">Read Full Article →</a>
      </div>
    </article>`;
  })
  .join("\n");

publish(
  "articles/index.html",
  layout({
    title: "Sudoku Articles & Guides - Sudoku Sudoku Online",
    description: "Learn strategies, tips, and everything you need to master Sudoku.",
    canonical: `${SITE}/articles`,
    main: `<main id="articles" class="articles-page">
  <div class="container">
    <header class="page-header">
      <h1>Sudoku Articles &amp; Guides</h1>
      <p class="page-description">Learn strategies, tips, and everything you need to master Sudoku</p>
    </header>
    <div class="articles-grid">
      ${cards}
    </div>
  </div>
</main>`,
  }),
  "/articles"
);

parsedArticles.forEach((article, index) => {
  const previous = parsedArticles[index - 1];
  const next = parsedArticles[index + 1];
  const tags = article.tags
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join(" ");
  const navigation = [
    previous
      ? `<a href="${previous.href}" class="nav-prev"><span class="nav-label">← Previous Article</span><span class="nav-title">${escapeHtml(previous.title)}</span></a>`
      : "",
    next
      ? `<a href="${next.href}" class="nav-next"><span class="nav-label">Next Article →</span><span class="nav-title">${escapeHtml(next.title)}</span></a>`
      : "",
  ].join("");
  const featured = article.image
    ? `<div class="article-featured-image">${imageTag(article.image)}</div>`
    : "";

  const articleLd =
    article.slug === "nyt-medium-vs-hard"
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.excerpt,
          mainEntityOfPage: `${SITE}${article.href}`,
          datePublished: "2026-10-21",
          dateModified: "2026-10-21",
          author: { "@type": "Organization", name: "Sudoku Sudoku Online" },
          publisher: { "@type": "Organization", name: "Sudoku Sudoku Online" },
        }
      : null;

  publish(
    `articles/${article.slug}/index.html`,
    layout({
      title: `${article.title} - Sudoku Sudoku Online`,
      description: article.excerpt,
      canonical: `${SITE}${article.href}`,
      jsonLd: articleLd,
      main: `<main id="article-single" class="article-single-page">
  <article class="article-content">
    <div class="container">
      <header class="article-header">
        <div class="article-meta">
          <span class="article-reading-time">${article.minutes} min read</span>
        </div>
        <h1 class="article-title">${escapeHtml(article.title)}</h1>
        ${featured}
      </header>
      <div class="article-body">
        ${article.html}
      </div>
      <footer class="article-footer">
        <div class="article-tags"><span class="tags-label">Tags:</span> ${tags}</div>
        <div class="article-navigation">${navigation}</div>
        <div class="back-to-articles"><a href="/articles" class="cta-button">← Back to All Articles</a></div>
      </footer>
    </div>
  </article>
</main>`,
    }),
    article.href
  );
});

const examples = captureExamples(root);
const bySlug = new Map(techniques.map((technique) => [technique.slug, technique]));

function pencilHtml(digits) {
  const on = new Set(digits || []);
  let html = `<span class="marks" aria-hidden="true">`;
  for (let number = 1; number <= 9; number += 1) {
    const classes = on.has(number) ? ` class="on hint-note"` : "";
    html += `<span${classes}>${number}</span>`;
  }
  html += `</span>`;
  return html;
}

function exampleBoard(example) {
  const pattern = new Set(example.step.pattern || []);
  let html = `<div class="sudoku-grid technique-board" id="technique-board" role="grid" aria-label="Example board">`;
  for (let row = 0; row < 9; row += 1) {
    html += `<div class="grid-row" role="row">`;
    for (let col = 0; col < 9; col += 1) {
      const index = row * 9 + col;
      const value = example.board[index];
      const classes = ["cell"];
      if (example.given[index]) classes.push("given");
      else if (value) classes.push("user");
      if (pattern.has(index)) classes.push("hint-pattern");
      if ((example.step.region || []).includes(index)) classes.push("hint-region");
      if (col === 2 || col === 5) classes.push("border-right");
      if (row === 2 || row === 5) classes.push("border-bottom");
      const inner = value ? String(value) : pencilHtml(example.pencil[index]);
      html += `<div class="${classes.join(" ")}" role="gridcell" data-index="${index}">${inner}</div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}

function resultSentence(step) {
  if (!step.place) return "Those candidates are eliminated.";
  const row = Math.floor(step.place.index / 9) + 1;
  const col = (step.place.index % 9) + 1;
  return `Place ${step.place.digit} in row ${row}, column ${col}.`;
}

const indexItems = techniques
  .map((technique) => {
    return `<li>
      <a href="/techniques/${technique.slug}">${escapeHtml(technique.name)}</a>
      <span>${escapeHtml(technique.level)}. ${escapeHtml(technique.nyt)}</span>
    </li>`;
  })
  .join("\n");

publish(
  "techniques/index.html",
  layout({
    title: "Sudoku techniques - Sudoku Sudoku Online",
    description:
      "Sudoku techniques from naked singles to XY-chains, each with a plain explanation and a puzzle state from this site's solver.",
    canonical: `${SITE}/techniques`,
    main: `<main class="standard-page technique-page">
  <div class="container">
    <article class="page-content">
      <header class="page-header">
        <h1 class="page-title">Techniques</h1>
      </header>
      <div class="page-body">
        <p>These are the steps the solver on this site actually uses, easiest first. Each one has a board taken from a real solve, not a diagram drawn by hand. The level named on the row is where that step first becomes necessary.</p>
        <p>The New York Times labels overlap in a way these levels don't. That measurement is written up in <a href="/articles/nyt-medium-vs-hard">why Medium sometimes feels harder than Hard</a>.</p>
        <ol class="technique-index">
          ${indexItems}
        </ol>
      </div>
    </article>
  </div>
</main>`,
  }),
  "/techniques"
);

techniques.forEach((technique) => {
  const example = examples[technique.slug];
  const related = technique.related
    .map((slug) => {
      const other = bySlug.get(slug);
      return `<a href="/techniques/${slug}">${escapeHtml(other.name)}</a>`;
    })
    .join("");
  const path = `/techniques/${technique.slug}`;
  const howto = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to spot ${technique.name} in Sudoku`,
    description: technique.description,
    step: [
      { "@type": "HowToStep", name: "See the pattern", text: example.step.look },
      { "@type": "HowToStep", name: "What gets eliminated", text: example.step.explain },
      { "@type": "HowToStep", name: "The result", text: resultSentence(example.step) },
    ],
  };
  const paragraphs = technique.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n");
  publish(
    `techniques/${technique.slug}/index.html`,
    layout({
      title: `${technique.name} - Sudoku technique`,
      description: technique.description,
      canonical: `${SITE}${path}`,
      jsonLd: howto,
      demo: true,
      main: `<main class="standard-page technique-page">
  <div class="container">
    <article class="page-content">
      <header class="page-header">
        <p class="technique-level"><a href="/techniques">Techniques</a> · ${escapeHtml(technique.level)}</p>
        <h1 class="page-title">${escapeHtml(technique.name)}</h1>
      </header>
      <div class="page-body">
        ${paragraphs}
        <h2>When it shows up</h2>
        <p>${escapeHtml(technique.when)}</p>
        <p>${escapeHtml(technique.nyt)}</p>
        <h2>See it on a real puzzle</h2>
        <p>The marks are the candidates left when this is the next step in the solve. Step through it: the pattern, what leaves, and what that forces.</p>
        <p class="technique-step-label" id="technique-step-label">See the pattern</p>
        <p id="technique-step-text">${escapeHtml(example.step.look)}</p>
        ${exampleBoard(example)}
        <div class="technique-controls">
          <button type="button" id="technique-prev" disabled>Previous</button>
          <button type="button" id="technique-next">Next</button>
        </div>
        <p><a class="play-technique" href="/?difficulty=${technique.play}">Play a puzzle that needs this</a></p>
        <h2>Related</h2>
        <p class="related-techniques">${related}</p>
      </div>
    </article>
  </div>
</main>
<script type="application/json" id="technique-example">${JSON.stringify({
        given: example.given,
        board: example.board,
        pencil: example.pencil,
        step: example.step,
      }).replace(/</g, "\\u003c")}</script>`,
    }),
    path
  );
});

const today = new Date().toISOString().slice(0, 10);
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap
  .map(
    (path) => `  <url><loc>${SITE}${path === "/" ? "/" : path}</loc><lastmod>${today}</lastmod></url>`
  )
  .join("\n")}
</urlset>
`
);
write(
  "robots.txt",
  `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`
);

cpSync(join(root, "src/icons"), join(dist, "icons"), { recursive: true });

const iconSizes = [48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512];
const manifestIcons = [
  ...iconSizes.map((size) => ({
    src: `/icons/icon-${size}.png`,
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose: "any",
  })),
  ...[192, 512].map((size) => ({
    src: `/icons/maskable-${size}.png`,
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose: "maskable",
  })),
];
write(
  "manifest.webmanifest",
  JSON.stringify(
    {
      id: "/",
      name: "Sudoku Sudoku",
      short_name: "Sudoku",
      description: "Play Sudoku offline. Quick through mental, plus a daily puzzle.",
      lang: "en",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#f7f4ef",
      theme_color: "#f7f4ef",
      categories: ["games"],
      icons: manifestIcons,
    },
    null,
    2
  ) + "\n"
);
write(
  "offline.html",
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f7f4ef">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#141218">
  <title>Offline - Sudoku</title>
  <link rel="stylesheet" href="/assets/css/style.css">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
</head>
<body>
<main class="standard-page">
  <div class="container">
    <article class="page-content">
      <header class="page-header">
        <h1 class="page-title">You're offline</h1>
      </header>
      <div class="page-body">
        <p>The puzzle is saved on this device. Open Sudoku to keep playing, including a new game or today's daily.</p>
        <p><a href="/">Play Sudoku</a></p>
      </div>
    </article>
  </div>
</main>
</body>
</html>
`
);
write(
  "_headers",
  `/sw.js
  Cache-Control: no-cache
/manifest.webmanifest
  Content-Type: application/manifest+json
  Cache-Control: no-cache
`
);

const shellPaths = [
  "index.html",
  "offline.html",
  "manifest.webmanifest",
  "favicon.ico",
  "favicon.svg",
  "assets/css/style.css",
  "assets/js/solver.js",
  "assets/js/pools.js",
  "assets/js/generator.js",
  "assets/js/sudoku.js",
  ...iconSizes.map((size) => `icons/icon-${size}.png`),
  "icons/maskable-192.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png",
];
const versionHash = createHash("sha256");
shellPaths.forEach((relativePath) => {
  versionHash.update(relativePath);
  versionHash.update(readFileSync(join(dist, relativePath)));
});
versionHash.update(read("assets/js/sw.js"));
const version = versionHash.digest("hex").slice(0, 12);
const shellUrls = ["/", ...shellPaths.filter((relativePath) => relativePath !== "index.html").map((relativePath) => `/${relativePath}`)];
write(
  "sw.js",
  read("assets/js/sw.js")
    .replaceAll("__SUDOKU_PWA_VERSION__", version)
    .replace("__SUDOKU_PWA_SHELL__", JSON.stringify(shellUrls))
);

console.log(`Built ${dist}`);
console.log(`Technique examples: ${techniques.map((technique) => technique.slug).join(", ")}`);
