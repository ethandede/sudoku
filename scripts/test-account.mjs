import assert from "node:assert/strict";
import fs from "node:fs";
import {
  longestRun,
  mergeAccount,
  mergeStats,
  migrateSettings,
  migrateStats,
  sanitizeBundle,
  sanitizeProgress,
} from "../functions/account-merge.mjs";
import { mailConfigured, publicOrigin, sendLoginEmail } from "../functions/account-mail.mjs";
import {
  clearCookie,
  normalizeCode,
  normalizeEmail,
  randomCode,
  rateDecision,
  sessionCookie,
} from "../functions/account-core.mjs";
import {
  handleDelete,
  handleRequest,
  handleSession,
  handleSignOut,
  handleSync,
  handleVerifyGet,
  handleVerifyPost,
} from "../functions/account-handlers.mjs";

const sw = fs.readFileSync(new URL("../assets/js/sw.js", import.meta.url), "utf8");
assert.match(sw, /pathname\.startsWith\("\/api\/"\)/);

assert.equal(normalizeEmail("  Ada@Example.com "), "ada@example.com");
assert.equal(normalizeEmail("not-an-email"), "");
assert.equal(normalizeEmail("a@b\n.co"), "");
assert.equal(normalizeCode("123 456"), "123456");
assert.equal(normalizeCode("12345"), "");
assert.match(randomCode(), /^\d{6}$/);
assert.equal(publicOrigin({ url: "https://e3eebf1e.sudokusudoku.pages.dev/api/account/request" }, { CF_PAGES_BRANCH: "main" }), "https://sudokusudoku.com");
assert.equal(publicOrigin({ url: "https://cursor-optional-account-sync.sudokusudoku.pages.dev/x" }, { CF_PAGES_BRANCH: "cursor/canonical-signin-link-12b3" }), "https://cursor-optional-account-sync.sudokusudoku.pages.dev");
assert.equal(publicOrigin({ url: "https://preview.example/x" }, { CF_PAGES_BRANCH: "main", SITE_ORIGIN: "https://sudokusudoku.com/ignored" }), "https://sudokusudoku.com");
assert.equal(mailConfigured({}), false);
assert.equal(mailConfigured({ LOGIN_EMAIL_API_KEY: "secret" }), true);
assert.equal(mailConfigured({ LOGIN_EMAIL: {} }), true);
assert.match(sessionCookie("abc"), /HttpOnly/);
assert.match(sessionCookie("abc"), /Secure/);
assert.match(sessionCookie("abc"), /SameSite=Lax/);
assert.match(sessionCookie("abc"), /Max-Age=15552000/);
assert.match(clearCookie(), /Max-Age=0/);

assert.equal(rateDecision({ emailCount: 5, ipCount: 0, latestAt: 0, now: 100_000 }).ok, false);
assert.equal(rateDecision({ emailCount: 1, ipCount: 20, latestAt: 0, now: 100_000 }).ok, false);
assert.equal(rateDecision({ emailCount: 1, ipCount: 0, latestAt: 90_000, now: 100_000 }).quiet, true);

function day(time, mistakes = 0) {
  return { time, mistakes };
}

const left = {
  daily: {
    played: 3,
    won: 3,
    best: 100,
    totalTime: 300,
    longestStreak: 3,
    completed: { "2026-05-01": day(30), "2026-05-02": day(40), "2026-05-03": day(50) },
  },
  easy: { played: 2, won: 1, best: 90, totalTime: 200 },
};
const right = {
  daily: {
    played: 2,
    won: 2,
    best: 80,
    totalTime: 100,
    longestStreak: 2,
    completed: { "2026-05-03": day(20), "2026-05-04": day(10), "2026-05-05": day(15) },
  },
  easy: { played: 2, won: 2, best: 120, totalTime: 50 },
};
const stats = mergeStats(left, right);
assert.equal(stats.daily.played, 3);
assert.equal(stats.daily.won, 3);
assert.equal(stats.daily.best, 80);
assert.equal(stats.daily.totalTime, 300);
assert.equal(stats.easy.played, 2);
assert.equal(stats.easy.won, 2);
assert.equal(stats.easy.best, 90);
assert.equal(stats.daily.completed["2026-05-01"].time, 30);
assert.equal(stats.daily.completed["2026-05-03"].time, 20);
assert.equal(stats.daily.completed["2026-05-05"].time, 15);
assert.equal(stats.daily.longestStreak, 5);
assert.equal(longestRun(stats.daily.completed), 5);
assert.equal(stats.quick.best, null);

