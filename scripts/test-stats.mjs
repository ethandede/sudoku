import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  aggregate,
  beatPercent,
  consentRequired,
  finishAction,
  puzzleKeyFrom,
  quantile,
  rateDecision,
  timeBuckets,
  validateFinish,
  validateStart,
} from "../functions/stats-core.mjs";
import { blockedUserAgent, handleConsent, handleFinish, handleStart, handleSummary } from "../functions/stats-handlers.mjs";

const schema = readFileSync(new URL("../migrations/0001_stats.sql", import.meta.url), "utf8")
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

function wrap(sqlite) {
  return {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      const bound = (args) => ({
        async run() {
          statement.run(...args);
        },
        async all() {
          return { results: statement.all(...args).map((row) => ({ ...row })) };
        },
        async first() {
          const row = statement.get(...args);
          return row ? { ...row } : null;
        },
      });
      return {
        bind(...args) {
          return bound(args);
        },
        all() {
          return bound([]).all();
        },
        run() {
          return bound([]).run();
        },
        first() {
          return bound([]).first();
        },
      };
    },
  };
}

function openDb() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(schema);
  return { sqlite, env: { STATS_DB: wrap(sqlite) } };
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function post(path, body, userAgent = BROWSER_UA) {
  return new Request(`https://sudokusudoku.com${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": userAgent },
    body: JSON.stringify(body),
  });
}

function summaryRequest(url = "https://preview.example/api/stats/summary", userAgent = BROWSER_UA) {
  return new Request(url, { headers: { "user-agent": userAgent } });
}

const client = "a".repeat(32);
const other = "b".repeat(32);
const puzzle = "c".repeat(64);
const puzzle2 = "d".repeat(64);

function startBody(overrides = {}) {
  return {
    clientId: client,
    playId: "e".repeat(32),
    puzzleKey: puzzle,
    level: "hard",
    isDaily: false,
    date: null,
    ...overrides,
  };
}

function finishBody(overrides = {}) {
  return {
    clientId: client,
    playId: "e".repeat(32),
    puzzleKey: puzzle,
    outcome: "solved",
    elapsedSeconds: 240,
    mistakes: 1,
    hintsUsed: 2,
    hardestHint: "naked-pair",
    notesUsed: true,
    deviceClass: "phone",
    ...overrides,
  };
}

assert.equal(validateStart(startBody()).ok, true);
assert.equal(validateStart(startBody({ clientId: "nope" })).ok, false);
assert.equal(validateStart(startBody({ level: "medium" })).ok, false);
assert.equal(validateStart(startBody({ isDaily: true, date: null })).ok, false);
assert.equal(validateStart(startBody({ isDaily: true, date: "2026-10-21" })).ok, true);
assert.equal(validateStart(startBody({ date: "2026-10-21" })).ok, false);
assert.equal(validateFinish(finishBody(), "hard").ok, true);
assert.equal(validateFinish(finishBody({ elapsedSeconds: 19 }), "hard").ok, false);
assert.equal(validateFinish(finishBody({ elapsedSeconds: 19, outcome: "failed" }), "hard").ok, true);
assert.equal(validateFinish(finishBody({ elapsedSeconds: 8 }), "quick").ok, true);
assert.equal(validateFinish(finishBody({ elapsedSeconds: 7 }), "quick").ok, false);
assert.equal(validateFinish(finishBody({ elapsedSeconds: 8000 }), "hard").ok, false);
assert.equal(validateFinish(finishBody({ hardestHint: "guess" }), "hard").ok, false);
assert.equal(validateFinish(finishBody({ deviceClass: "Mozilla/5.0" }), "hard").ok, false);
assert.equal(validateFinish(finishBody({ hintsUsed: 0, hardestHint: "naked-pair" }), "hard").hardestHint, null);
assert.equal(validateFinish(finishBody(), "hard").userAgent, undefined);

assert.equal(rateDecision({ recentCount: 39, latestStartedAt: 0, now: 20_000, duplicate: false }).ok, true);
assert.equal(rateDecision({ recentCount: 0, latestStartedAt: 15_000, now: 20_000, duplicate: false }).ok, false);
assert.equal(rateDecision({ recentCount: 40, latestStartedAt: 0, now: 20_000, duplicate: false }).ok, false);
assert.equal(rateDecision({ recentCount: 40, latestStartedAt: 19_000, now: 20_000, duplicate: true }).ok, true);

assert.equal(finishAction(null, { clientId: client }), "reject");
assert.equal(
  finishAction({ client_id: client, puzzle_key: puzzle, outcome: "solved" }, { clientId: client, puzzleKey: puzzle, outcome: "abandoned" }),
  "keep"
);
assert.equal(
  finishAction({ client_id: client, puzzle_key: puzzle, outcome: "abandoned" }, { clientId: client, puzzleKey: puzzle, outcome: "solved" }),
  "update"
);
assert.equal(
  finishAction({ client_id: client, puzzle_key: puzzle, outcome: null }, { clientId: other, puzzleKey: puzzle, outcome: "solved" }),
  "reject"
);

assert.equal(quantile([10, 20, 30, 40], 0.5), 25);
assert.equal(quantile([10, 20, 30], 0.5), 20);
assert.equal(beatPercent([10, 20, 30], 10), null);
const twenty = Array.from({ length: 20 }, (_, index) => (index + 1) * 10);
assert.equal(beatPercent(twenty, 10), 95);
assert.equal(beatPercent(twenty, 200), 0);
const bands = timeBuckets([119, 120, 299, 300, 2399, 2400]);
assert.deepEqual(
  bands.map((band) => band.count),
  [1, 2, 1, 0, 1, 1]
);

assert.equal(consentRequired("DE"), true);
assert.equal(consentRequired("gb"), true);
assert.equal(consentRequired("CH"), true);
assert.equal(consentRequired("US"), false);
assert.equal(consentRequired(""), false);
assert.equal(consentRequired(undefined), false);

const dailyKey = await puzzleKeyFrom("daily:2026-10-21", null);
const givenKey = await puzzleKeyFrom(null, [1, 0, 2]);
assert.equal(dailyKey, await puzzleKeyFrom("daily:2026-10-21", [9, 9, 9]));
assert.notEqual(dailyKey, givenKey);
assert.equal(givenKey.length, 64);

const now = Date.parse("2026-10-21T12:00:00.000Z");
const plays = [];
for (let index = 0; index < 20; index += 1) {
  plays.push({
    level: "hard",
    is_daily: 0,
    puzzle_date: null,
    outcome: index < 14 ? "solved" : index < 17 ? "revealed" : index < 19 ? "failed" : "abandoned",
    elapsed_seconds: 600 + index * 30,
    mistakes: index % 3,
    hints_used: index % 4 === 0 ? 0 : 1,
    hardest_hint: index % 4 === 0 ? null : index % 2 === 0 ? "naked-pair" : "x-wing",
    started_at: now - 2 * 86_400_000,
    finished_at: now - 86_400_000,
  });
}
plays.push({
  level: "not easy",
  is_daily: 1,
  puzzle_date: "2026-10-21",
  outcome: "solved",
  elapsed_seconds: 500,
  mistakes: 0,
  hints_used: 0,
  hardest_hint: null,
  started_at: now,
  finished_at: now,
});
const summary = aggregate(plays, now);
assert.equal(summary.windows["30d"].levels.hard.suppressed, false);
assert.equal(summary.windows["30d"].levels.hard.solvePct, 70);
assert.equal(summary.windows["30d"].levels["not easy"].suppressed, true);
assert.equal(summary.windows["30d"].daily.suppressed, true);
assert.equal(summary.today.daily.suppressed, true);
assert.equal(summary.windows.all.levels.easy.suppressed, true);
assert.equal(summary.windows["30d"].levels.hard.topHint.slug, "x-wing");

{
  const { env, sqlite } = openDb();
  const missing = await handleStart({ request: post("/api/stats/start", startBody()), env: {} });
  assert.equal(missing.status, 503);

  const started = await handleStart({ request: post("/api/stats/start", startBody()), env, now });
  assert.equal(started.status, 200);
  const startedBody = await started.json();
  assert.equal(startedBody.duplicate, false);

  const again = await handleStart({
    request: post("/api/stats/start", startBody({ playId: "f".repeat(32) })),
    env,
    now: now + 20_000,
  });
  assert.equal((await again.json()).playId, startedBody.playId);

  const tooSoon = await handleStart({
    request: post("/api/stats/start", startBody({ playId: "1".repeat(32), puzzleKey: puzzle2 })),
    env,
    now: now + 5_000,
  });
  assert.equal(tooSoon.status, 429);

  const fast = await handleFinish({
    request: post("/api/stats/finish", finishBody({ elapsedSeconds: 10 })),
    env,
    now: now + 30_000,
  });
  assert.equal(fast.status, 400);

  const solved = await handleFinish({
    request: post("/api/stats/finish", finishBody()),
    env,
    now: now + 30_000,
  });
  assert.equal(solved.status, 200);
  const solvedBody = await solved.json();
  assert.equal(solvedBody.community, null);
  assert.equal(solvedBody.today, null);

  const abandoned = await handleFinish({
    request: post("/api/stats/finish", finishBody({ outcome: "abandoned", elapsedSeconds: 5, hintsUsed: 0, hardestHint: "" })),
    env,
    now: now + 40_000,
  });
  assert.equal(abandoned.status, 200);
  const row = sqlite.prepare(`SELECT outcome, elapsed_seconds FROM plays WHERE id = ?`).get("e".repeat(32));
  assert.equal(row.outcome, "solved");
  assert.equal(row.elapsed_seconds, 240);

  const columns = sqlite.prepare(`PRAGMA table_info(plays)`).all().map((column) => column.name);
  for (const forbidden of ["ip", "user_agent", "country", "userAgent"]) {
    assert.equal(columns.includes(forbidden), false);
  }
}

{
  const { env, sqlite } = openDb();
  const base = now - 3 * 86_400_000;
  for (let index = 0; index < 24; index += 1) {
    const id = index.toString(16).padStart(32, "0");
    const key = index.toString(16).padStart(64, "a");
    await handleStart({
      request: post("/api/stats/start", startBody({ clientId: id, playId: id, puzzleKey: key, level: "hard" })),
      env,
      now: base + index * 20_000,
    });
    await handleFinish({
      request: post(
        "/api/stats/finish",
        finishBody({
          clientId: id,
          playId: id,
          puzzleKey: key,
          elapsedSeconds: 180 + index * 40,
          hintsUsed: index % 5 === 0 ? 0 : 1,
          hardestHint: index % 5 === 0 ? "" : "pointing",
          mistakes: index % 2,
        })
      ),
      env,
      now: base + index * 20_000 + 5_000,
    });
  }
  const freshId = "9".repeat(32);
  const freshKey = "9".repeat(64);
  await handleStart({
    request: post("/api/stats/start", startBody({ clientId: freshId, playId: freshId, puzzleKey: freshKey })),
    env,
    now: now - 10_000,
  });
  const beat = await handleFinish({
    request: post("/api/stats/finish", finishBody({ clientId: freshId, playId: freshId, puzzleKey: freshKey, elapsedSeconds: 100 })),
    env,
    now,
  });
  const beatBody = await beat.json();
  assert.equal(beatBody.community.solves, 25);
  assert.equal(beatBody.community.beatPct, 96);
  assert.equal(typeof beatBody.community.medianSeconds, "number");

  for (let index = 0; index < 20; index += 1) {
    const id = `d${index.toString(16).padStart(31, "0")}`;
    const puzzleKey = `d${index.toString(16).padStart(63, "0")}`;
    const startedDaily = await handleStart({
      request: post(
        "/api/stats/start",
        startBody({
          clientId: id,
          playId: id,
          puzzleKey,
          level: "not easy",
          isDaily: true,
          date: "2026-10-21",
        })
      ),
      env,
      now: now - 1_000 - index,
    });
    assert.equal(startedDaily.status, 200);
    await handleFinish({
      request: post(
        "/api/stats/finish",
        finishBody({
          clientId: id,
          playId: id,
          puzzleKey,
          elapsedSeconds: 400 + index,
          outcome: index < 14 ? "solved" : "revealed",
          hintsUsed: 0,
          hardestHint: "",
        })
      ),
      env,
      now: now - index,
    });
  }

  const cache = new Map();
  const cacheStore = {
    async match(request) {
      const stored = cache.get(request.url);
      return stored ? stored.clone() : undefined;
    },
    async put(request, response) {
      cache.set(request.url, response.clone());
    },
  };
  const summaryResponse = await handleSummary({
    request: summaryRequest(),
    env,
    now,
    cache: cacheStore,
  });
  assert.equal(summaryResponse.headers.get("cache-control"), "public, s-maxage=600, max-age=60");
  assert.match(summaryResponse.headers.get("link") || "", /rel=preload/);
  const publicBody = await summaryResponse.json();
  assert.equal(publicBody.windows["30d"].levels.hard.suppressed, false);
  assert.equal(publicBody.windows["30d"].levels.hard.solvePct, 100);
  assert.equal(publicBody.windows["30d"].daily.suppressed, false);
  assert.equal(publicBody.today.daily.solvePct, 70);
  assert.equal(publicBody.windows["30d"].levels["not easy"].finishes, 0);

  let selects = 0;
  const original = env.STATS_DB.prepare;
  env.STATS_DB.prepare = (sql) => {
    if (sql.includes("FROM plays")) selects += 1;
    return original(sql);
  };
  const cached = await handleSummary({
    request: summaryRequest(),
    env,
    now,
    cache: cacheStore,
  });
  assert.equal(selects, 0);
  assert.equal(cached.headers.get("cache-control"), "public, s-maxage=600, max-age=60");

  const staleId = "7".repeat(32);
  sqlite
    .prepare(
      `INSERT INTO plays (
         id, client_id, puzzle_key, level, is_daily, puzzle_date, started_at, created_at
       ) VALUES (?, ?, ?, 'easy', 0, NULL, ?, ?)`
    )
    .run(staleId, staleId, "8".repeat(64), now - 25 * 60 * 60 * 1000, now - 25 * 60 * 60 * 1000);
  await handleStart({
    request: post("/api/stats/start", startBody({ clientId: other, playId: other, puzzleKey: puzzle2, level: "easy" })),
    env,
    now,
  });
  const swept = sqlite.prepare(`SELECT outcome, finished_at, started_at FROM plays WHERE id = ?`).get(staleId);
  assert.equal(swept.outcome, "abandoned");
  assert.equal(swept.finished_at, swept.started_at + 86_400_000);

  const upgraded = await handleFinish({
    request: post(
      "/api/stats/finish",
      finishBody({
        clientId: staleId,
        playId: staleId,
        puzzleKey: "8".repeat(64),
        outcome: "solved",
        elapsedSeconds: 90,
        hintsUsed: 0,
        hardestHint: "",
      })
    ),
    env,
    now: now + 1_000,
  });
  assert.equal(upgraded.status, 200);
  assert.equal(sqlite.prepare(`SELECT outcome FROM plays WHERE id = ?`).get(staleId).outcome, "solved");
}

{
  const required = await handleConsent({ request: { cf: { country: "FR" } } });
  assert.deepEqual(await required.json(), { consentRequired: true });
  assert.equal(required.headers.get("cache-control"), "private, no-store");
  const open = await handleConsent({ request: { cf: { country: "US" } } });
  assert.deepEqual(await open.json(), { consentRequired: false });
  const local = await handleConsent({ request: {} });
  assert.deepEqual(await local.json(), { consentRequired: false });
  assert.match(local.headers.get("link") || "", /rel=preload/);

  const { env, sqlite } = openDb();
  const early = await handleSummary({
    request: summaryRequest("https://sudokusudoku.com/api/stats/summary", "nginx-ssl early hints"),
    env,
    now,
  });
  assert.equal(early.status, 204);
  const headless = await handleStart({
    request: post("/api/stats/start", startBody(), "Mozilla/5.0 HeadlessChrome/131.0.0.0"),
    env,
    now,
  });
  assert.equal(headless.status, 400);
  const emptyAgent = await handleStart({
    request: post("/api/stats/start", startBody({ playId: "2".repeat(32) }), ""),
    env,
    now,
  });
  assert.equal(emptyAgent.status, 400);
  assert.equal(blockedUserAgent(post("/api/stats/start", startBody())), false);
  assert.equal(sqlite.prepare(`SELECT COUNT(*) AS n FROM plays WHERE id = ?`).get("2".repeat(32)).n, 0);
}

const build = readFileSync(new URL("../scripts/build.mjs", import.meta.url), "utf8");
const privacyCall = build.slice(build.indexOf('"privacy-policy/index.html"'), build.indexOf('"privacy-policy/index.html"') + 700);
assert.match(privacyCall, /ads:\s*false/);
assert.match(privacyCall, /analytics:\s*false/);
assert.match(privacyCall, /privacyChoices:\s*false/);
const community = readFileSync(new URL("../assets/js/community.js", import.meta.url), "utf8");
assert.match(community, /SHA-256/);
assert.match(community, /sudoku-anon-id/);
assert.doesNotMatch(community, /"sudoku-stats"/);
const policy = readFileSync(new URL("../privacy-policy-content.html", import.meta.url), "utf8");
assert.match(policy, /sudoku-anon-id/);
assert.match(policy, /analytics storage/);
assert.match(policy, /does not load Google Analytics/);
assert.match(policy, /Cloudflare Web Analytics/);
assert.match(build, /static\.cloudflareinsights\.com\/beacon\.min\.js/);
assert.match(build, /8456007bb7a345e098de29b4d44a2f82/);
const onNew = community.slice(community.indexOf("async function openGame"), community.indexOf("function onNewGame"));
assert.doesNotMatch(onNew, /\/api\/stats\/start/);
const firstMove = community.slice(community.indexOf("async function beginLogging"), community.indexOf("function noteFirstMove"));
assert.match(firstMove, /\/api\/stats\/start/);
assert.match(firstMove, /game_start/);
assert.match(community, /game_complete/);
assert.match(community, /game_abandon/);
assert.match(community, /navigator\.webdriver/);
assert.match(community, /HeadlessChrome/);
const game = readFileSync(new URL("../assets/js/sudoku.js", import.meta.url), "utf8");
assert.match(game, /noteFirstMove/);
assert.match(game, /function markGameplay/);

console.log("stats tests passed");
