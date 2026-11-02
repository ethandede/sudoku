import { pageNotFound } from "../not-found.mjs";
import { utcToday } from "../daily-permalink.mjs";
import { applyDailyPage, resolveDaily } from "../daily-page.mjs";

// Serves one published daily from the homepage document.
// Future, invalid, and pre-archive dates are the same 404 as a missing file.

async function gameDocument(context, origin) {
  const asset = await context.env.ASSETS.fetch(new Request(new URL("/index.html", origin)));
  if (asset.ok) return asset.text();
  const home = await context.env.ASSETS.fetch(new Request(new URL("/", origin)));
  if (home.ok) return home.text();
  return "";
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const decision = resolveDaily(url.pathname, utcToday());
  if (decision.redirect) {
    url.pathname = decision.redirect;
    return Response.redirect(url.toString(), 301);
  }
  if (!decision.iso) return pageNotFound(context);
  let html = "";
  try {
    html = await gameDocument(context, url.origin);
  } catch {
    html = "";
  }
  if (!html) return pageNotFound(context);
  return new Response(applyDailyPage(html, decision.iso), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
      "x-content-type-options": "nosniff",
    },
  });
}
