import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ADSENSE_CLIENT,
  ADSENSE_UNITS_ENABLED,
  adsensePushScript,
  housePair,
  promoCatalog,
  renderAdsenseBox,
  renderHousePromos,
} from "./house-promos.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

assert.equal(ADSENSE_UNITS_ENABLED, false);
assert.equal(ADSENSE_CLIENT, "ca-pub-9345046210950956");
assert.equal(adsensePushScript(3), "");

const published = new Set([
  "/articles/beginners-guide/",
  "/articles/common-mistakes/",
  "/articles/nyt-medium-vs-hard/",
]);
const base = {
  today: "2026-10-23",
  publishedHrefs: published,
  practiceHref: null,
};

function targets(html) {
  return [...html.matchAll(/data-promo-target="([^"]*)"/g)].map((match) => match[1]);
}

const catalog = promoCatalog({ practiceHref: null, publishedHrefs: published });
assert.equal(catalog.some((promo) => promo.href === "/practice/"), false);
for (const promo of catalog) {
  for (const field of ["title", "text", "line", "cue"]) {
    assert.equal(promo[field].includes("—"), false, `${promo.id} ${field}`);
    assert.equal(promo[field].includes("–"), false, `${promo.id} ${field}`);
    assert.equal(/best free|click here|you won't believe/i.test(promo[field]), false);
  }
}
assert.equal(catalog.some((promo) => promo.art === "practice"), true);
assert.equal(catalog.some((promo) => promo.art === "xwing"), true);

const shipped = promoCatalog({ practiceHref: "/practice/", publishedHrefs: published });
const practice = shipped.find((promo) => promo.id === "practice");
assert.equal(practice.href, "/practice/");
assert.equal(practice.art, "practice");

for (const size of ["billboard", "rectangle", "leaderboard", "skyscraper"]) {
  const html = renderHousePromos([{ slot: "sample", size }], { ...base, section: "about", path: "/about/" }).sample;
  assert.match(html, new RegExp(`house-slot-${size}`));
  // A banner with a button-style call to action, not a labeled card.
  assert.match(html, /class="house-promo-cue"/);
  assert.equal(html.includes("House marks"), false);
  assert.match(html, /data-promo-slot="sample"/);
  assert.equal(html.includes("adsbygoogle"), false);
  assert.equal(html.includes("Advertisement"), false);
  assert.equal(html.includes("REPLACE_WITH_SLOT"), false);
  assert.equal(targets(html).includes("/about/"), false);
}

const home = renderHousePromos([{ slot: "home-below", size: "rectangle" }], {
  ...base,
  section: "home",
  path: "/",
})["home-below"];
assert.equal(targets(home).includes("/"), false);
assert.equal(targets(home).includes("/?daily"), false);
assert.match(home, /house-slot-rectangle/);

const stats = renderHousePromos([{ slot: "stats-end", size: "rectangle" }], {
  ...base,
  section: "stats",
  path: "/stats/",
})["stats-end"];
assert.equal(targets(stats).includes("/stats/"), false);

const self = renderHousePromos([{ slot: "article-end", size: "rectangle" }], {
  ...base,
  section: "article",
  path: "/articles/beginners-guide/",
})["article-end"];
assert.equal(targets(self).includes("/articles/beginners-guide/"), false);

const hidden = promoCatalog({
  practiceHref: null,
  publishedHrefs: new Set(["/articles/common-mistakes/"]),
});
assert.equal(hidden.some((promo) => promo.href === "/articles/beginners-guide/"), false);

for (const section of ["privacy", "missing", "links", "account", "offline"]) {
  const html = renderHousePromos([{ slot: "x", size: "rectangle" }], {
    ...base,
    section,
    path: "/about/",
  }).x;
  assert.equal(html, "");
}
assert.equal(
  renderHousePromos([{ slot: "x", size: "rectangle" }], {
    ...base,
    section: "page",
    path: "/privacy-policy/",
  }).x,
  ""
);

const pair = renderHousePromos(
  [
    { slot: "articles-end", size: "rectangle" },
    { slot: "articles-rail", size: "skyscraper" },
  ],
  { ...base, section: "articles", path: "/articles/" }
);
const both = `${pair["articles-end"]}${pair["articles-rail"]}`;
const bothTargets = targets(both);
assert.equal(new Set(bothTargets).size, bothTargets.length);
assert.equal(bothTargets.includes("/articles/"), false);

const again = renderHousePromos([{ slot: "home-below", size: "rectangle" }], {
  ...base,
  section: "home",
  path: "/",
})["home-below"];
assert.equal(again, home);

const ad = renderAdsenseBox({ slot: "home-below", size: "billboard" });
assert.match(ad, /class="adsbygoogle"/);
assert.match(ad, /ca-pub-9345046210950956/);
assert.match(ad, /data-ad-slot="REPLACE_WITH_SLOT"/);
assert.match(ad, /house-slot-billboard/);
assert.equal(ad.includes("House marks"), false);

const wrapped = housePair("<div class=\"wide\"></div>", "<div class=\"narrow\"></div>");
assert.match(wrapped, /class="house-pair"/);

const game = read("src/game.html");
const marker = game.indexOf("house-slot:home-below");
assert.ok(marker > game.indexOf("sudoku-copy"));
assert.ok(marker > game.indexOf("play-column"));
assert.ok(marker < game.indexOf('id="account-modal"'));
assert.equal(game.slice(game.indexOf("play-column"), game.indexOf("sudoku-copy")).includes("house-slot"), false);
assert.equal(game.includes("adsbygoogle"), false);

const styles = read("assets/scss/components/_house-promos.scss");
assert.match(styles, /\.house-slot-billboard[\s\S]*height:\s*280px/);
assert.match(styles, /\.house-slot-rectangle[\s\S]*width:\s*300px[\s\S]*height:\s*250px/);
assert.match(styles, /\.house-slot-leaderboard[\s\S]*width:\s*728px[\s\S]*height:\s*90px/);
assert.match(styles, /\.house-slot-skyscraper[\s\S]*width:\s*160px[\s\S]*height:\s*600px/);
assert.match(styles, /\.house-slot-halfpage[\s\S]*width:\s*300px[\s\S]*height:\s*600px/);
assert.match(styles, /\.hm-art-narrow/);
assert.match(styles, /\.house-slot-billboard \.hm-art-wide/);
assert.equal(styles.includes("#f7f4ef"), false);
assert.equal(styles.includes("#f4efe6"), false);

const clicks = read("assets/js/house-promos.js");
assert.match(clicks, /promo_click/);
assert.match(clicks, /slot:/);
assert.match(clicks, /target:/);
assert.match(clicks, /gtag/);

const build = read("scripts/build.mjs");
assert.match(build, /renderHousePromos/);
assert.match(build, /house-slot:home-below/);
assert.match(build, /"404.html"[\s\S]*?ads: false/);
assert.match(build, /"links\/index.html"[\s\S]*?ads: false/);
assert.match(build, /"privacy-policy\/index.html"[\s\S]*?ads: false/);
assert.match(build, /"terms\/index.html"[\s\S]*?ads: false/);
assert.equal(
  renderHousePromos([{ slot: "x", size: "rectangle" }], {
    ...base,
    section: "page",
    path: "/terms/",
  }).x,
  ""
);

const sudokuScss = read("assets/scss/pages/_sudoku.scss");
assert.match(sudokuScss, /\.play-column[\s\S]*?height:\s*100dvh/);

console.log("promo tests passed");
