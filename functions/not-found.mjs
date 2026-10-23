// Pages serves a top-level 404.html for unknown files. Two cases still
// answer 200, which Search Console reports as a soft 404:
// the pretty URL /404 (the 404 page itself), and old WordPress queries
// on the homepage. _redirects cannot match a query string, and a /*
// splat would send every missing URL to a real page.

const NOT_FOUND_ASSET = "/page-not-found.txt";

// Keys that only the old WordPress front page used. A numeric `p` is a
// post id. Puzzle links use p=<grade>.<token> and must keep loading.
const WORDPRESS_KEYS = ["page_id", "attachment_id", "s", "feed", "rest_route"];

export function legacyWordPressHome(url) {
  const params = url.searchParams;
  const postId = params.get("p");
  if (postId != null && /^\d+$/.test(postId.trim())) return true;
  return WORDPRESS_KEYS.some((key) => params.has(key));
}

export async function pageNotFound(context) {
  const origin = new URL(context.request.url).origin;
  let body = fallbackNotFound();
  try {
    const asset = await context.env.ASSETS.fetch(new Request(new URL(NOT_FOUND_ASSET, origin)));
    if (asset.ok) body = asset.body;
  } catch {
    /* the short fallback still has to be a real 404 */
  }
  return new Response(body, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
      "x-content-type-options": "nosniff",
    },
  });
}

function fallbackNotFound() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>Page not found | SudokuSudoku</title></head><body><h1>Page not found</h1><p><a href="/">Play Sudoku</a></p></body></html>`;
}
