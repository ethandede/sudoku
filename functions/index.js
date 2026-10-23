import { legacyWordPressHome, pageNotFound } from "./not-found.mjs";

// Only old WordPress homepage queries are answered here. Every other
// request, including puzzle links (?p=not-easy.xxxxxxxx), falls through
// to the static game.
export function onRequest(context) {
  const url = new URL(context.request.url);
  if (!url.search || !legacyWordPressHome(url)) return context.next();
  return pageNotFound(context);
}
