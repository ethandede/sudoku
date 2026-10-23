// Technique practice helpers. The game applies these to the live board.
// One fill-all call returns every step; the game records that batch as one undo.
(function (root) {
  const RANK = {
    "naked-single": 0,
    "hidden-single": 2,
    pointing: 3,
    claiming: 3.1,
    "naked-pair": 4,
    "hidden-pair": 4.1,
    "naked-triple": 5,
    "hidden-triple": 5.1,
    quads: 6,
    "x-wing": 7,
    "xy-wing": 8,
    swordfish: 9,
    coloring: 10,
    "xy-chain": 10.1,
  };

  const FILL_LABEL = {
    "naked-single": "Fill all naked singles",
    "hidden-single": "Fill all hidden singles",
    pointing: "Apply all pointing",
    claiming: "Apply all claiming",
    "naked-pair": "Apply all naked pairs",
    "hidden-pair": "Apply all hidden pairs",
    "naked-triple": "Apply all naked triples",
    "hidden-triple": "Apply all hidden triples",
    quads: "Apply all quads",
    "x-wing": "Apply all X-wings",
    swordfish: "Apply all swordfish",
    "xy-wing": "Apply all XY-wings",
    coloring: "Apply all simple coloring",
    "xy-chain": "Apply all XY-chains",
  };

  function rankOf(slug) {
    const gen = root.SudokuGenerator;
    if (gen && typeof gen.techniqueRank === "function") {
      const rank = gen.techniqueRank(slug);
      if (rank != null) return rank;
    }
    return Object.prototype.hasOwnProperty.call(RANK, slug) ? RANK[slug] : 100;
  }

  function fillLabel(slug) {
    return FILL_LABEL[slug] || "Apply this technique";
  }

  function promptFor(name) {
    return `${name} is the next move. Find it.`;
  }

  function wantsCandidates(slug) {
    return slug !== "naked-single";
  }

  function applyStep(board, removed, step, solution) {
    if (!step) return false;
    let changed = false;
    const eliminate = step.eliminate || [];
    for (let i = 0; i < eliminate.length; i += 1) {
      const item = eliminate[i];
      if (!item || board[item.index]) continue;
      const digit = item.digit;
      if (digit < 1 || digit > 9) continue;
      let exists = false;
      for (let k = 0; k < removed.length; k += 1) {
        if (removed[k].index === item.index && removed[k].digit === digit) {
          exists = true;
          break;
        }
      }
      if (exists) continue;
      removed.push({ index: item.index, digit });
      changed = true;
    }
    const place = step.place;
    if (place && board[place.index] === 0) {
      if (!solution || solution[place.index] === place.digit) {
        board[place.index] = place.digit;
        changed = true;
      }
    }
    for (let i = removed.length - 1; i >= 0; i -= 1) {
      if (board[removed[i].index] !== 0) removed.splice(i, 1);
    }
    return changed;
  }

  function fillAll(board, removed, slug, explain, solution, onApply) {
    const applied = [];
    let guard = 0;
    while (guard < 300) {
      guard += 1;
      const step = explain(board, removed);
      if (!step || step.slug !== slug) return { applied, next: step || null };
      if (!applyStep(board, removed, step, solution)) return { applied, next: step };
      if (onApply) onApply(step);
      applied.push(step);
    }
    return { applied, next: explain(board, removed) };
  }

  // Apply easier steps until the next one is the target. Stop without applying
  // the target, and stop if a harder technique shows up first.
  function fastForward(board, removed, target, explain, solution, onApply) {
    const applied = [];
    const targetRank = rankOf(target);
    let guard = 0;
    while (guard < 400) {
      guard += 1;
      const step = explain(board, removed);
      if (!step) return { applied, next: null, ready: false };
      if (step.slug === target) return { applied, next: step, ready: true };
      if (rankOf(step.slug) >= targetRank) return { applied, next: step, ready: false };
      if (!applyStep(board, removed, step, solution)) return { applied, next: step, ready: false };
      if (onApply) onApply(step);
      applied.push(step.slug);
    }
    const next = explain(board, removed);
    return { applied, next, ready: Boolean(next && next.slug === target) };
  }

  root.SudokuPractice = {
    RANK,
    FILL_LABEL,
    rankOf,
    fillLabel,
    promptFor,
    wantsCandidates,
    applyStep,
    fillAll,
    fastForward,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