const missingBest = mergeStats(
  { daily: { played: 1, won: 0, best: null, totalTime: 0, completed: {} } },
  { quick: { played: 0, won: 0, best: null, totalTime: 0 } }
);
assert.equal(missingBest.daily.best, null);
assert.equal(missingBest.quick.best, null);
assert.equal(missingBest.easy.best, null);

const historical = mergeStats(
  { daily: { played: 40, won: 40, longestStreak: 40, completed: { "2020-01-01": day(10) } } },
  { daily: { played: 1, won: 1, longestStreak: 1, completed: { "2026-01-02": day(10) } } }
);
assert.equal(historical.daily.longestStreak, 40);
assert.equal(historical.daily.played, 40);
assert.ok(historical.daily.completed["2020-01-01"]);
assert.ok(historical.daily.completed["2026-01-02"]);

const cells = Array(81).fill(0);
const puzzle = {
  version: 1,
  kind: "easy",
  puzzle: cells,
  solution: cells,
  board: cells.slice(),
  notes: Array.from({ length: 81 }, () => []),
  updatedAt: 10,
};
const newer = { ...puzzle, updatedAt: 25, elapsed: 12 };
const mergedProgress = mergeAccount(
  { stats: left, progress: puzzle, progressUpdatedAt: 10 },
  { stats: right, progress: newer, progressUpdatedAt: 25 }
);
assert.equal(mergedProgress.progress.updatedAt, 25);
assert.equal(mergedProgress.progress.elapsed, 12);
assert.equal(mergedProgress.progress.practice, null);
assert.equal(mergedProgress.progress.fastForwarded, false);
const keptPractice = sanitizeProgress({
  ...puzzle,
  practice: "x-wing",
  fastForwarded: true,
  practiceFilled: true,
  practiceMiss: false,
  baseRemoved: [
    { index: 4, digit: 2 },
    { index: 90, digit: 3 },
  ],
});
assert.equal(keptPractice.practice, "x-wing");
assert.equal(keptPractice.fastForwarded, true);
assert.equal(keptPractice.practiceFilled, true);
assert.equal(keptPractice.baseRemoved.length, 1);
assert.equal(keptPractice.baseRemoved[0].digit, 2);
assert.equal(sanitizeProgress({ ...puzzle, practice: "nope" }).practice, null);
assert.equal(mergedProgress.stats.daily.longestStreak, 5);

const kept = mergeAccount(
  { progress: newer, progressUpdatedAt: 25 },
  { progress: puzzle, progressUpdatedAt: 10 }
);
assert.equal(kept.progress.updatedAt, 25);

const cleared = mergeAccount(
  { progress: newer, progressUpdatedAt: 25 },
  { progress: null, progressUpdatedAt: 40 }
);
assert.equal(cleared.progress, null);
assert.equal(cleared.progressUpdatedAt, 40);

const notCleared = mergeAccount(
  { progress: newer, progressUpdatedAt: 25 },
  { progress: null, progressUpdatedAt: 5 }
);
assert.equal(notCleared.progress.updatedAt, 25);

const settings = mergeAccount(
  { settings: { theme: "light", showTimer: false, updatedAt: 1, haptics: true } },
  { settings: { theme: "dark", updatedAt: 5, shareStats: false } }
).settings;
assert.equal(settings.theme, "dark");
assert.equal(settings.showTimer, false);
assert.equal(settings.haptics, true);
assert.equal(settings.shareStats, false);

const skills = mergeAccount(
  { skills: { version: 1, techniques: { pointing: { seen: 2, clean: 2, hinted: 0 } }, badges: ["spotless"], history: [], seeded: true } },
  { skills: { version: 1, techniques: { pointing: { seen: 1, clean: 8, hinted: 1 } }, badges: ["streak-3"], history: [], bestLevel: "hard" } }
).skills;
assert.equal(skills.techniques.pointing.clean, 8);
assert.equal(skills.techniques.pointing.seen, 2);
assert.ok(skills.badges.includes("spotless"));
assert.ok(skills.badges.includes("streak-3"));
assert.equal(skills.bestLevel, "hard");
assert.equal(skills.hintTotals.checks, 0);

