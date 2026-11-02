// Pure rules for anonymous puzzle stats. The Pages Functions and the node
// tests both import this file. It does not touch the network or D1.

export const LEVELS = ["quick", "easy", "not easy", "hard", "expert", "mental"];

export const OUTCOMES = ["solved", "revealed", "failed", "abandoned"];

export const TECHNIQUES = [
  { slug: "naked-single", name: "Naked single" },
  { slug: "hidden-single", name: "Hidden single" },
  { slug: "pointing", name: "Pointing" },
  { slug: "claiming", name: "Claiming" },
  { slug: "naked-pair", name: "Naked pair" },
  { slug: "hidden-pair", name: "Hidden pair" },
  { slug: "naked-triple", name: "Naked triple" },
  { slug: "hidden-triple", name: "Hidden triple" },
  { slug: "quads", name: "Quads" },
  { slug: "x-wing", name: "X-wing" },
  { slug: "swordfish", name: "Swordfish" },
  { slug: "xy-wing", name: "XY-wing" },
  { slug: "skyscraper", name: "Skyscraper" },
  { slug: "two-string-kite", name: "Two-string kite" },
  { slug: "xyz-wing", name: "XYZ-wing" },
  { slug: "w-wing", name: "W-wing" },
  { slug: "unique-rectangle", name: "Unique rectangle" },
  { slug: "bug-plus-one", name: "BUG+1" },
  { slug: "coloring", name: "Simple coloring" },
  { slug: "xy-chain", name: "XY-chain" },
];

export const TECHNIQUE_SLUGS = TECHNIQUES.map((item) => item.slug);

export const DEVICE_CLASSES = ["phone", "tablet", "desktop"];

// EEA + UK + Switzerland. Same set as the Consent Mode region list in the
// page layout. A missing country (local wrangler, or no request.cf) does not
// require consent here; the live site always has request.cf.country.
export const CONSENT_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IS", "IE", "IT", "LV", "LI", "LT", "LU", "MT", "NL", "NO", "PL",
  "PT", "RO", "SK", "SI", "ES", "SE", "GB", "CH",
];

export const MIN_FINISHES = 20;

// Plays from building the stats pipeline stay in D1 and out of the public
// sample. The last of those rows started at 2026-10-23T10:44:36Z.
export const PUBLIC_STATS_SINCE = Date.parse("2026-10-23T11:00:00.000Z");

export function publicPlays(plays) {
  return (plays || []).filter((play) => Number(play && play.started_at) >= PUBLIC_STATS_SINCE);
}
export const MIN_SOLVED_FOR_PERCENTILE = 20;
export const MAX_STARTS_PER_DAY = 40;
export const MIN_START_GAP_MS = 10_000;
export const DAY_MS = 86_400_000;
export const WINDOW_MS = 30 * DAY_MS;
export const ABANDON_AFTER_MS = DAY_MS;

// Active seconds. The floor applies to solved and revealed only, so a
// four-mistake fail or an abandon can be short. Quick is the only level
// with a floor under 20 seconds.
export const MIN_SOLVED_SECONDS = {
  quick: 8,
  easy: 20,
  "not easy": 20,
  hard: 20,
  expert: 20,
  mental: 20,
};

export const MAX_SECONDS = {
  quick: 1800,
  easy: 2700,
  "not easy": 5400,
  hard: 7200,
  expert: 10800,
  mental: 14400,
};

export const TIME_BUCKETS = [
  { id: "lt2", label: "Under 2 min", max: 120 },
  { id: "m2", label: "2–5 min", max: 300 },
  { id: "m5", label: "5–10 min", max: 600 },
  { id: "m10", label: "10–20 min", max: 1200 },
  { id: "m20", label: "20–40 min", max: 2400 },
  { id: "m40", label: "40 min+", max: Infinity },
];

