// Rewrites the homepage document for one published daily.
// The board markup is unchanged. Title, description, canonical URL,
// Open Graph fields, the visible heading, and BreadcrumbList change
// so the permalink is its own page.

import { breadcrumbList } from "../scripts/schema.mjs";
import { dailyMeta, dateStatus, parseDailyPath, SITE } from "./daily-permalink.mjs";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function replaceMeta(html, attr, name, value) {
  const pattern = new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(">)`);
  if (!pattern.test(html)) throw new Error(`Daily page is missing meta ${name}`);
  return html.replace(pattern, `$1${escapeHtml(value)}$2`);
}

function injectBreadcrumb(html, canonical, crumb) {
  const node = breadcrumbList(SITE, canonical, crumb);
  if (!node) throw new Error(`No breadcrumb for ${canonical}`);
  const pattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/;
  const match = html.match(pattern);
  if (!match) throw new Error("Daily page is missing JSON-LD");
  const data = JSON.parse(match[1]);
  if (!data || !Array.isArray(data["@graph"])) throw new Error("Daily page JSON-LD has no graph");
  const graph = data["@graph"].filter((item) => item["@type"] !== "BreadcrumbList");
  graph.push(node);
  const json = JSON.stringify({ ...data, "@graph": graph }).replace(/</g, "\\u003c");
  return html.replace(pattern, `<script type="application/ld+json">${json}</script>`);
}

export function applyDailyPage(html, iso) {
  const meta = dailyMeta(iso);
  const canonical = `${SITE}${meta.path}`;
  let next = String(html);
  if (!/<title>[^<]*<\/title>/.test(next)) throw new Error("Daily page is missing a title");
  next = next.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);
  next = replaceMeta(next, "name", "description", meta.description);
  next = replaceMeta(next, "property", "og:title", meta.title);
  next = replaceMeta(next, "property", "og:description", meta.description);
  next = replaceMeta(next, "property", "og:url", canonical);
  next = replaceMeta(next, "name", "twitter:title", meta.title);
  next = replaceMeta(next, "name", "twitter:description", meta.description);
  if (!/<link rel="canonical" href="[^"]*">/.test(next)) throw new Error("Daily page is missing a canonical URL");
  next = next.replace(
    /<link rel="canonical" href="[^"]*">/,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`
  );
  if (!/<h1>[^<]*<\/h1>/.test(next)) throw new Error("Daily page is missing a heading");
  next = next.replace(/<h1>[^<]*<\/h1>/, `<h1>${escapeHtml(meta.crumb)}</h1>`);
  return injectBreadcrumb(next, canonical, meta.crumb);
}

export function resolveDaily(pathname, today) {
  const raw = String(pathname || "");
  if (raw === "/daily" || raw === "/daily/") return { iso: null };
  const iso = parseDailyPath(raw);
  if (!iso) return { iso: null };
  const status = dateStatus(iso, today);
  if (status !== "live" && status !== "archive") return { iso: null };
  if (!raw.endsWith("/")) return { redirect: `/daily/${iso}/`, iso, status };
  return { iso, status };
}
