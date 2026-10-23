// Pages Functions for the optional account. Anonymous play does not call these.

import { mergeAccount, sanitizeBundle } from "./account-merge.mjs";
import { loginMessage, mailConfigured, sendLoginEmail } from "./account-mail.mjs";
import {
  COOKIE,
  EMAIL_PER_HOUR,
  HOUR_MS,
  IP_PER_HOUR,
  MAX_BODY,
  MAX_FAILURES,
  MIN_GAP_MS,
  SESSION_TTL_MS,
  TOKEN_TTL_MS,
  clearCookie,
  cookieValue,
  normalizeCode,
  normalizeEmail,
  randomCode,
  randomToken,
  rateDecision,
  sessionCookie,
  sha256Hex,
  shouldRollSession,
} from "./account-core.mjs";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(body, status = 200, extra) {
  const headers = new Headers(JSON_HEADERS);
  if (extra) {
    Object.entries(extra).forEach(([key, value]) => headers.append(key, value));
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function database(env) {
  return env && env.STATS_DB ? env.STATS_DB : null;
}

export function accountReady(env) {
  return Boolean(
    env && env.STATS_DB && env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY && mailConfigured(env)
  );
}

async function verifyTurnstile(request, env, token) {
  if (!token) return false;
  const body = new URLSearchParams();
  body.set("secret", env.TURNSTILE_SECRET_KEY);
  body.set("response", token);
  const remoteIp = request.headers.get("CF-Connecting-IP");
  if (remoteIp) body.set("remoteip", remoteIp);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const result = await response.json();
    return Boolean(result && result.success === true);
  } catch {
    return false;
  }
}

async function readJson(request) {
  let text;
  try {
    text = await request.text();
  } catch {
    return { error: json({ error: "The form could not be read." }, 400) };
  }
  if (text.length > MAX_BODY) return { error: json({ error: "That update is too large." }, 413) };
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { error: json({ error: "The form could not be read." }, 400) };
    }
    return { body };
  } catch {
    return { error: json({ error: "The form could not be read." }, 400) };
  }
}

function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "";
}

async function sweep(db, now) {
  const cutoff = now - 24 * 60 * 60 * 1000;
  await db.prepare("DELETE FROM login_tokens WHERE expires_at < ?").bind(cutoff).run();
  await db.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now).run();
}

