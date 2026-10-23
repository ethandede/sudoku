import { pageNotFound } from "./not-found.mjs";

// 404.html is a real file, so Pages pretty-URLs it to /404 with status 200.
// That is the soft 404. Unknown paths still use the file with status 404.
export function onRequest(context) {
  return pageNotFound(context);
}
