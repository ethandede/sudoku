// Sitemap dates come from the last commit that touched the page source.
// A checkout with no git history falls back to the file's modified time.
// The build clock is not a date.

import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { join } from "node:path";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function gitDate(root, relativePath) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", relativePath], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return DAY.test(out) ? out : "";
  } catch {
    return "";
  }
}

export function fileDate(root, relativePath) {
  try {
    const day = statSync(join(root, relativePath)).mtime.toISOString().slice(0, 10);
    return DAY.test(day) ? day : "";
  } catch {
    return "";
  }
}

export function lastmod(root, sources) {
  const files = [...new Set((sources || []).filter(Boolean))];
  if (!files.length) throw new Error("A sitemap URL needs a source file");
  const fromGit = files.map((file) => gitDate(root, file)).filter(Boolean);
  const dates = fromGit.length ? fromGit : files.map((file) => fileDate(root, file)).filter(Boolean);
  if (!dates.length) throw new Error(`No date for ${files.join(", ")}`);
  return dates.sort().at(-1);
}