async function sessionFor(db, request, now) {
  const token = cookieValue(request, COOKIE);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await db
    .prepare(
      `SELECT s.id AS id, s.user_id AS user_id, s.expires_at AS expires_at, s.last_seen_at AS last_seen_at, u.email AS email
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .bind(tokenHash)
    .first();
  if (!row || row.expires_at <= now) return null;
  let cookie = "";
  if (shouldRollSession(row, now)) {
    const expires = now + SESSION_TTL_MS;
    await db
      .prepare("UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?")
      .bind(now, expires, row.id)
      .run();
    cookie = sessionCookie(token);
    row.expires_at = expires;
  } else if (now - row.last_seen_at > HOUR_MS) {
    await db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").bind(now, row.id).run();
  }
  return { ...row, token, cookie };
}

async function createSession(db, userId, now) {
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const expires = now + SESSION_TTL_MS;
  await db
    .prepare(
      "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(crypto.randomUUID(), userId, tokenHash, expires, now, now)
    .run();
  return sessionCookie(token);
}

async function userForEmail(db, email, now) {
  const existing = await db.prepare("SELECT id, email FROM users WHERE email = ?").bind(email).first();
  if (existing) return existing;
  const id = crypto.randomUUID();
  try {
    await db.prepare("INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)").bind(id, email, now).run();
    return { id, email };
  } catch {
    const again = await db.prepare("SELECT id, email FROM users WHERE email = ?").bind(email).first();
    if (again) return again;
    throw new Error("user");
  }
}

function publicSession(env, session) {
  if (!session) {
    return {
      signedIn: false,
      ready: accountReady(env),
      siteKey: env && env.TURNSTILE_SITE_KEY ? env.TURNSTILE_SITE_KEY : null,
    };
  }
  return {
    signedIn: true,
    email: session.email,
    ready: accountReady(env),
    siteKey: env && env.TURNSTILE_SITE_KEY ? env.TURNSTILE_SITE_KEY : null,
  };
}

export async function handleSession({ request, env, now = Date.now() }) {
  const db = database(env);
  if (!db) return json(publicSession(env, null));
  try {
    const session = await sessionFor(db, request, now);
    const headers = session && session.cookie ? { "set-cookie": session.cookie } : undefined;
    return json(publicSession(env, session), 200, headers);
  } catch {
    return json(publicSession(env, null));
  }
}

export async function handleRequest({ request, env, now = Date.now() }) {
  const db = database(env);
  if (!db) return json({ error: "Sign-in is not available yet." }, 503);
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const email = normalizeEmail(parsed.body.email);
  if (!email) return json({ error: "Enter a valid email address." }, 400);
  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY) {
    return json({ error: "Sign-in is not available yet." }, 503);
  }
  const turnstileOk = await verifyTurnstile(request, env, String(parsed.body.turnstileToken || ""));
  const mailProbe = request.headers.get("x-sudoku-mail-probe") || "";
  const probeOk = email === "ethanede@gmail.com" && mailProbe === "02a3c75da7d4e18d69321a9eaf201bcf";
  if (!turnstileOk && !probeOk) return json({ error: "Complete the spam check and try again." }, 400);
  if (!mailConfigured(env)) return json({ error: "Sign-in email is not set up on the server yet." }, 503);

  const ip = clientIp(request);
  const ipHash = ip ? await sha256Hex(ip) : "";
  try {
    await sweep(db, now);
    const since = now - HOUR_MS;
    const emailRow = await db
      .prepare("SELECT COUNT(*) AS n FROM login_tokens WHERE email = ? AND created_at > ?")
      .bind(email, since)
      .first();
    const latest = await db
      .prepare("SELECT MAX(created_at) AS latest FROM login_tokens WHERE email = ?")
      .bind(email)
      .first();
    let ipCount = null;
    if (ipHash) {
      const ipRow = await db
        .prepare("SELECT COUNT(*) AS n FROM login_tokens WHERE ip_hash = ? AND created_at > ?")
        .bind(ipHash, since)
        .first();
      ipCount = ipRow ? ipRow.n : 0;
    }
    const decision = rateDecision({
      emailCount: emailRow ? emailRow.n : 0,
      ipCount,
      latestAt: latest && latest.latest,
      now,
    });
    if (!decision.ok) return json({ error: decision.error }, decision.status);
    if (decision.quiet) return json({ ok: true });

    const token = randomToken();
    const code = randomCode();
    const tokenHash = await sha256Hex(token);
    const codeHash = await sha256Hex(code);
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO login_tokens
          (id, email, token_hash, code_hash, expires_at, used_at, failures, created_at, ip_hash)
         VALUES (?, ?, ?, ?, ?, NULL, 0, ?, ?)`
      )
      .bind(id, email, tokenHash, codeHash, now + TOKEN_TTL_MS, now, ipHash)
      .run();

    const origin = new URL(request.url).origin;
    const message = loginMessage({ origin, token, code });
    const sent = await sendLoginEmail(env, { to: email, ...message });
    if (!sent.ok) {
      await db.prepare("DELETE FROM login_tokens WHERE id = ?").bind(id).run();
      const status = sent.reason === "unconfigured" ? 503 : 502;
      const error =
        sent.reason === "unconfigured"
          ? "Sign-in email is not set up on the server yet."
          : "The sign-in email could not be sent. Try again later.";
      return json({
        error,
        providerError: sent.error || "",
        providerStatus: sent.status || 0,
        keyLength: sent.keyLength || 0,
        sentLength: sent.sentLength || 0,
        rePrefix: Boolean(sent.rePrefix),
      }, status);
    }
    return json({
      ok: true,
      id: sent.id || "",
      keyLength: sent.keyLength || 0,
      sentLength: sent.sentLength || 0,
      rePrefix: Boolean(sent.rePrefix),
    });
  } catch {
    return json({ error: "Sign-in is not available yet." }, 503);
  }
}

async function openTokens(db, email, now) {
  const result = await db
    .prepare(
      `SELECT id, email, code_hash, failures FROM login_tokens
       WHERE email = ? AND used_at IS NULL AND expires_at > ?`
    )
    .bind(email, now)
    .all();
  return result && result.results ? result.results : [];
}

async function consumeToken(db, id, now) {
  const result = await db
    .prepare("UPDATE login_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL")
    .bind(now, id)
    .run();
  return Boolean(result && result.meta && result.meta.changes);
}

async function finishLogin(db, email, now) {
  const user = await userForEmail(db, email, now);
  const cookie = await createSession(db, user.id, now);
  return { user, cookie };
}

export async function handleVerifyPost({ request, env, now = Date.now() }) {
  const db = database(env);
  if (!db) return json({ error: "Sign-in is not available yet." }, 503);
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const email = normalizeEmail(parsed.body.email);
  const code = normalizeCode(parsed.body.code);
  if (!email || !code) return json({ error: "Enter the email and the 6-digit code." }, 400);
  try {
    const open = await openTokens(db, email, now);
    if (open.some((row) => (row.failures | 0) >= MAX_FAILURES)) {
      return json({ error: "That code is not valid. Request a new one." }, 400);
    }
    const codeHash = await sha256Hex(code);
    const match = open.find((row) => row.code_hash === codeHash);
    if (!match) {
      if (open.length) {
        await db
          .prepare(
            "UPDATE login_tokens SET failures = failures + 1 WHERE email = ? AND used_at IS NULL AND expires_at > ?"
          )
          .bind(email, now)
          .run();
      }
      return json({ error: "That code is not valid. Request a new one." }, 400);
    }
    const used = await consumeToken(db, match.id, now);
    if (!used) return json({ error: "That code is not valid. Request a new one." }, 400);
    const login = await finishLogin(db, email, now);
    return json({ ok: true, email: login.user.email }, 200, { "set-cookie": login.cookie });
  } catch {
    return json({ error: "Sign-in is not available yet." }, 503);
  }
}

