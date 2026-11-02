// House marks: in-house promos for the reserved ad boxes.
// Palette A (accent #2141a8 / #a9bcff), Open Sans, geometric line art.
// Teddy stays on the about page. These units do not use him.
//
// Ads are not approved. ADSENSE_UNITS_ENABLED must stay false.
// Flip it only after each REPLACE_WITH_SLOT value is a real unit id.
// The box sizes do not change, so the swap does not move the layout.
// The head script is still controlled by the page `ads` flag.

import { phosphorArrow } from "./icons.mjs";

export const ADSENSE_UNITS_ENABLED = false;
export const ADSENSE_CLIENT = "ca-pub-9345046210950956";

const ADSENSE_SLOT_IDS = {
  "home-below": "REPLACE_WITH_SLOT",
  "home-rail": "REPLACE_WITH_SLOT",
  "article-end": "REPLACE_WITH_SLOT",
  "about-end": "REPLACE_WITH_SLOT",
  "contact-end": "REPLACE_WITH_SLOT",
  "stats-end": "REPLACE_WITH_SLOT",
  "skills-end": "REPLACE_WITH_SLOT",
  "technique-end": "REPLACE_WITH_SLOT",
  "techniques-bar": "REPLACE_WITH_SLOT",
  "techniques-end": "REPLACE_WITH_SLOT",
  "articles-end": "REPLACE_WITH_SLOT",
  "articles-rail": "REPLACE_WITH_SLOT",
};

const BLOCKED_SECTIONS = new Set(["privacy", "missing", "links", "account", "offline"]);
const BLOCKED_PATHS = new Set(["/privacy-policy/", "/terms/", "/links/", "/404.html", "/offline.html"]);

const PUBLISHED_ARTICLES = new Set([
  "/articles/beginners-guide/",
  "/articles/common-mistakes/",
  "/articles/nyt-medium-vs-hard/",
]);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function hash(value) {
  let h = 2166136261;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function svg(viewBox, body) {
  return `<svg viewBox="0 0 ${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;
}

function xLines(x0, y0, x1, y1, inset) {
  const pull = (x, y, cx, cy) => {
    const dx = cx - x;
    const dy = cy - y;
    const len = Math.hypot(dx, dy) || 1;
    return [Math.round(x + (dx / len) * inset), Math.round(y + (dy / len) * inset)];
  };
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const a = pull(x0, y0, cx, cy);
  const b = pull(x1, y1, cx, cy);
  const c = pull(x1, y0, cx, cy);
  const d = pull(x0, y1, cx, cy);
  return `<path d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}M${c[0]} ${c[1]}L${d[0]} ${d[1]}" class="hm-pattern"/>`;
}

function xwingGrid() {
  const origin = 14;
  const cell = 16;
  const n = 9;
  const size = cell * n;
  let thin = "";
  let bold = "";
  for (let i = 0; i <= n; i += 1) {
    const p = origin + i * cell;
    const line = `M${p} ${origin}V${origin + size}M${origin} ${p}H${origin + size}`;
    if (i % 3 === 0) bold += line;
    else thin += line;
  }
  const pattern = [
    [1, 2],
    [1, 6],
    [5, 2],
    [5, 6],
  ];
  const patternSet = new Set(pattern.map(([r, c]) => `${r},${c}`));
  const givens = [
    [0, 0, "4"],
    [2, 4, "1"],
    [3, 8, "9"],
    [7, 1, "2"],
    [8, 7, "5"],
  ];
  let fills = "";
  let digits = "";
  for (const [r, c] of pattern) {
    const x = origin + c * cell;
    const y = origin + r * cell;
    fills += `<rect x="${x + 1.2}" y="${y + 1.2}" width="${cell - 2.4}" height="${cell - 2.4}" class="hm-fill"/>`;
    digits += `<text x="${x + cell / 2}" y="${y + cell / 2}" text-anchor="middle" dominant-baseline="central" class="hm-digit">7</text>`;
  }
  for (const [r, c, digit] of givens) {
    if (patternSet.has(`${r},${c}`)) continue;
    const x = origin + c * cell;
    const y = origin + r * cell;
    digits += `<text x="${x + cell / 2}" y="${y + cell / 2}" text-anchor="middle" dominant-baseline="central" class="hm-quiet">${digit}</text>`;
  }
  const x0 = origin + 2 * cell + cell / 2;
  const x1 = origin + 6 * cell + cell / 2;
  const y0 = origin + 1 * cell + cell / 2;
  const y1 = origin + 5 * cell + cell / 2;
  const cross = xLines(x0, y0, x1, y1, 12);
  return svg(`172 172`, `<rect x="6" y="6" width="160" height="160" class="hm-paper"/><path d="${thin}" class="hm-line"/><path d="${bold}" class="hm-bold"/>${fills}${cross}${digits}`);
}

