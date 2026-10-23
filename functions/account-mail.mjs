// Login email. Pages Functions cannot hold a send_email binding.
//
// Preferred: LOGIN_EMAIL, a service binding whose worker uses Cloudflare Email
// Sending and can address any recipient. The contact binding EMAIL is not that.
// It is locked to one verified destination and must not be used here.
//
// Otherwise: LOGIN_EMAIL_API_KEY, a Resend API key stored as a Pages secret.
// LOGIN_FROM is optional. The domain in that address has to be verified with
// the provider. No secret is read from source or written to a log.

const DEFAULT_FROM = "SudokuSudoku <login@sudokusudoku.com>";
const PRODUCTION_ORIGIN = "https://sudokusudoku.com";

function configuredOrigin(env) {
  const raw = String((env && env.SITE_ORIGIN) || "").replace(/[\r\n]/g, "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    if (url.username || url.password) return "";
    return url.origin;
  } catch {
    return "";
  }
}

// Production mail and verify redirects use the public site. A deployment
// hostname disappears when that deployment is deleted, so it must not be
// the link in an email. Preview keeps the host the player actually used.
export function publicOrigin(request, env) {
  const configured = configuredOrigin(env);
  if (configured) return configured;
  if (env && env.CF_PAGES_BRANCH === "main") return PRODUCTION_ORIGIN;
  try {
    return new URL(request.url).origin;
  } catch {
    return PRODUCTION_ORIGIN;
  }
}

export function mailConfigured(env) {
  return Boolean(env && (env.LOGIN_EMAIL || env.LOGIN_EMAIL_API_KEY));
}

export function fromAddress(env) {
  const raw = String((env && env.LOGIN_FROM) || DEFAULT_FROM);
  return raw.replace(/[\r\n]/g, "").trim() || DEFAULT_FROM;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function loginMessage({ origin, token, code }) {
  const link = `${origin}/api/account/verify?token=${encodeURIComponent(token)}`;
  const text = [
    "Sign in to SudokuSudoku to keep a copy of your progress.",
    "",
    "This link works once and expires in 15 minutes:",
    link,
    "",
    `Or enter this code on the site: ${code}`,
    "",
    "If you did not ask for this, ignore the email. No account is created until you open the link or enter the code.",
  ].join("\n");
  const html = [
    "<p>Sign in to SudokuSudoku to keep a copy of your progress.</p>",
    `<p><a href="${escapeHtml(link)}">Sign in</a>. This link works once and expires in 15 minutes.</p>`,
    `<p>Or enter this code on the site: <strong>${escapeHtml(code)}</strong></p>`,
    "<p>If you did not ask for this, ignore the email. No account is created until you open the link or enter the code.</p>",
  ].join("");
  return {
    subject: "Your SudokuSudoku sign-in link",
    text,
    html,
  };
}

function providerDetail(payload) {
  if (!payload || typeof payload !== "object") return "";
  if (typeof payload.message === "string") return payload.message.slice(0, 300);
  return "";
}

function resendKey(env) {
  const raw = String((env && env.LOGIN_EMAIL_API_KEY) || "");
  let key = raw.trim();
  if (key.slice(0, 7).toLowerCase() === "bearer ") key = key.slice(7).trim();
  return { key, keyLength: raw.length, sentLength: key.length, rePrefix: key.startsWith("re_") };
}

async function sendResend(env, message) {
  const credential = resendKey(env);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credential.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: message.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  const id = payload && typeof payload.id === "string" ? payload.id : "";
  const observed = {
    keyLength: credential.keyLength,
    sentLength: credential.sentLength,
    rePrefix: credential.rePrefix,
  };
  if (response.ok) return { ok: true, id, ...observed };
  return { ok: false, id, error: providerDetail(payload), status: response.status, ...observed };
}

export async function sendLoginEmail(env, message) {
  if (!mailConfigured(env)) return { ok: false, reason: "unconfigured" };
  const payload = {
    to: message.to,
    from: fromAddress(env),
    subject: message.subject,
    text: message.text,
    html: message.html,
  };
  try {
    if (env.LOGIN_EMAIL) {
      await env.LOGIN_EMAIL.send(payload);
      return { ok: true, via: "cloudflare" };
    }
    const sent = await sendResend(env, payload);
    if (!sent.ok) {
      return {
        ok: false,
        reason: "failed",
        id: sent.id,
        error: sent.error,
        status: sent.status,
        keyLength: sent.keyLength,
        sentLength: sent.sentLength,
        rePrefix: Boolean(sent.rePrefix),
      };
    }
    return {
      ok: true,
      via: "resend",
      id: sent.id,
      keyLength: sent.keyLength,
      sentLength: sent.sentLength,
      rePrefix: Boolean(sent.rePrefix),
    };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