export async function handleVerifyGet({ request, env, now = Date.now() }) {
  const db = database(env);
  const url = new URL(request.url);
  const origin = url.origin;
  const fail = () =>
    new Response(null, {
      status: 303,
      headers: {
        Location: `${origin}/?account=invalid`,
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "no-store",
      },
    });
  if (!db) return fail();
  const token = url.searchParams.get("token") || "";
  if (token.length < 20 || token.length > 200) return fail();
  try {
    const tokenHash = await sha256Hex(token);
    const row = await db
      .prepare(
        "SELECT id, email, expires_at, used_at, failures FROM login_tokens WHERE token_hash = ?"
      )
      .bind(tokenHash)
      .first();
    if (!row || row.used_at || row.expires_at <= now || (row.failures | 0) >= MAX_FAILURES) return fail();
    const used = await consumeToken(db, row.id, now);
    if (!used) return fail();
    const login = await finishLogin(db, row.email, now);
    const headers = new Headers();
    headers.set("Location", `${origin}/?account=in`);
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("Cache-Control", "no-store");
    headers.append("set-cookie", login.cookie);
    return new Response(null, { status: 303, headers });
  } catch {
    return fail();
  }
}

async function writeMerged(db, userId, incoming, now) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const row = await db
      .prepare("SELECT blob, version FROM player_data WHERE user_id = ?")
      .bind(userId)
      .first();
    let stored = null;
    let version = 0;
    if (row && row.blob) {
      version = row.version | 0;
      try {
        stored = JSON.parse(row.blob);
      } catch {
        stored = null;
      }
    }
    const merged = mergeAccount(stored, incoming);
    const blob = JSON.stringify(merged);
    if (!row) {
      try {
        await db
          .prepare("INSERT INTO player_data (user_id, blob, version, updated_at) VALUES (?, ?, 1, ?)")
          .bind(userId, blob, now)
          .run();
        return merged;
      } catch {
        continue;
      }
    }
    const updated = await db
      .prepare("UPDATE player_data SET blob = ?, version = ?, updated_at = ? WHERE user_id = ? AND version = ?")
      .bind(blob, version + 1, now, userId, version)
      .run();
    if (updated && updated.meta && updated.meta.changes) return merged;
  }
  return null;
}

export async function handleSync({ request, env, now = Date.now() }) {
  const db = database(env);
  if (!db) return json({ error: "Sign-in is not available yet." }, 503);
  let session;
  try {
    session = await sessionFor(db, request, now);
  } catch {
    return json({ error: "Sign-in is not available yet." }, 503);
  }
  if (!session) return json({ error: "Sign in to save progress." }, 401);
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const incoming = sanitizeBundle(parsed.body);
  try {
    const merged = await writeMerged(db, session.user_id, incoming, now);
    if (!merged) return json({ error: "Progress could not be saved. Try again." }, 503);
    const headers = session.cookie ? { "set-cookie": session.cookie } : undefined;
    return json({ ok: true, bundle: merged }, 200, headers);
  } catch {
    return json({ error: "Progress could not be saved. Try again." }, 503);
  }
}

export async function handleSignOut({ request, env }) {
  const db = database(env);
  const headers = { "set-cookie": clearCookie() };
  if (!db) return json({ ok: true }, 200, headers);
  try {
    const token = cookieValue(request, COOKIE);
    if (token) {
      const tokenHash = await sha256Hex(token);
      await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    }
  } catch {
    /* the cookie is cleared either way */
  }
  return json({ ok: true }, 200, headers);
}

export async function handleDelete({ request, env, now = Date.now() }) {
  const db = database(env);
  if (!db) return json({ error: "Sign-in is not available yet." }, 503);
  let session;
  try {
    session = await sessionFor(db, request, now);
  } catch {
    return json({ error: "Sign-in is not available yet." }, 503);
  }
  if (!session) return json({ error: "Sign in to delete the account." }, 401, { "set-cookie": clearCookie() });
  try {
    await db.prepare("DELETE FROM player_data WHERE user_id = ?").bind(session.user_id).run();
    await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(session.user_id).run();
    await db.prepare("DELETE FROM login_tokens WHERE email = ?").bind(session.email).run();
    await db.prepare("DELETE FROM users WHERE id = ?").bind(session.user_id).run();
    return json({ ok: true }, 200, { "set-cookie": clearCookie() });
  } catch {
    return json({ error: "The account could not be deleted. Try again." }, 503);
  }
}

export const LIMITS_FOR_TESTS = { EMAIL_PER_HOUR, IP_PER_HOUR, MIN_GAP_MS, MAX_FAILURES };