function xwingClose() {
  const cell = 34;
  const ox = 18;
  const row1 = 16;
  const row2 = 70;
  let grid = "";
  let marks = "";
  let digits = "";
  for (const y of [row1, row2]) {
    for (let c = 0; c < 3; c += 1) {
      const x = ox + c * cell;
      const on = c !== 1;
      grid += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" class="${on ? "hm-fill" : "hm-paper"}"/>`;
      if (on) {
        digits += `<text x="${x + cell / 2}" y="${y + cell / 2}" text-anchor="middle" dominant-baseline="central" class="hm-digit">7</text>`;
      }
    }
    marks += `<path d="M${ox} ${y}h${cell * 3}v${cell}h-${cell * 3}zM${ox + cell} ${y}v${cell}M${ox + cell * 2} ${y}v${cell}" class="hm-bold"/>`;
  }
  const x0 = ox + cell / 2;
  const x1 = ox + cell * 2 + cell / 2;
  const y0 = row1 + cell / 2;
  const y1 = row2 + cell / 2;
  const cross = xLines(x0, y0, x1, y1, 16);
  return svg("138 120", `${grid}${marks}${cross}${digits}`);
}

function calendarSvg() {
  const cell = 16;
  const gap = 4;
  const cols = 7;
  const rows = 4;
  const gridW = cols * cell + (cols - 1) * gap;
  const ox = Math.round((180 - gridW) / 2);
  const oy = 40;
  let cells = "";
  let n = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = ox + c * (cell + gap);
      const y = oy + r * (cell + gap);
      cells += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" class="${n === 9 ? "hm-accent" : "hm-fill"}"/>`;
      n += 1;
    }
  }
  return svg(
    "180 140",
    `<path d="M14 10h152v120H14z" class="hm-bold"/><rect x="14" y="10" width="152" height="22" class="hm-fill"/><rect x="26" y="18" width="18" height="6" class="hm-accent"/>${cells}`
  );
}

function chartSvg() {
  const heights = [42, 68, 50, 92];
  const base = 118;
  const w = 18;
  const gap = 16;
  const start = 32;
  let bars = "";
  heights.forEach((h, i) => {
    const x = start + i * (w + gap);
    bars += `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" class="${i === heights.length - 1 ? "hm-accent" : "hm-fill"}"/>`;
  });
  return svg("180 140", `<path d="M20 ${base}H164" class="hm-bold"/>${bars}`);
}

function ladderSvg() {
  let rungs = "";
  for (let i = 0; i < 5; i += 1) {
    const y = 22 + i * 22;
    const next = i === 2;
    rungs += `<path d="M40 ${y}H${next ? 148 : 128}" class="${next ? "hm-accent-stroke" : "hm-line"}"/>`;
    if (next) rungs += `<rect x="144" y="${y - 5}" width="10" height="10" class="hm-accent"/>`;
  }
  return svg("180 140", `<path d="M30 12V128" class="hm-bold"/>${rungs}`);
}

function guideSvg() {
  let grid = "";
  const ox = 108;
  const oy = 58;
  const cell = 13;
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      const on = r === 0 && c === 1;
      grid += `<rect x="${ox + c * cell}" y="${oy + r * cell}" width="${cell - 1.5}" height="${cell - 1.5}" class="${on ? "hm-accent" : "hm-fill"}"/>`;
    }
  }
  return svg(
    "180 140",
    `<path d="M16 14h148v112H16z" class="hm-bold"/><path d="M32 42H96M32 58H84M32 74H70" class="hm-line"/>${grid}`
  );
}

