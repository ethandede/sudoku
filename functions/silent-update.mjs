// A new service worker takes control on its own. The open page keeps running
// until the player leaves it, and only when no game is in progress.

export function gameGate(state, hasBoard) {
  if (!hasBoard) return "idle";
  if (!state || !state.counted || state.won || state.over) return "idle";
  return "play";
}

export function shouldApplyUpdate({ hidden, gate, pending, refreshing, reloadedAt, now }) {
  if (!pending || refreshing || !hidden) return false;
  if (gate !== "idle") return false;
  if (reloadedAt && now - reloadedAt < 15000) return false;
  return true;
}
