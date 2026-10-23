import {
  ABANDON_AFTER_MS,
  DAY_MS,
  aggregate,
  communityFromTimes,
  consentRequired,
  finishAction,
  PUBLIC_STATS_SINCE,
  publicPlays,
  rateDecision,
  summarizeBucket,
  utcDate,
  validateFinish,
  validateStart,
} from "./stats-core.mjs";

const PRIVATE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "private, no-store",
};

function json(body, status = 200, headers = PRIVATE_HEADERS) {
  return new Response(JSON.stringify(body), { status, headers });
}

async function readJson(request) {
  let text;
  try {
    text = await request.text();
  } catch {
    return { error: json({ error: "invalid" }, 400) };
  }
  if (text.length > 4000) return { error: json({ error: "invalid" }, 400) };
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { error: json({ error: "invalid" }, 400) };
    }
    return { body };
  } catch {
    return { error: json({ error: "invalid" }, 400) };
  }
}

function database(env) {
  return env && env.STATS_DB ? env.STATS_DB : null;
}

// Plays are a person moving a digit or a note. Headless browsers and
// requests with no user agent are not recorded. A missing headers object
// (unit tests that pass a plain object) is treated as blocked too, except
// the read-path helper below, which only skips when a real header is present.
export function blockedUserAgent(request) {
  const ua = userAgent(request);
  if (ua == null || !String(ua).trim()) return true;
  return /HeadlessChrome/i.test(ua);
}

function userAgent(request) {
  if (!request || !request.headers || typeof request.headers.get !== "function") return null;
  const value = request.headers.get("user-agent");
  return value == null ? "" : String(value);
}

// Empty agents, HeadlessChrome, and Cloudflare's own Early Hints probes
// should not run the summary query. Probes usually never reach Pages, but
// a request that does arrive with one of these agents is not a visitor.
function skipStatsRead(request) {
  const ua = userAgent(request);
  if (ua == null) return false;
  if (!ua.trim()) return true;
  if (/HeadlessChrome/i.test(ua)) return true;
  return /early hints/i.test(ua);
}

// A preload Link header gives the Pages Early Hints cache something to
// store. On 22 Oct 2026 every 504 for /api/stats/summary (63) and
// /api/stats/consent (55) was an Early Hints probe ("nginx-ssl early hints"
// or "fl2 early hints") with origin status 0. Those probes do not run this
// function. A 504 only means no Link header was cached for that URL yet.
// The plays table was 57 rows and the real responses were fast.
const EARLY_HINT_LINK = "</favicon.svg>; rel=preload; as=image";

function withHint(headers) {
  return { ...headers, link: EARLY_HINT_LINK };
}

export async function sweepAbandoned(db, now) {
  await db
    .prepare(
      `UPDATE plays
       SET outcome = 'abandoned', finished_at = started_at + ?
       WHERE outcome IS NULL AND started_at < ?`
    )
    .bind(ABANDON_AFTER_MS, now - ABANDON_AFTER_MS)
    .run();
}

async function findByClientPuzzle(db, clientId, puzzleKey) {
  return db
    .prepare(`SELECT * FROM plays WHERE client_id = ? AND puzzle_key = ?`)
    .bind(clientId, puzzleKey)
    .first();
}

