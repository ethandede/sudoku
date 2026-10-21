import assert from "node:assert/strict";
import { contactReady, validateContact } from "../functions/contact-core.mjs";
import { onRequestGet, onRequestPost } from "../functions/api/contact.js";

assert.equal(validateContact({ name: "", email: "a@b.co", message: "hello there" }).ok, false);
assert.equal(validateContact({ name: "Ada", email: "not-an-email", message: "hello there" }).ok, false);
assert.equal(validateContact({ name: "Ada", email: "ada@example.com", message: "short" }).ok, false);
assert.equal(validateContact({ name: "Ada", email: "ada@example.com", message: "hello there", company: "spam" }).honeypot, true);

const good = validateContact({ name: "Ada\nLovelace", email: "ada@example.com", message: "The daily did not load." });
assert.equal(good.ok, true);
assert.equal(good.name.includes("\n"), false);
assert.equal(contactReady({}), false);
assert.equal(
  contactReady({
    TURNSTILE_SITE_KEY: "site",
    TURNSTILE_SECRET_KEY: "secret",
    CONTACT_TO: "owner@example.com",
    EMAIL: { send() {} },
  }),
  true
);

function post(body) {
  return new Request("https://sudokusudoku.com/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const unconfigured = await onRequestGet({ env: {} });
assert.equal(unconfigured.status, 200);
assert.deepEqual(await unconfigured.json(), { ready: false, siteKey: null });

const unavailable = await onRequestPost({
  request: post({ name: "Ada", email: "ada@example.com", message: "hello there", turnstileToken: "token" }),
  env: {},
});
assert.equal(unavailable.status, 503);

const sent = [];
const env = {
  TURNSTILE_SITE_KEY: "site-key",
  TURNSTILE_SECRET_KEY: "secret",
  CONTACT_TO: "owner@example.com",
  EMAIL: {
    async send(message) {
      sent.push(message);
      return { messageId: "test" };
    },
  },
};

const ready = await onRequestGet({ env });
assert.deepEqual(await ready.json(), { ready: true, siteKey: "site-key" });
assert.equal(JSON.stringify(await (await onRequestGet({ env })).json()).includes("secret"), false);

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(JSON.stringify({ success: true }), { status: 200 });

const honeypot = await onRequestPost({
  request: post({
    name: "Ada",
    email: "ada@example.com",
    message: "hello there",
    company: "filled",
    turnstileToken: "token",
  }),
  env,
});
assert.equal(honeypot.status, 200);
assert.equal(sent.length, 0);

const delivered = await onRequestPost({
  request: post({
    name: "Ada",
    email: "ada@example.com",
    message: "The daily did not load.",
    company: "",
    turnstileToken: "token",
  }),
  env,
});
assert.equal(delivered.status, 200);
assert.equal(sent.length, 1);
assert.equal(sent[0].to, "owner@example.com");
assert.equal(sent[0].replyTo.email, "ada@example.com");
assert.equal(sent[0].text.includes("ada@example.com"), true);
assert.equal(JSON.stringify(await delivered.json()).includes("ada@example.com"), false);

globalThis.fetch = async () => new Response(JSON.stringify({ success: false }), { status: 200 });
const rejected = await onRequestPost({
  request: post({
    name: "Ada",
    email: "ada@example.com",
    message: "The daily did not load.",
    turnstileToken: "token",
  }),
  env,
});
assert.equal(rejected.status, 400);
assert.equal(sent.length, 1);

globalThis.fetch = originalFetch;
console.log("contact form: validation, honeypot, and send path");
