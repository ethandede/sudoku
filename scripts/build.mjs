import { createHash } from "node:crypto";
import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import * as sass from "sass";
import { assetVersion, versionFontUrls, withVersion } from "./asset-version.mjs";
import {
  AUTHOR_NAME,
  articleJsonLd,
  formatPublishDate,
  gateHomepageCopy,
  isPublished,
  losAngelesToday,
  personNode,
  prepareArticle,
  shortBio,
  stripUnpublishedLinks,
  wrapTables,
} from "./articles.mjs";
import { captureExamples } from "./capture-examples.mjs";
import { techniques } from "./technique-copy.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const year = new Date().getFullYear();
const SITE = "https://sudokusudoku.com";
const ASSET_VERSION = assetVersion(root);
const asset = (url) => withVersion(url, ASSET_VERSION);
const STATIC_ASSET = /\.(?:js|css|woff2|png|svg|ico)$/;
const sitemap = [];

const articles = [
  { file: "articles/01-beginners-guide.md", slug: "beginners-guide" },
  { file: "articles/02-common-mistakes.md", slug: "common-mistakes" },
  { file: "articles/04-nyt-medium-vs-hard.md", slug: "nyt-medium-vs-hard" },
  { file: "articles/what-makes-a-sudoku-hard.md", slug: "what-makes-a-sudoku-hard" },
  { file: "articles/history-of-sudoku.md", slug: "history-of-sudoku" },
  { file: "articles/sudoku-variants.md", slug: "sudoku-variants" },
  { file: "articles/why-ai-is-bad-at-sudoku.md", slug: "why-ai-is-bad-at-sudoku" },
  { file: "articles/does-sudoku-keep-your-brain-sharp.md", slug: "does-sudoku-keep-your-brain-sharp" },
  { file: "articles/why-being-stuck-is-good-for-you.md", slug: "why-being-stuck-is-good-for-you" },
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
  if (path) sitemap.push(withSlash(path));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const CONSENT_REGIONS = ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IS","IE","IT","LV","LI","LT","LU","MT","NL","NO","PL","PT","RO","SK","SI","ES","SE","GB","CH"];

function withSlash(path) {
  if (!path || path === "/") return "/";
  if (path.endsWith(".html") || path.endsWith("/")) return path;
  return `${path}/`;
}

function structuredData(extra) {
  const graph = [
    {
      "@type": "WebSite",
      name: "SudokuSudoku",
      url: `${SITE}/`,
    },
    {
      "@type": "Organization",
      name: "SudokuSudoku",
      url: `${SITE}/`,
      logo: `${SITE}/icons/icon-512.png`,
    },
  ];
  const extras = Array.isArray(extra) ? extra : extra ? [extra] : [];
  for (const item of extras) {
    if (!item) continue;
    const node = { ...item };
    delete node["@context"];
    graph.push(node);
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

function layout({
  title,
  description,
  main,
  game = false,
  canonical,
  jsonLd,
  demo = false,
  skills = false,
  ads = true,
  analytics = true,
  privacyChoices = true,
  robots = "",
  contact = false,
  stats = false,
}) {
  const descriptionTag = description
    ? `<meta name="description" content="${escapeHtml(description)}">`
    : "";
  const canonicalHref = canonical ? withSlash(canonical) : "";
  const canonicalTag = canonicalHref ? `<link rel="canonical" href="${escapeHtml(canonicalHref)}">` : "";
  const robotsTag = robots ? `<meta name="robots" content="${escapeHtml(robots)}">` : "";
  const jsonLdTag = `<script type="application/ld+json">${JSON.stringify(structuredData(jsonLd)).replace(/</g, "\\u003c")}</script>`;
  const shareTitle = escapeHtml(title);
  const shareDescription = escapeHtml(description || "Free daily Sudoku with teaching hints.");
  const shareUrl = escapeHtml(canonicalHref || `${SITE}/`);
  const image = `${SITE}/og.png`;
  const adsTag = ads
    ? `  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9345046210950956" crossorigin="anonymous"></script>\n`
    : "";
  const analyticsTags = analytics
    ? `  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
      region: ${JSON.stringify(CONSENT_REGIONS)}
    });
    gtag('consent', 'default', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted'
    });
    gtag('js', new Date());
    gtag('config', 'G-TFNKPH6DNY');
  </script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-TFNKPH6DNY"></script>
`
    : "";
  const privacyChoiceItem = privacyChoices
    ? `        <li><button type="button" class="privacy-choices" id="privacy-choices">Privacy choices</button></li>\n`
    : "";
  const privacyChoiceNote = privacyChoices
    ? `    <p id="privacy-choices-note" class="privacy-choices-note" hidden>The privacy message did not load on this page. Open the home page and use Privacy choices there.</p>\n`
    : "";
  const privacyChoiceScript = privacyChoices
    ? `<script>
(function () {
  var button = document.getElementById("privacy-choices");
  if (!button) return;
  button.addEventListener("click", function () {
    window.googlefc = window.googlefc || {};
    googlefc.callbackQueue = googlefc.callbackQueue || [];
    var waited = 0;
    var timer = window.setInterval(function () {
      if (typeof googlefc.showRevocationMessage === "function") {
        window.clearInterval(timer);
        googlefc.callbackQueue.push(googlefc.showRevocationMessage);
        return;
      }
      waited += 100;
      if (waited >= 1200) {
        window.clearInterval(timer);
        var note = document.getElementById("privacy-choices-note");
        if (note) note.hidden = false;
      }
    }, 100);
  });
})();
</script>
`
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
  <meta name="apple-mobile-web-app-title" content="SudokuSudoku">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>${escapeHtml(title)}</title>
  ${descriptionTag}
  ${robotsTag}
  ${canonicalTag}
  <meta property="og:title" content="${shareTitle}">
  <meta property="og:description" content="${shareDescription}">
  <meta property="og:url" content="${shareUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="SudokuSudoku">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="SudokuSudoku board beside a number-pad box map">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${shareTitle}">
  <meta name="twitter:description" content="${shareDescription}">
  <meta name="twitter:image" content="${image}">
  <meta name="twitter:image:alt" content="SudokuSudoku board beside a number-pad box map">
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
  <link rel="apple-touch-icon" href="${asset("/icons/apple-touch-icon.png")}">
  <link rel="preload" href="${asset("/assets/fonts/open-sans-latin-400.woff2")}" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${asset("/assets/css/style.css")}">
  <link rel="icon" href="${asset("/favicon.ico")}" sizes="any">
  <link rel="icon" href="${asset("/favicon.svg")}" type="image/svg+xml">
  <link rel="icon" href="${asset("/icons/icon-192.png")}" type="image/png" sizes="192x192">
  <link rel="icon" href="${asset("/icons/icon-512.png")}" type="image/png" sizes="512x512">
${analyticsTags}${adsTag}</head>
<body>
<div id="app-update" class="app-update" hidden>
  <p>A new version is ready.</p>
  <button type="button" id="app-update-go">Refresh</button>
</div>
<header class="site-header">
  <div class="container">
    <nav class="main-navigation" role="navigation">
      <div class="nav-brand">
        <a href="/" class="site-logo">SudokuSudoku</a>
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
            <a href="/techniques/">Techniques</a>
          </li>
          <li class="menu-item">
            <a href="/skills/">Skills</a>
          </li>
          <li class="menu-item">
            <a href="/stats/">Stats</a>
          </li>
          <li class="menu-item">
            <a href="/links/">Links</a>
          </li>
          <li class="menu-item">
            <a href="/articles/">Articles</a>
          </li>
          <li class="menu-item">
            <a href="/about/">About</a>
          </li>
        </ul>
      </div>
    </nav>
  </div>
</header>
${main}
<footer class="site-footer">
  <div class="container">
    <nav class="footer-nav">
      <ul class="footer-links">
        <li><a href="/about/">About</a></li>
        <li><a href="/techniques/">Techniques</a></li>
        <li><a href="/skills/">Skills</a></li>
        <li><a href="/stats/">Stats</a></li>
        <li><a href="/articles/">Articles</a></li>
        <li><a href="/links/">Links</a></li>
        <li><a href="/contact/">Contact</a></li>
        <li><a href="/privacy-policy/">Privacy Policy</a></li>
${privacyChoiceItem}      </ul>
    </nav>
${privacyChoiceNote}    <p class="copyright">&copy; ${year} SudokuSudoku. All rights reserved.</p>
  </div>
</footer>
${game ? ["solver", "pools", "generator", "progress", "community", "share"].map((name) => scriptTag(`/assets/js/${name}.js`)).join("\n") : ""}
${skills ? scriptTag("/assets/js/progress.js") : ""}
${scriptTag("/assets/js/sudoku.js")}
${skills ? scriptTag("/assets/js/skills.js") : ""}
${demo ? scriptTag("/assets/js/technique-demo.js") : ""}
${contact ? scriptTag("/assets/js/contact.js") : ""}
${stats ? scriptTag("/assets/js/stats-page.js") : ""}
${privacyChoiceScript}</body>
</html>
`;
}

function scriptTag(path) {
  return `<script src="${asset(path)}"></script>`;
}

function standardPage(title, bodyHtml, description, path, options = {}) {
  const canonicalPath = withSlash(path);
  return layout({
    title: `${title} | SudokuSudoku`,
    description,
    canonical: path ? `${SITE}${canonicalPath}` : "",
    ads: options.ads !== false,
    analytics: options.analytics !== false,
    privacyChoices: options.privacyChoices !== false,
    robots: options.robots || "",
    contact: Boolean(options.contact),
    jsonLd: options.jsonLd,
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
  const prepared = prepareArticle(markdown);
  let content = prepared.content;
  const data = prepared.data;
  const titleMatch = content.match(/^# (.+)$/m);
  const heading = titleMatch ? titleMatch[1].trim() : data.title || "Article";
  if (titleMatch) content = content.replace(/^# .+$/m, "");

  const excerptMatch = content.match(/\*\*Meta Description:\*\*\s*(.+)/i);
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
    const title = imageMatch[3] || "";
    const size = title.match(/^(\d+)x(\d+)$/);
    image = {
      alt: imageMatch[1],
      src: imageMatch[2],
      title: size ? "" : title,
      width: size ? size[1] : "",
      height: size ? size[2] : "",
    };
    content = content.replace(imageMatch[0], "");
  }

  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));

  const legacyExcerpt = excerptMatch ? excerptMatch[1].trim() : "";
  const excerpt = data.meta_description || legacyExcerpt || data.summary || "";
  const summary = data.summary || excerpt;

  return {
    title: data.title || heading,
    heading,
    excerpt,
    summary,
    tags,
    image,
    minutes,
    publishDate: data.publishDate || "",
    relatedSlugs: prepared.relatedSlugs,
    authored: Boolean(data.publishDate),
    html: sizeImages(marked.parse(content.trim())),
  };
}

function imageTag(image) {
  if (!image) return "";
  const title = image.title ? ` title="${escapeHtml(image.title)}"` : "";
  const width = image.width ? ` width="${escapeHtml(image.width)}"` : "";
  const height = image.height ? ` height="${escapeHtml(image.height)}"` : "";
  return `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}"${width}${height}${title} loading="lazy">`;
}

function sizeImages(html) {
  return html.replace(/<img\b([^>]*?)>/g, (tag, attrs) => {
    const size = attrs.match(/\btitle="(\d+)x(\d+)"/);
    let next = attrs;
    if (size) {
      next = next.replace(/\s*title="\d+x\d+"/, "");
      if (!/\bwidth=/.test(next)) next += ` width="${size[1]}" height="${size[2]}"`;
    }
    if (!/\bloading=/.test(next)) next += ` loading="lazy"`;
    return `<img${next}>`;
  });
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const compiled = sass.compile(join(root, "assets/scss/main.scss"), {
  style: "compressed",
});
write("assets/css/style.css", versionFontUrls(compiled.css, ASSET_VERSION));
write("assets/js/solver.js", read("assets/js/solver.js"));
write("assets/js/pools.js", read("assets/js/pools.js"));
write("assets/js/generator.js", read("assets/js/generator.js"));
write("assets/js/sudoku.js", read("assets/js/sudoku.js"));
write("assets/js/technique-demo.js", read("assets/js/technique-demo.js"));
write("assets/js/progress.js", read("assets/js/progress.js"));
write("assets/js/skills.js", read("assets/js/skills.js"));
write("assets/js/contact.js", read("assets/js/contact.js"));
write("assets/js/community.js", read("assets/js/community.js"));
write("assets/js/share.js", read("assets/js/share.js"));
write("assets/js/stats-page.js", read("assets/js/stats-page.js"));
write("ads.txt", read("ads.txt").trim() + "\n");
cpSync(join(root, "assets/fonts"), join(dist, "assets/fonts"), { recursive: true });
cpSync(join(root, "assets/img"), join(dist, "assets/img"), { recursive: true });
cpSync(join(root, "articles/images"), join(dist, "articles/images"), { recursive: true });
cpSync(join(root, "articles/data"), join(dist, "articles/data"), { recursive: true });
copyFileSync(join(root, "src/og.png"), join(dist, "og.png"));
write("_redirects", read("src/_redirects"));
copyFileSync(join(root, "src/favicon.ico"), join(dist, "favicon.ico"));
copyFileSync(join(root, "src/favicon.svg"), join(dist, "favicon.svg"));

const parsedArticles = articles.map((article) => ({
  ...article,
  ...parseArticle(read(article.file)),
  href: `/articles/${article.slug}/`,
}));
const articleToday = losAngelesToday();
const unpublishedSlugs = new Set(
  parsedArticles.filter((article) => !isPublished(article.publishDate, articleToday)).map((article) => article.slug)
);
for (const article of parsedArticles) {
  article.published = !unpublishedSlugs.has(article.slug);
  article.html = wrapTables(stripUnpublishedLinks(article.html, unpublishedSlugs));
}
const visibleArticles = parsedArticles.filter((article) => article.published);
const articlesBySlug = new Map(parsedArticles.map((article) => [article.slug, article]));
const authorBlurb = shortBio(read("author-bio.md"));
console.log(
  `Articles on ${articleToday} (America/Los_Angeles): ${visibleArticles.map((article) => article.slug).join(", ")}`
);
if (unpublishedSlugs.size) {
  console.log(`Scheduled later: ${[...unpublishedSlugs].join(", ")}`);
}

publish(
  "index.html",
  layout({
    title: "SudokuSudoku",
    description:
      "Every puzzle on SudokuSudoku is graded by its hardest move, not the number of clues. Hints name the move and teach the technique behind it. Just play.",
    canonical: `${SITE}/`,
    game: true,
    main: gateHomepageCopy(read("src/game.html").trim(), articleToday, {
      techniques: techniques.length > 0,
    }),
  }),
  "/"
);

write(
  "404.html",
  layout({
    title: "Page not found | SudokuSudoku",
    description: "That page is not on SudokuSudoku.",
    canonical: `${SITE}/404.html`,
    robots: "noindex",
    ads: false,
    main: `<main class="standard-page">
  <div class="container">
    <article class="page-content">
      <header class="page-header">
        <h1 class="page-title">Page not found</h1>
      </header>
      <div class="page-body">
        <figure class="teddy-figure">
          <picture>
            <source type="image/avif" srcset="/assets/img/teddy/teddy-128.avif 128w, /assets/img/teddy/teddy-256.avif 256w, /assets/img/teddy/teddy-512.avif 512w" sizes="256px">
            <source type="image/webp" srcset="/assets/img/teddy/teddy-128.webp 128w, /assets/img/teddy/teddy-256.webp 256w, /assets/img/teddy/teddy-512.webp 512w" sizes="256px">
            <img src="/assets/img/teddy/teddy-256.webp" width="256" height="256" alt="Teddy, an adult black Australian labradoodle drawn in anime style, holding a pencil over a sudoku grid" loading="lazy" decoding="async">
          </picture>
        </figure>
        <p>Teddy can't find this page either.</p>
        <p><a href="/">Play Sudoku</a>, or browse the <a href="/articles/">articles</a>.</p>
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
  standardPage(
    "About",
    marked.parse(aboutMarkdown),
    "Ethan Ede builds websites and plays Sudoku almost every day. SudokuSudoku grades a puzzle by its hardest move, and the hints teach that move.",
    "/about/",
    { jsonLd: personNode() }
  ),
  "/about"
);

publish(
  "links/index.html",
  standardPage(
    "Links",
    read("links-page-content.html").trim(),
    "Other Sudoku sites, books, and communities, listed separately from the puzzles on SudokuSudoku.",
    "/links/",
    { ads: false }
  ),
  "/links"
);

publish(
  "contact/index.html",
  standardPage(
    "Contact",
    read("contact-page-content.html").trim(),
    "Send a note about a bug, a technique page, or the site. The form uses a spam check and does not show an email address.",
    "/contact/",
    { contact: true }
  ),
  "/contact"
);

publish(
  "privacy-policy/index.html",
  standardPage(
    "Privacy Policy",
    read("privacy-policy-content.html").trim(),
    "How SudokuSudoku handles on-device puzzle data, anonymous community stats, Google Analytics, AdSense consent, and the contact form.",
    "/privacy-policy/",
    { ads: false, analytics: false, privacyChoices: false }
  ),
  "/privacy-policy"
);

const cards = visibleArticles
  .map((article) => {
    const thumb = article.image
      ? `<div class="article-thumbnail"><a href="${article.href}">${imageTag(article.image)}</a></div>`
      : "";
    const published = article.publishDate
      ? `<time class="article-date" datetime="${escapeHtml(article.publishDate)}">${escapeHtml(formatPublishDate(article.publishDate))}</time>`
      : "";
    return `<article class="article-card">
      ${thumb}
      <div class="article-content">
        <div class="article-meta">
          ${published}
          <span class="article-reading-time">${article.minutes} min read</span>
        </div>
        <h2 class="article-title"><a href="${article.href}">${escapeHtml(article.title)}</a></h2>
        <div class="article-excerpt"><p>${escapeHtml(article.summary)}</p></div>
        <a href="${article.href}" class="read-more">Read Full Article →</a>
      </div>
    </article>`;
  })
  .join("\n");

publish(
  "articles/index.html",
  layout({
    title: "Articles | SudokuSudoku",
    description: "How to play, what makes a puzzle hard, and notes from building SudokuSudoku.",
    canonical: `${SITE}/articles/`,
    main: `<main id="articles" class="articles-page">
  <div class="container">
    <header class="page-header">
      <h1>Sudoku Articles &amp; Guides</h1>
      <p class="page-description">How to play, what the puzzles measure, and notes from building this site.</p>
    </header>
    <div class="articles-grid">
      ${cards}
    </div>
  </div>
</main>`,
  }),
  "/articles"
);

function relatedArticlesHtml(article) {
  const items = article.relatedSlugs
    .map((slug) => articlesBySlug.get(slug))
    .filter((item) => item && item.published);
  if (!items.length) return "";
  const list = items
    .map(
      (item) =>
        `<li><a href="${item.href}">${escapeHtml(item.title)}</a><p>${escapeHtml(item.summary)}</p></li>`
    )
    .join("");
  return `<section class="related-articles"><h2>Related articles</h2><ul>${list}</ul></section>`;
}

visibleArticles.forEach((article, index) => {
  const previous = visibleArticles[index - 1];
  const next = visibleArticles[index + 1];
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
  const byline = article.authored
    ? `<p class="article-byline">By <a href="/about/">${escapeHtml(AUTHOR_NAME)}</a><time datetime="${escapeHtml(article.publishDate)}">${escapeHtml(formatPublishDate(article.publishDate))}</time></p>`
    : "";
  const authorBox = article.authored
    ? `<aside class="author-box"><p class="author-box-name"><a href="/about/">${escapeHtml(AUTHOR_NAME)}</a></p><p>${escapeHtml(authorBlurb)}</p></aside>`
    : "";
  const tagBlock = tags ? `<div class="article-tags"><span class="tags-label">Tags:</span> ${tags}</div>` : "";

  const articleLd = article.authored
    ? [
        articleJsonLd({
          title: article.title,
          description: article.excerpt,
          url: `${SITE}${article.href}`,
          publishDate: article.publishDate,
        }),
        personNode(),
      ]
    : article.slug === "nyt-medium-vs-hard"
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.excerpt,
          mainEntityOfPage: `${SITE}${article.href}`,
          datePublished: "2026-10-21",
          dateModified: "2026-10-21",
          author: { "@type": "Organization", name: "SudokuSudoku" },
          publisher: {
            "@type": "Organization",
            name: "SudokuSudoku",
            logo: { "@type": "ImageObject", url: `${SITE}/icons/icon-512.png` },
          },
        }
      : null;

  publish(
    `articles/${article.slug}/index.html`,
    layout({
      title: `${article.title} | SudokuSudoku`,
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
        <h1 class="article-title">${escapeHtml(article.heading)}</h1>
        ${byline}
        ${featured}
      </header>
      <div class="article-body">
        ${article.html}
      </div>
      ${authorBox}
      ${relatedArticlesHtml(article)}
      <footer class="article-footer">
        ${tagBlock}
        <div class="article-navigation">${navigation}</div>
        <div class="back-to-articles"><a href="/articles/" class="cta-button">← Back to All Articles</a></div>
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
      <a href="/techniques/${technique.slug}/">${escapeHtml(technique.name)}</a>
      <span>${escapeHtml(technique.level)}. ${escapeHtml(technique.nyt)}</span>
    </li>`;
  })
  .join("\n");

publish(
  "techniques/index.html",
  layout({
    title: "Techniques | SudokuSudoku",
    description:
      "Sudoku techniques from naked singles to XY-chains, each with a plain explanation and a puzzle state from this site's solver.",
    canonical: `${SITE}/techniques/`,
    main: `<main class="standard-page technique-page">
  <div class="container">
    <article class="page-content">
      <header class="page-header">
        <h1 class="page-title">Techniques</h1>
      </header>
      <div class="page-body">
        <p>These are the steps the solver on this site actually uses, easiest first. Each one has a board taken from a real solve, not a diagram drawn by hand. The level named on the row is where that step first becomes necessary.</p>
        <p>The New York Times labels overlap in a way these levels don't. That measurement is written up in <a href="/articles/nyt-medium-vs-hard/">why Medium sometimes feels harder than Hard</a>.</p>
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

publish(
  "stats/index.html",
  layout({
    title: "Stats | SudokuSudoku",
    description:
      "Anonymous SudokuSudoku stats by difficulty: median solve time, how often puzzles are solved or given up, and the hints players use most.",
    canonical: `${SITE}/stats/`,
    stats: true,
    jsonLd: {
      "@type": "Dataset",
      name: "SudokuSudoku community puzzle stats",
      description:
        "Anonymous solve times and outcomes by Sudoku difficulty, from plays on SudokuSudoku. No account and no IP address are stored.",
      url: `${SITE}/stats/`,
      creator: { "@type": "Organization", name: "SudokuSudoku" },
    },
    main: `<main class="standard-page stats-page">
  <div class="container">
    <article class="page-content">
      <header class="page-header">
        <h1 class="page-title">Community stats</h1>
      </header>
      <div class="page-body">
        ${read("stats-page-content.html").trim()}
        <p id="stats-today" class="stats-today">Today's daily: not enough data yet.</p>
        <div class="stats-switch" role="group" aria-label="Time window">
          <button type="button" data-stats-window="30d" aria-pressed="true">Last 30 days</button>
          <button type="button" data-stats-window="all" aria-pressed="false">All time</button>
        </div>
        <div id="stats-root">
          <p class="stats-empty">Loading community stats…</p>
        </div>
      </div>
    </article>
  </div>
</main>`,
  }),
  "/stats"
);

publish(
  "skills/index.html",
  layout({
    title: "Skill ladder | SudokuSudoku",
    description:
      "A technique ladder stored on this device: what you have solved, what to train next, and badges from finished puzzles.",
    canonical: `${SITE}/skills/`,
    skills: true,
    main: `<main id="skills" class="skills-page">
  <div class="skills-wrap">
    <p class="skills-back"><a href="/">← Play</a></p>
    <h1>Skill ladder</h1>
    <p class="skills-lead">Techniques you have solved, from easiest to hardest. Everything stays on this device.</p>
    <div id="skills-root"></div>
  </div>
</main>`,
  }),
  "/skills"
);

techniques.forEach((technique) => {
  const example = examples[technique.slug];
  const related = technique.related
    .map((slug) => {
      const other = bySlug.get(slug);
      return `<a href="/techniques/${slug}/">${escapeHtml(other.name)}</a>`;
    })
    .join("");
  const path = `/techniques/${technique.slug}/`;
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
      title: `${technique.name} | SudokuSudoku`,
      description: technique.description,
      canonical: `${SITE}${path}`,
      jsonLd: howto,
      demo: true,
      main: `<main class="standard-page technique-page">
  <div class="container">
    <article class="page-content">
      <header class="page-header">
        <p class="technique-level"><a href="/techniques/">Techniques</a> · ${escapeHtml(technique.level)}</p>
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
    src: asset(`/icons/icon-${size}.png`),
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose: "any",
  })),
  ...[192, 512].map((size) => ({
    src: asset(`/icons/maskable-${size}.png`),
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
      name: "SudokuSudoku",
      short_name: "SudokuSudoku",
      description: "Daily Sudoku with teaching hints, a box map, and six graded levels. Plays offline.",
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
  <meta name="robots" content="noindex">
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f7f4ef">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#141218">
  <title>Offline | SudokuSudoku</title>
  <meta name="description" content="SudokuSudoku is offline. The puzzle on this device still opens.">
  <meta name="robots" content="noindex">
  <link rel="canonical" href="https://sudokusudoku.com/offline.html">
  <link rel="preload" href="${asset("/assets/fonts/open-sans-latin-400.woff2")}" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${asset("/assets/css/style.css")}">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="icon" href="${asset("/favicon.svg")}" type="image/svg+xml">
</head>
<body>
<main class="standard-page">
  <div class="container">
    <article class="page-content">
      <header class="page-header">
        <h1 class="page-title">You're offline</h1>
      </header>
      <div class="page-body">
        <p>The puzzle is saved on this device. Open SudokuSudoku to keep playing, including a new game or today's daily.</p>
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
  "skills/index.html",
  "offline.html",
  "manifest.webmanifest",
  "favicon.ico",
  "favicon.svg",
  "assets/css/style.css",
  "assets/fonts/open-sans-latin-400.woff2",
  "assets/fonts/open-sans-latin-600.woff2",
  "assets/fonts/open-sans-latin-700.woff2",
  "assets/js/solver.js",
  "assets/js/pools.js",
  "assets/js/generator.js",
  "assets/js/progress.js",
  "assets/js/skills.js",
  "assets/js/sudoku.js",
  "assets/js/community.js",
  "assets/js/share.js",
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
const shellUrls = [
  "/",
  "/skills/",
  ...shellPaths
    .filter((relativePath) => relativePath !== "index.html" && relativePath !== "skills/index.html")
    .map((relativePath) => {
      const path = `/${relativePath}`;
      return STATIC_ASSET.test(relativePath) ? asset(path) : path;
    }),
];
write(
  "sw.js",
  read("assets/js/sw.js")
    .replaceAll("__SUDOKU_PWA_VERSION__", version)
    .replace("__SUDOKU_PWA_SHELL__", JSON.stringify(shellUrls))
);

assertAssetVersions();
console.log(`Built ${dist}`);

function assertAssetVersions() {
  const version = ASSET_VERSION;
  const home = readFileSync(join(dist, "index.html"), "utf8");
  const offline = readFileSync(join(dist, "offline.html"), "utf8");
  const sw = readFileSync(join(dist, "sw.js"), "utf8");
  const css = readFileSync(join(dist, "assets/css/style.css"), "utf8");
  const manifest = readFileSync(join(dist, "manifest.webmanifest"), "utf8");
  const skills = readFileSync(join(dist, "skills/index.html"), "utf8");
  const required = [
    `/assets/js/sudoku.js?v=${version}`,
    `/assets/js/solver.js?v=${version}`,
    `/assets/js/share.js?v=${version}`,
    `/assets/css/style.css?v=${version}`,
    `/assets/fonts/open-sans-latin-400.woff2?v=${version}`,
    `/favicon.ico?v=${version}`,
    `/favicon.svg?v=${version}`,
    `/icons/icon-192.png?v=${version}`,
    `/icons/icon-512.png?v=${version}`,
    `/icons/apple-touch-icon.png?v=${version}`,
  ];
  for (const url of required) {
    if (!home.includes(url)) throw new Error(`index.html missing ${url}`);
    if (!sw.includes(url) && url.includes("/assets/js/")) throw new Error(`sw.js missing ${url}`);
  }
  for (const url of [
    `/assets/css/style.css?v=${version}`,
    `/assets/fonts/open-sans-latin-400.woff2?v=${version}`,
    `/assets/fonts/open-sans-latin-600.woff2?v=${version}`,
    `/assets/fonts/open-sans-latin-700.woff2?v=${version}`,
    `/favicon.ico?v=${version}`,
    `/favicon.svg?v=${version}`,
    `/icons/icon-192.png?v=${version}`,
    `/icons/apple-touch-icon.png?v=${version}`,
  ]) {
    if (!sw.includes(url)) throw new Error(`sw.js missing ${url}`);
  }
  const scripts = [...home.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  for (const src of scripts) {
    if (src.startsWith("/") && !src.includes(`?v=${version}`)) throw new Error(`unversioned local script ${src}`);
    if (/^https?:/i.test(src) && src.includes(`v=${version}`)) throw new Error(`versioned third-party script ${src}`);
  }
  if (!offline.includes(`/assets/css/style.css?v=${version}`)) throw new Error("offline.css is unversioned");
  if (!offline.includes(`/assets/fonts/open-sans-latin-400.woff2?v=${version}`)) throw new Error("offline font is unversioned");
  if (!skills.includes(`/assets/js/skills.js?v=${version}`)) throw new Error("skills.js is unversioned");
  if (!css.includes(`/assets/fonts/open-sans-latin-400.woff2?v=${version}`)) throw new Error("css font 400 is unversioned");
  if (!css.includes(`/assets/fonts/open-sans-latin-600.woff2?v=${version}`)) throw new Error("css font 600 is unversioned");
  if (!css.includes(`/assets/fonts/open-sans-latin-700.woff2?v=${version}`)) throw new Error("css font 700 is unversioned");
  if (!manifest.includes(`/icons/icon-512.png?v=${version}`)) throw new Error("manifest icon is unversioned");
  if (!manifest.includes(`/icons/maskable-512.png?v=${version}`)) throw new Error("maskable icon is unversioned");
  if (sw.includes('"/assets/js/sudoku.js"')) throw new Error("sw.js still precaches unversioned sudoku.js");
  if (home.includes('href="/assets/css/style.css"')) throw new Error("stylesheet is unversioned");
  console.log(`Asset version ${version}`);
}
console.log(`Technique examples: ${techniques.map((technique) => technique.slug).join(", ")}`);