const hintedSkills = mergeAccount(
  {
    skills: {
      version: 1,
      techniques: { pointing: { seen: 2, clean: 1, hinted: 1 } },
      history: [
        {
          at: "2026-05-01T00:00:00.000Z",
          level: "hard",
          seconds: 100,
          mistakes: 0,
          hints: 1,
          checks: 2,
          hinted: ["pointing"],
          path: ["pointing"],
        },
      ],
      hintTotals: { checks: 2, levels: { hard: { solves: 3, hints: 4, clean: 1, checks: 2 } } },
      seeded: true,
    },
  },
  {
    skills: {
      version: 1,
      techniques: {},
      history: [
        {
          at: "2026-05-01T00:00:00.000Z",
          level: "hard",
          seconds: 100,
          mistakes: 0,
          hints: 1,
          hinted: ["pointing"],
          path: ["pointing"],
        },
      ],
      seeded: true,
    },
  }
).skills;
assert.equal(hintedSkills.history.length, 1);
assert.equal(hintedSkills.history[0].checks, 2);
assert.equal(hintedSkills.hintTotals.levels.hard.solves, 3);
assert.equal(hintedSkills.hintTotals.levels.hard.hints, 4);
assert.equal(hintedSkills.hintTotals.checks, 2);

const fromHistory = mergeAccount(
  {
    skills: {
      version: 1,
      history: [
        { at: "2026-04-01T00:00:00.000Z", level: "easy", seconds: 30, mistakes: 0, hints: 0, checks: 1, hinted: [], path: ["naked-single"] },
        { at: "2026-04-02T00:00:00.000Z", level: "easy", seconds: 40, mistakes: 0, hints: 2, checks: 0, hinted: ["pointing"], path: ["pointing"] },
      ],
      seeded: true,
    },
  },
  { skills: { version: 1, history: [], seeded: true } }
).skills;
assert.equal(fromHistory.hintTotals.levels.easy.solves, 2);
assert.equal(fromHistory.hintTotals.levels.easy.hints, 2);
assert.equal(fromHistory.hintTotals.levels.easy.clean, 1);
assert.equal(fromHistory.hintTotals.checks, 1);

const keptChecks = sanitizeProgress({ ...puzzle, checks: 4, hintSlugs: ["pointing", "pointing", "nope"] });
assert.equal(keptChecks.checks, 4);
assert.deepEqual(keptChecks.hintSlugs, ["pointing"]);
assert.equal(sanitizeProgress({ ...puzzle, checks: -3 }).checks, 0);

const migrated = migrateStats({
  daily: { played: 2, won: 1, longestStreak: 4, completed: { "2026-01-01": day(10) } },
});
assert.equal(migrated.ok, true);
assert.equal(migrated.changed, true);
assert.equal(migrated.stats.version, 1);
assert.equal(migrated.stats.daily.played, 2);
assert.equal(migrated.stats.daily.longestStreak, 4);
assert.equal(migrateStats({ version: 9 }).ok, false);
assert.equal(migrateStats("{").ok, false);
assert.equal(migrateSettings({ version: 4, theme: "dark" }).ok, false);
assert.equal(migrateSettings({ theme: "dark", checkGuesses: true }).changed, true);

const safe = sanitizeBundle({ stats: { version: 99, daily: { played: 1 } }, progress: { version: 1, kind: "nope" } });
assert.equal(safe.stats, undefined);
assert.equal(safe.progress, undefined);
const preserved = mergeAccount({ stats: migrated.stats }, safe);
assert.equal(preserved.stats.daily.longestStreak, 4);

