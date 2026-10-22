import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function withVersion(url, version) {
  if (!version) return url;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url) || url.startsWith("//")) return url;
  const hashAt = url.indexOf("#");
  const before = hashAt === -1 ? url : url.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : url.slice(hashAt);
  if (/(?:[?&])v=/.test(before)) return url;
  const joiner = before.includes("?") ? "&" : "?";
  return `${before}${joiner}v=${version}${hash}`;
}

export function versionFontUrls(css, version) {
  return css.replace(/url\((['"]?)(\/assets\/fonts\/[^'")\s]+)\1\)/g, (_, quote, url) => {
    return `url(${quote}${withVersion(url, version)}${quote})`;
  });
}

export function assetVersion(root) {
  const fromPages = (process.env.CF_PAGES_COMMIT_SHA || "").trim();
  if (/^[0-9a-f]{7,40}$/i.test(fromPages)) return fromPages.slice(0, 12);
  try {
    const sha = execSync("git rev-parse --short=12 HEAD", {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (/^[0-9a-f]{7,40}$/i.test(sha)) return sha;
  } catch {
    // A checkout without git still needs a stable suffix.
  }
  return createHash("sha256").update(readFileSync(join(root, "assets/js/sudoku.js"))).digest("hex").slice(0, 12);
}