const HEX_32 = /^[a-f0-9]{32}$/;
const HEX_64 = /^[a-f0-9]{64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TECHNIQUE_INDEX = new Map(TECHNIQUES.map((item, index) => [item.slug, index]));
const TECHNIQUE_NAME = new Map(TECHNIQUES.map((item) => [item.slug, item.name]));

export function consentRequired(country) {
  if (!country) return false;
  return CONSENT_REGIONS.includes(String(country).toUpperCase());
}

export function utcDate(now) {
  return new Date(now).toISOString().slice(0, 10);
}

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(String(text));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Seed string when the generator supplied one, otherwise the 81 givens
// concatenated with no separator. Keep this in step with assets/js/community.js.
export async function puzzleKeyFrom(seed, givens) {
  const material =
    typeof seed === "string" && seed.length > 0
      ? seed
      : Array.isArray(givens)
        ? givens.join("")
        : "";
  return sha256Hex(material);
}

function integer(value, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

export function validateStart(body) {
  if (!body || typeof body !== "object") return { ok: false };
  const clientId = body.clientId;
  const playId = body.playId;
  const puzzleKey = body.puzzleKey;
  const level = body.level;
  if (typeof clientId !== "string" || !HEX_32.test(clientId)) return { ok: false };
  if (typeof playId !== "string" || !HEX_32.test(playId)) return { ok: false };
  if (typeof puzzleKey !== "string" || !HEX_64.test(puzzleKey)) return { ok: false };
  if (!LEVELS.includes(level)) return { ok: false };
  if (typeof body.isDaily !== "boolean") return { ok: false };
  let date = null;
  if (body.isDaily) {
    if (typeof body.date !== "string" || !DATE_RE.test(body.date)) return { ok: false };
    date = body.date;
  } else if (body.date != null) {
    return { ok: false };
  }
  return { ok: true, clientId, playId, puzzleKey, level, isDaily: body.isDaily, date };
}

export function validateFinish(body, level) {
  if (!body || typeof body !== "object") return { ok: false };
  if (!LEVELS.includes(level)) return { ok: false };
  const clientId = body.clientId;
  const playId = body.playId;
  const puzzleKey = body.puzzleKey;
  if (typeof clientId !== "string" || !HEX_32.test(clientId)) return { ok: false };
  if (typeof playId !== "string" || !HEX_32.test(playId)) return { ok: false };
  if (typeof puzzleKey !== "string" || !HEX_64.test(puzzleKey)) return { ok: false };
  if (!OUTCOMES.includes(body.outcome)) return { ok: false };
  const elapsedSeconds = integer(body.elapsedSeconds, 0, MAX_SECONDS[level]);
  if (elapsedSeconds == null) return { ok: false };
  if ((body.outcome === "solved" || body.outcome === "revealed") && elapsedSeconds < MIN_SOLVED_SECONDS[level]) {
    return { ok: false };
  }
  const mistakes = integer(body.mistakes, 0, 12);
  const hintsUsed = integer(body.hintsUsed, 0, 80);
  if (mistakes == null || hintsUsed == null) return { ok: false };
  let hardestHint = body.hardestHint == null ? "" : body.hardestHint;
  if (typeof hardestHint !== "string") return { ok: false };
  if (hintsUsed === 0) hardestHint = "";
  if (hardestHint && !TECHNIQUE_SLUGS.includes(hardestHint)) return { ok: false };
  if (typeof body.notesUsed !== "boolean") return { ok: false };
  if (!DEVICE_CLASSES.includes(body.deviceClass)) return { ok: false };
  return {
    ok: true,
    clientId,
    playId,
    puzzleKey,
    outcome: body.outcome,
    elapsedSeconds,
    mistakes,
    hintsUsed,
    hardestHint: hardestHint || null,
    notesUsed: body.notesUsed,
    deviceClass: body.deviceClass,
  };
}

export function rateDecision({ recentCount, latestStartedAt, now, duplicate }) {
  if (duplicate) return { ok: true };
  if (latestStartedAt != null && now - latestStartedAt < MIN_START_GAP_MS) {
    return { ok: false, reason: "gap" };
  }
  if (recentCount >= MAX_STARTS_PER_DAY) return { ok: false, reason: "day" };
  return { ok: true };
}

// solved, revealed, and failed stay. abandoned can be upgraded. A second
// finish of the same kind does not rewrite the row.
export function finishAction(existing, next) {
  if (!existing) return "reject";
  if (existing.client_id !== next.clientId) return "reject";
  if (existing.puzzle_key !== next.puzzleKey) return "reject";
  if (existing.outcome === "solved" || existing.outcome === "revealed" || existing.outcome === "failed") {
    return "keep";
  }
  if (existing.outcome === "abandoned" && next.outcome === "abandoned") return "keep";
  return "update";
}

export function quantile(sorted, p) {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const value = sorted[lower] * (upper - position) + sorted[upper] * (position - lower);
  return Math.round(value);
}

export function beatPercent(times, seconds) {
  if (!Array.isArray(times) || times.length < MIN_SOLVED_FOR_PERCENTILE) return null;
  const slower = times.reduce((count, time) => count + (time > seconds ? 1 : 0), 0);
  return Math.round((100 * slower) / times.length);
}

function percent(part, whole) {
  if (!whole) return 0;
  return Math.round((100 * part) / whole);
}

function techniqueRank(slug) {
  return TECHNIQUE_INDEX.has(slug) ? TECHNIQUE_INDEX.get(slug) : -1;
}

export function timeBuckets(secondsList) {
  const counts = TIME_BUCKETS.map(() => 0);
  secondsList.forEach((seconds) => {
    const index = TIME_BUCKETS.findIndex((bucket) => seconds < bucket.max);
    const slot = index === -1 ? TIME_BUCKETS.length - 1 : index;
    counts[slot] += 1;
  });
  return TIME_BUCKETS.map((bucket, index) => ({
    id: bucket.id,
    label: bucket.label,
    count: counts[index],
  }));
}

function hintMode(finishes) {
  const counts = new Map();
  finishes.forEach((play) => {
    if (!play.hints_used || !play.hardest_hint) return;
    counts.set(play.hardest_hint, (counts.get(play.hardest_hint) || 0) + 1);
  });
  const ranked = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return techniqueRank(b[0]) - techniqueRank(a[0]);
  });
  return ranked.slice(0, 5).map(([slug, count]) => ({
    slug,
    name: TECHNIQUE_NAME.get(slug) || slug,
    count,
  }));
}