function memoryDb() {
  const users = [];
  const sessions = [];
  const tokens = [];
  const rows = [];
  function result(changes) {
    return { meta: { changes } };
  }
  function first(sql, args) {
    if (sql.startsWith("SELECT COUNT(*) AS n FROM login_tokens WHERE email")) {
      return { n: tokens.filter((row) => row.email === args[0] && row.created_at > args[1]).length };
    }
    if (sql.startsWith("SELECT COUNT(*) AS n FROM login_tokens WHERE ip_hash")) {
      return { n: tokens.filter((row) => row.ip_hash === args[0] && row.created_at > args[1]).length };
    }
    if (sql.startsWith("SELECT MAX(created_at) AS latest")) {
      const list = tokens.filter((row) => row.email === args[0]).map((row) => row.created_at);
      return { latest: list.length ? Math.max(...list) : null };
    }
    if (sql.startsWith("SELECT id, email, expires_at, used_at, failures FROM login_tokens WHERE token_hash")) {
      return tokens.find((row) => row.token_hash === args[0]) || null;
    }
    if (sql.startsWith("SELECT id, email FROM users")) {
      return users.find((row) => row.email === args[0]) || null;
    }
    if (sql.includes("FROM sessions s JOIN users")) {
      const session = sessions.find((row) => row.token_hash === args[0]);
      if (!session) return null;
      const user = users.find((row) => row.id === session.user_id);
      if (!user) return null;
      return { ...session, email: user.email };
    }
    if (sql.startsWith("SELECT blob, version FROM player_data")) {
      return rows.find((row) => row.user_id === args[0]) || null;
    }
    throw new Error(`unhandled read: ${sql}`);
  }
  function all(sql, args) {
    if (sql.includes("FROM login_tokens") && sql.includes("used_at IS NULL")) {
      return tokens.filter((row) => row.email === args[0] && row.used_at == null && row.expires_at > args[1]);
    }
    throw new Error(`unhandled all: ${sql}`);
  }
  function run(sql, args) {
    if (sql.startsWith("DELETE FROM login_tokens WHERE expires_at")) {
      const before = tokens.length;
      for (let i = tokens.length - 1; i >= 0; i -= 1) if (tokens[i].expires_at < args[0]) tokens.splice(i, 1);
      return result(before - tokens.length);
    }
    if (sql.startsWith("DELETE FROM sessions WHERE expires_at")) {
      const before = sessions.length;
      for (let i = sessions.length - 1; i >= 0; i -= 1) if (sessions[i].expires_at < args[0]) sessions.splice(i, 1);
      return result(before - sessions.length);
    }
    if (sql.startsWith("DELETE FROM login_tokens WHERE id")) {
      const index = tokens.findIndex((row) => row.id === args[0]);
      if (index >= 0) tokens.splice(index, 1);
      return result(index >= 0 ? 1 : 0);
    }
    if (sql.startsWith("DELETE FROM sessions WHERE token_hash")) {
      const before = sessions.length;
      for (let i = sessions.length - 1; i >= 0; i -= 1) if (sessions[i].token_hash === args[0]) sessions.splice(i, 1);
      return result(before - sessions.length);
    }
    if (sql.startsWith("DELETE FROM player_data")) {
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i -= 1) if (rows[i].user_id === args[0]) rows.splice(i, 1);
      return result(before - rows.length);
    }
    if (sql.startsWith("DELETE FROM sessions WHERE user_id")) {
      const before = sessions.length;
      for (let i = sessions.length - 1; i >= 0; i -= 1) if (sessions[i].user_id === args[0]) sessions.splice(i, 1);
      return result(before - sessions.length);
    }
    if (sql.startsWith("DELETE FROM login_tokens WHERE email")) {
      const before = tokens.length;
      for (let i = tokens.length - 1; i >= 0; i -= 1) if (tokens[i].email === args[0]) tokens.splice(i, 1);
      return result(before - tokens.length);
    }
    if (sql.startsWith("DELETE FROM users")) {
      const before = users.length;
      for (let i = users.length - 1; i >= 0; i -= 1) if (users[i].id === args[0]) users.splice(i, 1);
      return result(before - users.length);
    }
    if (sql.startsWith("INSERT INTO login_tokens")) {
      tokens.push({
        id: args[0],
        email: args[1],
        token_hash: args[2],
        code_hash: args[3],
        expires_at: args[4],
        used_at: null,
        failures: 0,
        created_at: args[5],
        ip_hash: args[6],
      });
      return result(1);
    }
    if (sql.startsWith("INSERT INTO users")) {
      if (users.some((row) => row.email === args[1])) throw new Error("unique email");
      users.push({ id: args[0], email: args[1], created_at: args[2] });
      return result(1);
    }
    if (sql.startsWith("INSERT INTO sessions")) {
      sessions.push({
        id: args[0],
        user_id: args[1],
        token_hash: args[2],
        expires_at: args[3],
        created_at: args[4],
        last_seen_at: args[5],
      });
      return result(1);
    }
    if (sql.startsWith("INSERT INTO player_data")) {
      if (rows.some((row) => row.user_id === args[0])) throw new Error("unique user");
      rows.push({ user_id: args[0], blob: args[1], version: 1, updated_at: args[2] });
      return result(1);
    }
    if (sql.startsWith("UPDATE login_tokens SET failures")) {
      let changes = 0;
      tokens.forEach((row) => {
        if (row.email === args[0] && row.used_at == null && row.expires_at > args[1]) {
          row.failures += 1;
          changes += 1;
        }
      });
      return result(changes);
    }
    if (sql.startsWith("UPDATE login_tokens SET used_at")) {
      const row = tokens.find((item) => item.id === args[1] && item.used_at == null);
      if (!row) return result(0);
      row.used_at = args[0];
      return result(1);
    }
    if (sql.startsWith("UPDATE sessions SET last_seen_at = ?, expires_at")) {
      const row = sessions.find((item) => item.id === args[2]);
      if (!row) return result(0);
      row.last_seen_at = args[0];
      row.expires_at = args[1];
      return result(1);
    }
    if (sql.startsWith("UPDATE sessions SET last_seen_at = ? WHERE id")) {
      const row = sessions.find((item) => item.id === args[1]);
      if (!row) return result(0);
      row.last_seen_at = args[0];
      return result(1);
    }
    if (sql.startsWith("UPDATE player_data")) {
      const row = rows.find((item) => item.user_id === args[3] && item.version === args[4]);
      if (!row) return result(0);
      row.blob = args[0];
      row.version = args[1];
      row.updated_at = args[2];
      return result(1);
    }
    throw new Error(`unhandled write: ${sql}`);
  }
  return {
    users,
    sessions,
    tokens,
    rows,
    prepare(sql) {
      const text = sql.replace(/\s+/g, " ").trim();
      return {
        bind(...args) {
          return {
            first: async () => first(text, args),
            all: async () => ({ results: all(text, args) }),
            run: async () => run(text, args),
          };
        },
      };
    },
  };
}

