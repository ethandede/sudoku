// Pure helpers for passwordless sign-in. No network and no secrets.

export const COOKIE = "sudoku_session";
export const SESSION_SECONDS = 180 * 24 * 60 * 60;
export const SESSION_TTL_MS = SESSION_SECONDS * 1000;
export const TOKEN_TTL_MS = 15 * 60 * 1000;
export const EMAIL_PER_HOUR = 5;
export const IP_PER_HOUR = 20;
export const HOUR_MS = 60 * 60 * 1000;
export const MIN_GAP_MS = 60 * 1000;
export const MAX_FAILURES = 8;
export const ROLL_REMAINING_MS = 150 * 24 * 60 * 60 * 1000;
export const MAX_BODY = 200_000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return "";
  if (email.includes("\n") || email.includes("\r")) return "";
  if (!EMAIL_PATTERN.test(email)) return "";
  return email;
}

export function normalizeCode(value) {
  const code = String(value ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return "";
  return code;
}

export function randomToken(bytes = 32) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  let binary = "";
  buffer.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function randomCode() {
  const buffer = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  let value = 0;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return String(value % 1_000_000).padStart(6, "0");
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function cookieValue(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return "";
}

export function sessionCookie(token, maxAge = SESSION_SECONDS) {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function rateDecision({ emailCount, ipCount, latestAt, now }) {
  if (latestAt && now - latestAt < MIN_GAP_MS) return { ok: true, quiet: true };
  if (emailCount >= EMAIL_PER_HOUR) {
    return { ok: false, status: 429, error: "Too many sign-in emails for that address. Try again in a little while." };
  }
  if (ipCount != null && ipCount >= IP_PER_HOUR) {
    return { ok: false, status: 429, error: "Too many sign-in emails from this network. Try again in a little while." };
  }
  return { ok: true };
}

export function shouldRollSession(session, now) {
  if (!session) return false;
  return session.expires_at - now < ROLL_REMAINING_MS;
}
