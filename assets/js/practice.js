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

  const CHIP_NAME = {
    "naked-single": "Naked single",
    "hidden-single": "Hidden single",
    pointing: "Pointing",
    claiming: "Claiming",
    "naked-pair": "Naked pair",
    "hidden-pair": "Hidden pair",
    "naked-triple": "Naked triple",
    "hidden-triple": "Hidden triple",
    quads: "Quads",
    "x-wing": "X-wing",
    swordfish: "Swordfish",
    "xy-wing": "XY-wing",
    coloring: "Simple coloring",
    "xy-chain": "XY-chain",
  };

  const NOUN = {
    "naked-single": "naked single",
    "hidden-single": "hidden single",
    pointing: "pointing",
    claiming: "claiming",
    "naked-pair": "naked pair",
    "hidden-pair": "hidden pair",
    "naked-triple": "naked triple",
    "hidden-triple": "hidden triple",
    quads: "quad",
    "x-wing": "X-wing",
    swordfish: "swordfish",
    "xy-wing": "XY-wing",
    coloring: "simple coloring",
    "xy-chain": "XY-chain",
  };

  function fillLabel(slug) {
    return FILL_LABEL[slug] || "Apply this technique";
  }

  function noneLeft(slug, next) {
    const line = `No more ${NOUN[slug] || "matching"} steps.`;
    if (!next || !next.name) return line;
    return `${line} Next up: ${next.name}.`;
  }

  function resultChip(slug, steps) {
    const name = CHIP_NAME[slug] || "Technique";
    const placed = new Set();
    const byDigit = new Map();
    (steps || []).forEach((step) => {
      if (step.place && (step.slug === "naked-single" || step.slug === "hidden-single")) placed.add(step.place.index);
      (step.eliminate || []).forEach((item) => {
        if (!item) return;
        if (!byDigit.has(item.digit)) byDigit.set(item.digit, new Set());
        byDigit.get(item.digit).add(item.index);
      });
    });
    if (slug === "naked-single" || slug === "hidden-single") {
      const count = placed.size;
      return `${name}: filled ${count} ${count === 1 ? "cell" : "cells"}.`;
    }
    const parts = [...byDigit.entries()].map(
      ([digit, cells]) => `${digit} from ${cells.size} ${cells.size === 1 ? "cell" : "cells"}`
    );
    if (!parts.length) return `${name}: no candidates changed.`;
    return `${name}: ruled out ${parts.join(", ")}.`;
  }

  function affectedCells(steps) {
    const cells = new Set();
    (steps || []).forEach((step) => {
      (step.eliminate || []).forEach((item) => {
        if (item) cells.add(item.index);
      });
      if (step.place && (step.slug === "naked-single" || step.slug === "hidden-single")) cells.add(step.place.index);
    });
    return [...cells];
  }

  // Singles stay in solver order. Every other technique is searched on its own,
  // so a pointing step still applies when a pair or a single is also on the board.
  function stepFinder(explain, explainSlug, slug) {
    return (board, removed) => {
      if (slug === "naked-single" || slug === "hidden-single" || typeof explainSlug !== "function") {
        const step = explain(board, removed);
        return step && step.slug === slug ? step : null;
      }
      return explainSlug(board, removed, slug);
    };
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
    const places =
      place && (step.slug === "naked-single" || step.slug === "hidden-single");
    if (places && board[place.index] === 0) {
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
    noneLeft,
    resultChip,
    affectedCells,
    stepFinder,
    promptFor,
    wantsCandidates,
    applyStep,
    fillAll,
    fastForward,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