function mistakesSvg() {
  let rows = "";
  for (let i = 0; i < 3; i += 1) {
    const y = 24 + i * 36;
    rows += `<rect x="28" y="${y}" width="18" height="18" class="hm-bold"/>`;
    rows += `<path d="M58 ${y + 9}H152" class="hm-line"/>`;
    if (i < 2) rows += `<path d="M32 ${y + 10}l4 4 8-10" class="hm-accent-stroke"/>`;
  }
  return svg("180 140", rows);
}

function practiceSvg() {
  return svg(
    "180 140",
    `<path d="M22 34H44V56M114 34H92V56M22 106H44V84M114 106H92V84" class="hm-accent-stroke"/><rect x="52" y="46" width="48" height="48" class="hm-paper"/><path d="M52 46h48v48H52z" class="hm-bold"/><path d="M76 58v24M64 70h24" class="hm-line"/><path d="M132 58l14 12-14 12M150 58l14 12-14 12" class="hm-accent-stroke"/>`
  );
}

const ART = {
  xwing: { large: xwingGrid, small: xwingClose },
  calendar: { large: calendarSvg, small: calendarSvg },
  chart: { large: chartSvg, small: chartSvg },
  ladder: { large: ladderSvg, small: ladderSvg },
  guide: { large: guideSvg, small: guideSvg },
  mistakes: { large: mistakesSvg, small: mistakesSvg },
  practice: { large: practiceSvg, small: practiceSvg },
};

function artSvg(name, size) {
  const art = ART[name] || ART.xwing;
  if (size === "billboard" && art.small !== art.large) {
    return `<span class="hm-art hm-art-wide">${art.large()}</span><span class="hm-art hm-art-narrow">${art.small()}</span>`;
  }
  const draw = size === "leaderboard" || size === "rectangle" ? art.small : art.large;
  return draw();
}

function practiceEntry(practiceHref) {
  if (practiceHref) {
    return {
      id: "practice",
      href: practiceHref,
      title: "Drill the move you keep missing.",
      text: "Practice deals one technique on purpose, instead of hoping a random puzzle asks for it.",
      line: "One technique, dealt on purpose.",
      cue: "Start practice",
      art: "practice",
      avoidSections: ["practice"],
    };
  }
  return {
    id: "practice",
    href: "/techniques/",
    title: "The pattern, then what it removes.",
      text: "Technique pages stop on the step that matters. Name it, then use it.",
    line: "Name the step, then use it.",
    cue: "See the techniques",
    art: "practice",
    avoidSections: ["techniques"],
  };
}

export function promoCatalog({ practiceHref = null, publishedHrefs = PUBLISHED_ARTICLES } = {}) {
  const live = publishedHrefs instanceof Set ? publishedHrefs : new Set(publishedHrefs || []);
  const entries = [
    {
      id: "techniques",
      href: "/techniques/",
      title: "That step has a name.",
      text: "The page names the step, then shows the board the solver actually reached.",
      line: "The technique list, on real boards.",
      cue: "See the techniques",
      art: "xwing",
      avoidSections: ["techniques"],
    },
    practiceEntry(practiceHref),
    {
      id: "daily",
      href: "/?daily",
      title: "Same grid as everyone else.",
      text: "Today's puzzle is Not Easy. One date, one seed, a new grid tomorrow.",
      line: "Today's Not Easy. Same puzzle for everyone.",
      cue: "Play today's puzzle",
      art: "calendar",
      avoidSections: ["home"],
    },
    {
      id: "stats",
      href: "/stats/",
      title: "How long is everyone taking?",
      text: "See how long a finish takes, and which hints people reach for.",
      line: "Finish times, and the hints people reach for.",
      cue: "See the stats",
      art: "chart",
      avoidSections: ["stats"],
    },
    {
      id: "skills",
      href: "/skills/",
      title: "The move you still skip.",
      text: "Stored on this device. What you have solved, and what to train next.",
      line: "Your technique ladder, kept on this device.",
      cue: "Open the ladder",
      art: "ladder",
      avoidSections: ["skills"],
    },
    {
      id: "beginners",
      href: "/articles/beginners-guide/",
      title: "The rules, without the lecture.",
      text: "Rows, columns, boxes, and the first singles. Short on purpose.",
      line: "The rules, and the first singles.",
      cue: "Read the guide",
      art: "guide",
      avoidSections: [],
    },
    {
      id: "mistakes",
      href: "/articles/common-mistakes/",
      title: "Three checks, most mistakes.",
      text: "I still forget them. Shorter than the puzzle you just broke.",
      line: "The three checks I still forget.",
      cue: "Read the note",
      art: "mistakes",
      avoidSections: [],
    },
  ];
  return entries.filter((entry) => !entry.href.startsWith("/articles/") || live.has(entry.href));
}