const sent = [];
const db = memoryDb();
const env = {
  STATS_DB: db,
  TURNSTILE_SITE_KEY: "site-key",
  TURNSTILE_SECRET_KEY: "turnstile-secret",
  LOGIN_EMAIL: {
    async send(message) {
      sent.push(message);
      return { messageId: "local" };
    },
  },
};
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  if (String(url).includes("siteverify")) {
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }
  throw new Error(`unexpected fetch ${url}`);
};

function call(handler, { method = "POST", url = "https://sudokusudoku.com/api/account/request", cookie = "", body = null, ip = "203.0.113.8", now = 1_700_000_000_000, env: envOverride = null } = {}) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  if (ip) headers.set("CF-Connecting-IP", ip);
  return handler({
    request: new Request(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }),
    env: envOverride || env,
    now,
  });
}

const bare = await handleSession({ request: new Request("https://sudokusudoku.com/api/account"), env: {} });
assert.deepEqual(await bare.json(), { signedIn: false, ready: false, siteKey: null });

const session = await handleSession({ request: new Request("https://sudokusudoku.com/api/account"), env });
const sessionBody = await session.json();
assert.equal(sessionBody.signedIn, false);
assert.equal(sessionBody.ready, true);
assert.equal(sessionBody.siteKey, "site-key");
assert.equal(JSON.stringify(sessionBody).includes("turnstile-secret"), false);

const missing = await call(handleRequest, { body: { email: "ada@example.com" } });
assert.equal(missing.status, 400);

let now = 1_700_000_000_000;
const first = await call(handleRequest, {
  body: { email: "Ada@Example.com", turnstileToken: "token" },
  now,
});
assert.equal(first.status, 200);
assert.equal(sent.length, 1);
assert.equal(sent[0].to, "ada@example.com");
assert.match(sent[0].text, /enter this code/i);
assert.equal(JSON.stringify(sent[0]).includes("turnstile-secret"), false);
const link = sent[0].text.match(/https:\/\/sudokusudoku.com\/api\/account\/verify\?token=([^\s]+)/);
assert.ok(link);
const code = sent[0].text.match(/code on the site: (\d{6})/)[1];

const quiet = await call(handleRequest, {
  body: { email: "ada@example.com", turnstileToken: "token" },
  now: now + 10_000,
});
assert.equal(quiet.status, 200);
assert.equal(sent.length, 1);

const wrong = await call(handleVerifyPost, {
  url: "https://sudokusudoku.com/api/account/verify",
  body: { email: "ada@example.com", code: "000000" },
  now: now + 20_000,
});
assert.equal(wrong.status, 400);
assert.equal(db.tokens[0].used_at, null);
assert.equal(db.tokens[0].failures, 1);

const coded = await call(handleVerifyPost, {
  url: "https://sudokusudoku.com/api/account/verify",
  body: { email: "ada@example.com", code },
  now: now + 30_000,
});
assert.equal(coded.status, 200);
const cookie = coded.headers.get("set-cookie");
assert.match(cookie, /sudoku_session=/);
assert.match(cookie, /HttpOnly/);
assert.match(cookie, /Secure/);
assert.match(cookie, /SameSite=Lax/);
assert.equal(db.users.length, 1);

now += 61_000;
const secondDevice = await call(handleRequest, {
  body: { email: "ada@example.com", turnstileToken: "token" },
  ip: "203.0.113.20",
  now,
});
assert.equal(secondDevice.status, 200);
const secondCode = sent.at(-1).text.match(/code on the site: (\d{6})/)[1];
const deviceB = await call(handleVerifyPost, {
  url: "https://sudokusudoku.com/api/account/verify",
  body: { email: "ada@example.com", code: secondCode },
  ip: "203.0.113.20",
  now: now + 1000,
});
assert.equal(deviceB.status, 200);
const cookieB = deviceB.headers.get("set-cookie");
assert.match(cookieB, /HttpOnly/);

