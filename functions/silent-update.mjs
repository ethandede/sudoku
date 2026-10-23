// A new service worker takes control on its own. The open page never reloads
// itself. The next visit picks up the new version.

export function gameGate(state, hasBoard) {
  if (!hasBoard) return "idle";
  if (!state || !state.counted || state.won || state.over) return "idle";
  return "play";
}

export function shouldApplyUpdate() {
  return false;
}
