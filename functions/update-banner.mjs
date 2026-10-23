// When the update banner may show, and when Refresh may reload.
// A reload is one shot per waiting version so a stuck worker cannot loop.

export const RELOAD_FLAG = "sudoku-update-reloaded";
export const DISMISS_FLAG = "sudoku-update-dismissed";

export function gameGate(state, hasBoard) {
  if (!hasBoard) return "idle";
  if (!state || !state.counted || state.won || state.over) return "idle";
  return "play";
}

export function bannerVisible({ waitingVersion, gate, dismissedVersion, reloadedVersion }) {
  if (!waitingVersion) return false;
  if (gate === "pending" || gate === "play") return false;
  if (dismissedVersion && dismissedVersion === waitingVersion) return false;
  if (reloadedVersion && reloadedVersion === waitingVersion) return false;
  return true;
}

export function shouldReload({ refreshing, reloadedVersion, waitingVersion }) {
  if (refreshing) return false;
  if (reloadedVersion && waitingVersion && reloadedVersion === waitingVersion) return false;
  return true;
}

export function clearReloadFlag({ reloadedVersion, waitingVersion }) {
  if (!reloadedVersion) return false;
  if (!waitingVersion || waitingVersion !== reloadedVersion) return true;
  return false;
}

export function stripUpdateParam(href) {
  const url = new URL(href, "https://sudokusudoku.com");
  if (!url.searchParams.has("sudoku-updated")) return "";
  url.searchParams.delete("sudoku-updated");
  const parts = [];
  url.searchParams.forEach((value, key) => {
    parts.push(value === "" ? encodeURIComponent(key) : `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });
  return `${url.pathname}${parts.length ? `?${parts.join("&")}` : ""}${url.hash}`;
}