const phone = await call(handleSync, {
  url: "https://sudokusudoku.com/api/account/sync",
  cookie,
  now: now + 2000,
  body: { stats: left, progress: puzzle, progressUpdatedAt: 10 },
});
assert.equal(phone.status, 200);
assert.equal((await phone.json()).bundle.stats.daily.longestStreak, 3);

const laptop = await call(handleSync, {
  url: "https://sudokusudoku.com/api/account/sync",
  cookie: cookieB,
  now: now + 3000,
  body: { stats: right, progress: newer, progressUpdatedAt: 25 },
});
assert.equal(laptop.status, 200);
const laptopBundle = (await laptop.json()).bundle;
assert.equal(laptopBundle.stats.daily.longestStreak, 5);
assert.equal(laptopBundle.stats.daily.played, 3);
assert.equal(laptopBundle.stats.easy.played, 2);
assert.equal(laptopBundle.stats.easy.won, 2);
assert.equal(laptopBundle.progress.updatedAt, 25);
assert.ok(laptopBundle.stats.daily.completed["2026-05-01"]);
assert.ok(laptopBundle.stats.daily.completed["2026-05-05"]);

const phoneAgain = await call(handleSync, {
  url: "https://sudokusudoku.com/api/account/sync",
  cookie,
  now: now + 4000,
  body: { stats: left, progress: puzzle, progressUpdatedAt: 10 },
});
const phoneKept = (await phoneAgain.json()).bundle;
assert.equal(phoneKept.stats.daily.longestStreak, 5);
assert.equal(phoneKept.progress.updatedAt, 25);
assert.ok(phoneKept.stats.daily.completed["2026-05-04"]);
assert.equal(db.users.length, 1);
assert.equal(db.rows.length, 1);

const again = await call(handleVerifyGet, {
  method: "GET",
  url: `https://sudokusudoku.com/api/account/verify?token=${link[1]}`,
  now: now + 40_000,
});
assert.equal(again.status, 200);
assert.match(again.headers.get("content-type"), /text\/html/);
const againHtml = await again.text();
assert.match(againHtml, /Send a new link/);
assert.match(againHtml, /https:\/\/sudokusudoku\.com\/\?account=invalid/);
assert.equal(againHtml.includes(link[1]), false);

for (let n = 0; n < 3; n += 1) {
  now += 61_000;
  const next = await call(handleRequest, {
    body: { email: "ada@example.com", turnstileToken: "token" },
    now,
  });
  assert.equal(next.status, 200, `request ${n}`);
}
now += 61_000;
const limited = await call(handleRequest, {
  body: { email: "ada@example.com", turnstileToken: "token" },
  now,
});
assert.equal(limited.status, 429);

const otherNow = now + 61_000;
const otherMail = [];
env.LOGIN_EMAIL = {
  async send(message) {
    otherMail.push(message);
    sent.push(message);
  },
};
const bob = await call(handleRequest, {
  body: { email: "bob@example.com", turnstileToken: "token" },
  ip: "203.0.113.9",
  now: otherNow,
});
assert.equal(bob.status, 200);
const bobLink = otherMail[0].text.match(/token=([^\s]+)/)[1];
const bobIn = await call(handleVerifyGet, {
  method: "GET",
  url: `https://sudokusudoku.com/api/account/verify?token=${bobLink}`,
  now: otherNow + 1000,
});
assert.equal(bobIn.status, 303);
assert.match(bobIn.headers.get("Location"), /[?&]account=in$/);
const bobCookie = bobIn.headers.get("set-cookie");

const adaSync = await call(handleSync, {
  url: "https://sudokusudoku.com/api/account/sync",
  cookie,
  now: otherNow + 2000,
  body: {
    stats: left,
    progress: puzzle,
    progressUpdatedAt: 10,
  },
});
assert.equal(adaSync.status, 200);
const adaBundle = (await adaSync.json()).bundle;
assert.equal(adaBundle.stats.daily.longestStreak, 5);
assert.equal(adaBundle.progress.updatedAt, 25);

