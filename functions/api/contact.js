// Contact form for the Cloudflare Pages project.
//
// This file is a Pages Function. It is not part of `dist`. Pages picks up
// `/functions` when the project root is this repo and the build output is `dist`.
// Do not add a wrangler.toml here: the project already builds with
// `npm run build` and output directory `dist` in the Pages dashboard.
//
// Dashboard setup (nothing in this file is a secret):
//
// 1. Compute > Email Service > Email Sending > Onboard Domain: sudokusudoku.com.
//    Cloudflare adds SPF, DKIM, DMARC, and bounce MX records on cf-bounce.
//    The From address must be on that domain. Default: contact@sudokusudoku.com.
//    A mailbox is not required for sending.
// 2. Email Service > Email Routing > Destination addresses: add the inbox that
//    should receive messages and finish the verification email. CONTACT_TO must
//    be that verified address. Sending to a verified destination stays on the
//    free path. An unverified recipient needs Workers Paid.
// 3. Turnstile: create a widget whose hostnames include sudokusudoku.com.
//    Add the pages.dev preview hostname only if the form should work on previews.
// 4. Pages project > Settings > Environment variables (Production, and Preview
//    if you want the form there):
//      TURNSTILE_SITE_KEY
//      TURNSTILE_SECRET_KEY
//      CONTACT_TO          verified destination address
//      CONTACT_FROM        optional, plain address on the onboarded domain
// 5. Pages project > Settings > Bindings > Add > Send Email (Email Service).
//    Variable name: EMAIL. Redeploy so the binding is attached.
// 6. www to the apex is a Cloudflare redirect rule, not a Pages _redirects entry.
//
// Until those are set, GET /api/contact returns ready:false and the page tells
// the visitor the form is not available. No email address is rendered.

import { contactReady, validateContact } from "../contact-core.mjs";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export async function onRequestGet({ env }) {
  const ready = contactReady(env);
  return json({ ready, siteKey: ready ? env.TURNSTILE_SITE_KEY : null });
}

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    const text = await request.text();
    if (text.length > 8000) return json({ error: "That message is too long." }, 400);
    payload = JSON.parse(text);
  } catch {
    return json({ error: "The form could not be read." }, 400);
  }
  if (!payload || typeof payload !== "object") {
    return json({ error: "The form could not be read." }, 400);
  }

  const validated = validateContact(payload);
  if (validated.honeypot) return json({ ok: true });
  if (!validated.ok) return json({ error: validated.error }, 400);
  if (!contactReady(env)) {
    return json({ error: "The contact form is not available yet." }, 503);
  }

  const token = String(payload.turnstileToken || "");
  if (!token) return json({ error: "Complete the spam check and try again." }, 400);

  const verifyBody = new URLSearchParams();
  verifyBody.set("secret", env.TURNSTILE_SECRET_KEY);
  verifyBody.set("response", token);
  const remoteIp = request.headers.get("CF-Connecting-IP");
  if (remoteIp) verifyBody.set("remoteip", remoteIp);

  let verifyResult;
  try {
    const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: verifyBody,
    });
    verifyResult = await verify.json();
  } catch {
    return json({ error: "The spam check could not be completed. Try again." }, 502);
  }
  if (!verifyResult || verifyResult.success !== true) {
    return json({ error: "The spam check failed. Try again." }, 400);
  }

  const fromEmail = String(env.CONTACT_FROM || "contact@sudokusudoku.com").trim();
  try {
    await env.EMAIL.send({
      to: env.CONTACT_TO,
      from: { email: fromEmail, name: "SudokuSudoku" },
      replyTo: { email: validated.email, name: validated.name },
      subject: "SudokuSudoku contact form",
      text: `Name: ${validated.name}\nEmail: ${validated.email}\n\n${validated.message}\n`,
    });
  } catch {
    return json({ error: "The message could not be sent. Try again later." }, 502);
  }

  return json({ ok: true });
}
