import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import * as sass from "sass";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const year = new Date().getFullYear();

const articles = [
  { file: "articles/01-beginners-guide.md", slug: "beginners-guide" },
  { file: "articles/02-common-mistakes.md", slug: "common-mistakes" },
  { file: "articles/03-advanced-techniques.md", slug: "advanced-techniques" },
];

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function write(relativePath, contents) {
  const target = join(dist, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function layout({ title, description, main, game = false }) {
  const fontAwesome = game
    ? '<script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/js/all.min.js" crossorigin="anonymous"></script>'
    : "";
  const descriptionTag = description
    ? `<meta name="description" content="${escapeHtml(description)}">`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${descriptionTag}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/style.css">
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
              <li><a href="/?difficulty=quick">Quick</a></li>
              <li><a href="/?difficulty=easy">Easy</a></li>
              <li><a href="/?difficulty=not-easy">Not Easy</a></li>
              <li><a href="/?difficulty=hard">Hard</a></li>
              <li><a href="/?difficulty=expert">Expert</a></li>
              <li><a href="/?difficulty=mental">Mental</a></li>
            </ul>
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
        <li><a href="/articles">Articles</a></li>
        <li><a href="/links">Links</a></li>
        <li><a href="/contact">Contact</a></li>
        <li><a href="/privacy-policy">Privacy Policy</a></li>
      </ul>
    </nav>
    <p class="copyright">&copy; ${year} Sudoku Online. All rights reserved.</p>
  </div>
</footer>
<script src="/assets/js/sudoku.js"></script>
</body>
</html>
`;
}

function standardPage(title, bodyHtml, description) {
  return layout({
    title: `${title} - Sudoku Sudoku Online`,
    description,
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
write("assets/js/sudoku.js", read("assets/js/sudoku.js"));
write("ads.txt", read("ads.txt").trim() + "\n");
write("_redirects", read("src/_redirects"));

const parsedArticles = articles.map((article) => ({
  ...article,
  ...parseArticle(read(article.file)),
  href: `/articles/${article.slug}`,
}));

write(
  "index.html",
  layout({
    title: "Sudoku Sudoku Online",
    description:
      "Play free Sudoku online. Quick, easy, hard, expert, and mental puzzles in the browser.",
    game: true,
    main: read("src/game.html").trim(),
  })
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
write(
  "about/index.html",
  standardPage("About", marked.parse(aboutMarkdown), "About Sudoku Sudoku Online.")
);

write(
  "links/index.html",
  standardPage(
    "Links",
    read("links-page-content.html").trim(),
    "Sudoku websites, tutorials, apps, and communities."
  )
);

write(
  "contact/index.html",
  standardPage(
    "Contact",
    read("contact-page-content.html").trim(),
    "Contact Sudoku Sudoku Online."
  )
);

write(
  "privacy-policy/index.html",
  standardPage(
    "Privacy Policy",
    read("privacy-policy-content.html").trim(),
    "Privacy policy for Sudoku Sudoku Online."
  )
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

write(
  "articles/index.html",
  layout({
    title: "Sudoku Articles & Guides - Sudoku Sudoku Online",
    description: "Learn strategies, tips, and everything you need to master Sudoku.",
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
  })
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

  write(
    `articles/${article.slug}/index.html`,
    layout({
      title: `${article.title} - Sudoku Sudoku Online`,
      description: article.excerpt,
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
    })
  );
});

console.log(`Built ${dist}`);