const bobSync = await call(handleSync, {
  url: "https://sudokusudoku.com/api/account/sync",
  cookie: bobCookie,
  now: otherNow + 3000,
  body: {
    stats: {
      daily: {
        played: 4,
        won: 4,
        best: 70,
        totalTime: 400,
        longestStreak: 9,
        completed: { "2026-06-01": day(12) },
      },
    },
    progress: newer,
    progressUpdatedAt: 25,
  },
});
assert.equal(bobSync.status, 200);
const bobBundle = (await bobSync.json()).bundle;
assert.equal(bobBundle.stats.daily.played, 4);
assert.equal(bobBundle.stats.daily.longestStreak >= 9, true);
assert.equal(bobBundle.stats.daily.completed["2026-05-01"], undefined);
assert.ok(bobBundle.stats.daily.completed["2026-06-01"]);
assert.equal(bobBundle.progress.updatedAt, 25);
assert.equal(db.rows.length, 2);

const adaAgain = await call(handleSync, {
  url: "https://sudokusudoku.com/api/account/sync",
  cookie,
  now: otherNow + 4000,
  body: { stats: left, progress: puzzle, progressUpdatedAt: 10 },
});
const adaKept = (await adaAgain.json()).bundle;
assert.equal(adaKept.stats.daily.longestStreak, 5);
assert.equal(adaKept.progress.updatedAt, 25);
assert.ok(adaKept.stats.daily.completed["2026-05-03"]);

const removed = await call(handleDelete, {
  url: "https://sudokusudoku.com/api/account/delete",
  cookie,
  now: otherNow + 5000,
});
assert.equal(removed.status, 200);
assert.match(removed.headers.get("set-cookie"), /Max-Age=0/);
assert.equal(db.users.some((row) => row.email === "ada@example.com"), false);
assert.equal(db.rows.some((row) => row.blob.includes("2026-05-01")), false);
assert.equal(db.tokens.some((row) => row.email === "ada@example.com"), false);

const afterDelete = await call(handleSync, {
  url: "https://sudokusudoku.com/api/account/sync",
  cookie,
  now: otherNow + 6000,
  body: { stats: left },
});
assert.equal(afterDelete.status, 401);
assert.equal(db.users.length, 1);
assert.equal(db.users[0].email, "bob@example.com");

const signedOut = await call(handleSignOut, {
  url: "https://sudokusudoku.com/api/account/signout",
  cookie: bobCookie,
});
assert.equal(signedOut.status, 200);
const bobGone = await call(handleSync, {
  url: "https://sudokusudoku.com/api/account/sync",
  cookie: bobCookie,
  body: { stats: right },
});
assert.equal(bobGone.status, 401);

const unconfigured = await handleRequest({
  request: new Request("https://sudokusudoku.com/api/account/request", {
    method: "POST",
    headers: { "CF-Connecting-IP": "203.0.113.10" },
    body: JSON.stringify({ email: "ada@example.com", turnstileToken: "token" }),
  }),
  env: { ...env, LOGIN_EMAIL: undefined, LOGIN_EMAIL_API_KEY: undefined },
  now: otherNow + 120_000,
});
assert.equal(unconfigured.status, 503);
const unconfiguredBody = await unconfigured.json();
assert.match(unconfiguredBody.error, /not set up/);
assert.equal(JSON.stringify(unconfiguredBody).includes("secret"), false);

const hostNow = otherNow + 400_000;
const hostMessages = [];
const hostEnv = {
  ...env,
  CF_PAGES_BRANCH: "main",
  LOGIN_EMAIL: {
    async send(message) {
      hostMessages.push(message);
      sent.push(message);
    },
  },
};
const hostRequest = await call(handleRequest, {
  url: "https://e3eebf1e.sudokusudoku.pages.dev/api/account/request",
  body: { email: "host@example.com", turnstileToken: "token" },
  ip: "203.0.113.40",
  now: hostNow,
  env: hostEnv,
});
assert.equal(hostRequest.status, 200);
assert.equal(hostMessages[0].text.includes("e3eebf1e"), false);
const hostToken = hostMessages[0].text.match(/https:\/\/sudokusudoku\.com\/api\/account\/verify\?token=([^\s]+)/)[1];
const hop = await call(handleVerifyGet, {
  method: "GET",
  url: `https://e3eebf1e.sudokusudoku.pages.dev/api/account/verify?token=${hostToken}`,
  now: hostNow + 1000,
  env: hostEnv,
});
assert.equal(hop.status, 302);
const hopUrl = new URL(hop.headers.get("Location"));
assert.equal(hopUrl.origin, "https://sudokusudoku.com");
assert.equal(hopUrl.pathname, "/api/account/verify");
assert.equal(hopUrl.searchParams.get("token"), hostToken);
assert.equal(hop.headers.get("set-cookie"), null);
assert.equal(db.tokens.find((row) => row.email === "host@example.com").used_at, null);
const landed = await call(handleVerifyGet, {
  method: "GET",
  url: hopUrl.toString(),
  now: hostNow + 1000,
  env: hostEnv,
});
assert.equal(landed.status, 303);
assert.equal(landed.headers.get("Location"), "https://sudokusudoku.com/?account=in");
assert.match(landed.headers.get("set-cookie"), /sudoku_session=/);
const reused = await call(handleVerifyGet, {
  method: "GET",
  url: hopUrl.toString(),
  now: hostNow + 2000,
  env: hostEnv,
});
assert.equal(reused.status, 200);
const reusedHtml = await reused.text();
assert.match(reusedHtml, /That sign-in link has expired/);
assert.match(reusedHtml, /Send a new link/);
assert.match(reusedHtml, /https:\/\/sudokusudoku\.com\/\?account=invalid/);
assert.equal(reusedHtml.includes(hostToken), false);

