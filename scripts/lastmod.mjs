// Sitemap dates come from the last commit that touched the page source.
// A checkout with no git history falls back to the file's modified time.
// The build clock is not a date.

import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { join } from "node:path";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
let historyReady = false;

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

// Pages checks out one commit. git log on that copy dates every file as
// the tip, which is the build. Deepen the clone once before reading dates.
// A still-shallow checkout must fail the build: file mtimes there are the
// clone time, so they are the build clock too.
function ensureHistory(root) {
  if (historyReady) return;
  let shallow = "";
  try {
    shallow = git(root, ["rev-parse", "--is-shallow-repository"]);
  } catch {
    historyReady = true;
    return;
  }
  if (shallow !== "true") {
    historyReady = true;
    return;
  }
  try {
    git(root, ["fetch", "--unshallow"]);
  } catch {
    throw new Error("Sitemap dates need the full git history, and unshallow failed.");
  }
  let still = "true";
  try {
    still = git(root, ["rev-parse", "--is-shallow-repository"]);
  } catch {
    still = "true";
  }
  if (still === "true") {
    throw new Error("Sitemap dates need the full git history. The checkout is still shallow.");
  }
  historyReady = true;
}

export function gitDate(root, relativePath) {
  ensureHistory(root);
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

export function gitFirstDate(root, relativePath) {
  ensureHistory(root);
  try {
    const out = execFileSync("git", ["log", "--follow", "--format=%cs", "--", relativePath], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const days = out.split("\n").map((line) => line.trim()).filter((line) => DAY.test(line));
    return days.at(-1) || "";
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