export async function handleStart({ request, env, now = Date.now() }) {
  if (blockedUserAgent(request)) return json({ error: "invalid" }, 400);
  const db = database(env);
  if (!db) return json({ error: "unavailable" }, 503);
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const start = validateStart(parsed.body);
  if (!start.ok) return json({ error: "invalid" }, 400);

  try {
    await sweepAbandoned(db, now);
    const existing = await findByClientPuzzle(db, start.clientId, start.puzzleKey);
    if (existing) return json({ ok: true, playId: existing.id, duplicate: true });

    const recent = await db
      .prepare(
        `SELECT COUNT(*) AS n, MAX(started_at) AS latest
         FROM plays WHERE client_id = ? AND started_at > ?`
      )
      .bind(start.clientId, now - DAY_MS)
      .first();
    const decision = rateDecision({
      recentCount: Number(recent && recent.n) || 0,
      latestStartedAt: recent && recent.latest != null ? Number(recent.latest) : null,
      now,
      duplicate: false,
    });
    if (!decision.ok) return json({ error: "limited" }, 429);

    await db
      .prepare(
        `INSERT INTO plays (
           id, client_id, puzzle_key, level, is_daily, puzzle_date, started_at, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        start.playId,
        start.clientId,
        start.puzzleKey,
        start.level,
        start.isDaily ? 1 : 0,
        start.date,
        now,
        now
      )
      .run();
    return json({ ok: true, playId: start.playId, duplicate: false });
  } catch (error) {
    const message = String((error && error.message) || error);
    if (/unique/i.test(message)) {
      const existing = await findByClientPuzzle(db, start.clientId, start.puzzleKey);
      if (existing) return json({ ok: true, playId: existing.id, duplicate: true });
    }
    return json({ error: "unavailable" }, 500);
  }
}

async function solvedSeconds(db, row, since) {
  const query = row.is_daily
    ? await db
        .prepare(
          `SELECT elapsed_seconds AS seconds FROM plays
           WHERE outcome = 'solved' AND is_daily = 1
             AND elapsed_seconds IS NOT NULL AND finished_at >= ?
             AND started_at >= ?`
        )
        .bind(since, PUBLIC_STATS_SINCE)
        .all()
    : await db
        .prepare(
          `SELECT elapsed_seconds AS seconds FROM plays
           WHERE outcome = 'solved' AND is_daily = 0 AND level = ?
             AND elapsed_seconds IS NOT NULL AND finished_at >= ?
             AND started_at >= ?`
        )
        .bind(row.level, since, PUBLIC_STATS_SINCE)
        .all();
  return (query.results || []).map((item) => item.seconds);
}

async function todayPayload(db, date) {
  const listed = await db
    .prepare(
      `SELECT outcome, elapsed_seconds, mistakes, hints_used, hardest_hint
       FROM plays WHERE is_daily = 1 AND puzzle_date = ? AND started_at >= ?`
    )
    .bind(date, PUBLIC_STATS_SINCE)
    .all();
  const rows = listed.results || [];
  const finishes = rows.filter((play) => play.outcome);
  const bucket = summarizeBucket(rows, finishes);
  if (bucket.suppressed) return { suppressed: true, finishes: bucket.finishes };
  return {
    suppressed: false,
    solvePct: bucket.solvePct,
    medianSeconds: bucket.medianSeconds,
    finishes: bucket.finishes,
  };
}

export async function handleFinish({ request, env, now = Date.now() }) {
  if (blockedUserAgent(request)) return json({ error: "invalid" }, 400);
  const db = database(env);
  if (!db) return json({ error: "unavailable" }, 503);
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;

  try {
    const hinted = parsed.body || {};
    const located =
      (hinted.playId &&
        (await db.prepare(`SELECT * FROM plays WHERE id = ?`).bind(hinted.playId).first())) ||
      (hinted.clientId && hinted.puzzleKey
        ? await findByClientPuzzle(db, hinted.clientId, hinted.puzzleKey)
        : null);
    if (!located) return json({ error: "invalid" }, 400);
    const finish = validateFinish(hinted, located.level);
    if (!finish.ok) return json({ error: "invalid" }, 400);
    const action = finishAction(located, finish);
    if (action === "reject") return json({ error: "invalid" }, 400);

    let stored = located;
    if (action === "update") {
      await db
        .prepare(
          `UPDATE plays
           SET outcome = ?, finished_at = ?, elapsed_seconds = ?, mistakes = ?,
               hints_used = ?, hardest_hint = ?, notes_used = ?, device_class = ?
           WHERE id = ? AND (outcome IS NULL OR outcome = 'abandoned')`
        )
        .bind(
          finish.outcome,
          now,
          finish.elapsedSeconds,
          finish.mistakes,
          finish.hintsUsed,
          finish.hardestHint,
          finish.notesUsed ? 1 : 0,
          finish.deviceClass,
          located.id
        )
        .run();
      stored = {
        ...located,
        outcome: finish.outcome,
        elapsed_seconds: finish.elapsedSeconds,
        finished_at: now,
      };
    }

    let community = null;
    if (stored.outcome === "solved" && stored.elapsed_seconds != null) {
      const times = await solvedSeconds(db, stored, now - 30 * DAY_MS);
      community = communityFromTimes(times, stored.elapsed_seconds);
    }
    const today = stored.is_daily ? await todayPayload(db, stored.puzzle_date || utcDate(now)) : null;
    return json({ ok: true, community, today });
  } catch {
    return json({ error: "unavailable" }, 500);
  }
}

function summaryCacheKey(request) {
  const url = new URL(request.url);
  return new Request(`${url.origin}/api/stats/summary`, { method: "GET" });
}

export async function handleSummary({ request, env, now = Date.now(), cache }) {
  if (skipStatsRead(request)) return new Response(null, { status: 204, headers: withHint(PRIVATE_HEADERS) });
  const db = database(env);
  if (!db) return json({ error: "unavailable" }, 503);
  const cacheStore = cache || (typeof caches !== "undefined" ? caches.default : null);
  const cacheKey = summaryCacheKey(request);
  if (cacheStore) {
    try {
      const hit = await cacheStore.match(cacheKey);
      if (hit) return hit;
    } catch {
      /* cache is optional */
    }
  }

  try {
    await sweepAbandoned(db, now);
    const listed = await db
      .prepare(
        `SELECT level, is_daily, puzzle_date, outcome, elapsed_seconds, mistakes,
                hints_used, hardest_hint, started_at, finished_at
         FROM plays`
      )
      .all();
    const body = aggregate(publicPlays(listed.results || []), now);
    const response = new Response(JSON.stringify(body), {
      status: 200,
      headers: withHint({
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, s-maxage=600, max-age=60",
      }),
    });
    if (cacheStore) {
      try {
        await cacheStore.put(cacheKey, response.clone());
      } catch {
        /* cache is optional */
      }
    }
    return response;
  } catch {
    return json({ error: "unavailable" }, 500);
  }
}

export async function handleConsent({ request }) {
  if (skipStatsRead(request)) return new Response(null, { status: 204, headers: withHint(PRIVATE_HEADERS) });
  const country = request && request.cf && request.cf.country ? String(request.cf.country) : "";
  return json({ consentRequired: consentRequired(country) }, 200, withHint(PRIVATE_HEADERS));
}