export function summarizeBucket(starts, finishes) {
  const startCount = starts.length;
  const finishCount = finishes.length;
  if (finishCount < MIN_FINISHES) {
    return { suppressed: true, starts: startCount, finishes: finishCount };
  }
  const solved = finishes.filter((play) => play.outcome === "solved");
  const revealed = finishes.filter((play) => play.outcome === "revealed");
  const failed = finishes.filter((play) => play.outcome === "failed");
  const abandoned = finishes.filter((play) => play.outcome === "abandoned");
  const solvedTimes = solved
    .map((play) => play.elapsed_seconds)
    .filter((seconds) => typeof seconds === "number")
    .sort((a, b) => a - b);
  const mistakeTimes = solved
    .map((play) => play.mistakes)
    .filter((value) => typeof value === "number")
    .sort((a, b) => a - b);
  const noHints = solved.filter((play) => !play.hints_used).length;
  const topHints = hintMode(finishes);
  const hintTotal = solved.reduce((sum, play) => sum + Math.max(0, play.hints_used | 0), 0);
  const avgHints = solved.length ? Math.round((hintTotal / solved.length) * 10) / 10 : null;
  return {
    suppressed: false,
    starts: startCount,
    finishes: finishCount,
    solved: solved.length,
    revealed: revealed.length,
    failed: failed.length,
    abandoned: abandoned.length,
    solvePct: percent(solved.length, finishCount),
    revealedPct: percent(revealed.length, finishCount),
    failedPct: percent(failed.length, finishCount),
    abandonedPct: percent(abandoned.length, finishCount),
    medianSeconds: quantile(solvedTimes, 0.5),
    p25Seconds: quantile(solvedTimes, 0.25),
    p75Seconds: quantile(solvedTimes, 0.75),
    medianMistakes: quantile(mistakeTimes, 0.5),
    noHintPct: solved.length ? percent(noHints, solved.length) : null,
    avgHints,
    topHint: topHints[0] || null,
    timeBuckets: timeBuckets(solvedTimes),
    topHints,
  };
}

function isDaily(play) {
  return play.is_daily === 1 || play.is_daily === true;
}

function inStartWindow(play, since) {
  return play.started_at >= since;
}

function inFinishWindow(play, since) {
  return Boolean(play.outcome) && play.finished_at != null && play.finished_at >= since;
}

function sliceBucket(plays, predicate, since) {
  const matching = plays.filter(predicate);
  const starts = since == null ? matching : matching.filter((play) => inStartWindow(play, since));
  const finishes = matching.filter((play) =>
    since == null ? Boolean(play.outcome) : inFinishWindow(play, since)
  );
  return summarizeBucket(starts, finishes);
}

export function aggregate(plays, now) {
  const since = now - WINDOW_MS;
  const today = utcDate(now);
  const levels = (windowSince) => {
    const out = {};
    LEVELS.forEach((level) => {
      out[level] = sliceBucket(plays, (play) => play.level === level && !isDaily(play), windowSince);
    });
    return out;
  };
  const daily = (windowSince) => sliceBucket(plays, (play) => isDaily(play), windowSince);
  const todayPlays = plays.filter((play) => isDaily(play) && play.puzzle_date === today);
  return {
    generatedAt: new Date(now).toISOString(),
    windowDays: 30,
    minFinishes: MIN_FINISHES,
    windows: {
      "30d": { levels: levels(since), daily: daily(since) },
      all: { levels: levels(null), daily: daily(null) },
    },
    today: {
      date: today,
      daily: summarizeBucket(
        todayPlays,
        todayPlays.filter((play) => play.outcome)
      ),
    },
  };
}

export function communityFromTimes(times, seconds) {
  const beatPct = beatPercent(times, seconds);
  if (beatPct == null) return null;
  const sorted = times.slice().sort((a, b) => a - b);
  return {
    beatPct,
    medianSeconds: quantile(sorted, 0.5),
    solves: times.length,
  };
}