const previewMessages = [];
const previewEnv = {
  ...env,
  CF_PAGES_BRANCH: "cursor/canonical-signin-link-12b3",
  LOGIN_EMAIL: {
    async send(message) {
      previewMessages.push(message);
    },
  },
};
const previewRequest = await call(handleRequest, {
  url: "https://cursor-optional-account-sync.sudokusudoku.pages.dev/api/account/request",
  body: { email: "preview-host@example.com", turnstileToken: "token" },
  ip: "203.0.113.41",
  now: hostNow,
  env: previewEnv,
});
assert.equal(previewRequest.status, 200);
assert.match(previewMessages[0].text, /https:\/\/cursor-optional-account-sync\.sudokusudoku\.pages\.dev\/api\/account\/verify\?token=/);
const previewBad = await call(handleVerifyGet, {
  method: "GET",
  url: "https://cursor-optional-account-sync.sudokusudoku.pages.dev/api/account/verify?token=this-token-is-long-enough-but-unknown",
  env: previewEnv,
});
assert.equal(previewBad.status, 200);
const previewHtml = await previewBad.text();
assert.match(previewHtml, /https:\/\/cursor-optional-account-sync\.sudokusudoku\.pages\.dev\/\?account=invalid/);
assert.equal(previewHtml.includes("sudokusudoku.com"), false);

const wwwHop = await call(handleVerifyGet, {
  method: "GET",
  url: "https://www.sudokusudoku.com/api/account/verify?token=short",
  env: hostEnv,
});
assert.equal(wwwHop.status, 302);
assert.equal(wwwHop.headers.get("Location"), "https://sudokusudoku.com/api/account/verify?token=short");

globalThis.fetch = originalFetch;

const resendCalls = [];
globalThis.fetch = async (url, init) => {
  resendCalls.push({ url: String(url), init });
  return new Response(JSON.stringify({ id: "re_test_123" }), { status: 200, headers: { "content-type": "application/json" } });
};
const resendSent = await sendLoginEmail(
  { LOGIN_EMAIL_API_KEY: "secret-value" },
  { to: "ada@example.com", subject: "Sign in", text: "hello", html: "<p>hello</p>" }
);
assert.equal(resendSent.ok, true);
assert.equal(resendSent.id, "re_test_123");
assert.equal(resendSent.keyLength, "secret-value".length);
assert.equal(resendSent.rePrefix, false);
assert.equal(resendCalls.length, 1);
assert.equal(JSON.stringify(resendCalls[0]).includes("secret-value"), true);
assert.equal(JSON.stringify(resendSent).includes("secret-value"), false);

let deniedAuth = "";
globalThis.fetch = async (_url, init) => {
  deniedAuth = init.headers.Authorization;
  return new Response(JSON.stringify({ message: "The domain is not verified." }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
};
const resendDenied = await sendLoginEmail(
  { LOGIN_EMAIL_API_KEY: "\nBearer secret-value\n" },
  { to: "ada@example.com", subject: "Sign in", text: "hello", html: "<p>hello</p>" }
);
assert.equal(resendDenied.ok, false);
assert.equal(resendDenied.status, 403);
assert.match(resendDenied.error, /not verified/);
assert.equal(resendDenied.keyLength, "\nBearer secret-value\n".length);
assert.equal(resendDenied.sentLength, "secret-value".length);
assert.equal(resendDenied.rePrefix, false);
assert.equal(deniedAuth, "Bearer secret-value");
assert.equal(JSON.stringify(resendDenied).includes("secret-value"), false);
globalThis.fetch = originalFetch;

console.log("account ok");