function eligible(promo, ctx) {
  if (!promo.href) return false;
  if (BLOCKED_SECTIONS.has(ctx.section) || BLOCKED_PATHS.has(ctx.path)) return false;
  if (promo.href === ctx.path) return false;
  if (ctx.section === "home" && (promo.href === "/" || promo.href.startsWith("/?"))) return false;
  if (promo.avoidSections?.includes(ctx.section)) return false;
  return true;
}

function pickPromo(catalog, ctx, usedIds, usedHrefs) {
  const list = catalog.filter(
    (promo) => !usedIds.has(promo.id) && !usedHrefs.has(promo.href) && eligible(promo, ctx)
  );
  if (!list.length) return null;
  const index = hash(`${ctx.today}|${ctx.slot}|${ctx.path}|${ctx.section}`) % list.length;
  return list[index];
}

function promoLink(promo, plan) {
  const size = plan.size;
  return `<a class="house-promo" href="${escapeHtml(promo.href)}" data-promo-slot="${escapeHtml(plan.slot)}" data-promo-target="${escapeHtml(promo.href)}" data-art="${escapeHtml(promo.art)}">
    <span class="house-promo-art" aria-hidden="true">${artSvg(promo.art, size)}</span>
    <span class="house-promo-copy">
      <span class="house-promo-title">${escapeHtml(promo.title)}</span>
      <span class="house-promo-text">${escapeHtml(promo.text)}</span>
      <span class="house-promo-line">${escapeHtml(promo.line)}</span>
      <span class="house-promo-cue">${escapeHtml(promo.cue)}${phosphorArrow("right")}</span>
    </span>
  </a>`;
}

export function renderAdsenseBox({ slot, size }) {
  const id = ADSENSE_SLOT_IDS[slot] || "REPLACE_WITH_SLOT";
  return `<div class="house-slot house-slot-${escapeHtml(size)}" data-slot="${escapeHtml(slot)}"><ins class="adsbygoogle" style="display:block" data-ad-client="${ADSENSE_CLIENT}" data-ad-slot="${escapeHtml(id)}" data-ad-format="auto" data-full-width-responsive="true"></ins></div>`;
}

export function adsensePushScript(count) {
  if (!ADSENSE_UNITS_ENABLED || !count) return "";
  let body = "";
  for (let i = 0; i < count; i += 1) body += "(adsbygoogle=window.adsbygoogle||[]).push({});";
  return `<script>${body}</script>\n`;
}

export function renderHousePromos(plans, ctx) {
  const section = ctx.section || "";
  const path = ctx.path || "";
  if (BLOCKED_SECTIONS.has(section) || BLOCKED_PATHS.has(path)) {
    return Object.fromEntries(plans.map((plan) => [plan.slot, ""]));
  }
  if (ADSENSE_UNITS_ENABLED) {
    return Object.fromEntries(plans.map((plan) => [plan.slot, renderAdsenseBox(plan)]));
  }
  const catalog = promoCatalog({
    practiceHref: ctx.practiceHref || null,
    publishedHrefs: ctx.publishedHrefs,
  });
  const usedIds = new Set();
  const usedHrefs = new Set();
  const rendered = {};
  for (const plan of plans) {
    const promo = pickPromo(catalog, { ...ctx, section, path, slot: plan.slot }, usedIds, usedHrefs);
    if (!promo) {
      rendered[plan.slot] = "";
      continue;
    }
    usedIds.add(promo.id);
    usedHrefs.add(promo.href);
    rendered[plan.slot] = `<div class="house-slot house-slot-${escapeHtml(plan.size)}" data-slot="${escapeHtml(plan.slot)}">${promoLink(promo, plan)}</div>`;
  }
  return rendered;
}

export function housePair(wideHtml, narrowHtml) {
  return `<div class="house-pair">${wideHtml || ""}${narrowHtml || ""}</div>`;
}
