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
  skyscraper: 9.1,
  "two-string-kite": 9.2,
  "xyz-wing": 9.3,
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
    skyscraper: "Apply all skyscrapers",
    "two-string-kite": "Apply all two-string kites",
    "xyz-wing": "Apply all XYZ-wings",
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

  function promptShort(name) {
    return `Find the ${name}.`;
  }

  function wantsCandidates(slug) {
    return slug !== "naked-single";
  }

  const PLURAL_NAME = {
    "Naked single": "Naked singles",
    "Hidden single": "Hidden singles",
    "Naked pair": "Naked pairs",
    "Hidden pair": "Hidden pairs",
    "Naked triple": "Naked triples",
    "Hidden triple": "Hidden triples",
    "X-wing": "X-wings",
    "XY-wing": "XY-wings",
    "XY-chain": "XY-chains",
  };

  function techniqueLabel(name, count) {
    if (!name) return "Technique";
    if (count === 1) return name;
    return PLURAL_NAME[name] || name;
  }

  function applyStep(board, removed, step, solution) {
    const empty = { changed: false, placed: null, placedDigit: null, cleared: [] };
    if (!step) return empty;
    let changed = false;
    const cleared = [];
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
      let bucket = null;
      for (let c = 0; c < cleared.length; c += 1) {
        if (cleared[c].index === item.index) {
          bucket = cleared[c];
          break;
        }
      }
      if (!bucket) {
        bucket = { index: item.index, digits: [] };
        cleared.push(bucket);
      }
      bucket.digits.push(digit);
    }
    let placed = null;
    let placedDigit = null;
    const place = step.place;
    const places =
      place && (step.slug === "naked-single" || step.slug === "hidden-single");
    if (places && board[place.index] === 0) {
      if (!solution || solution[place.index] === place.digit) {
        board[place.index] = place.digit;
        changed = true;
        placed = place.index;
        placedDigit = place.digit;
      }
    }
    for (let i = removed.length - 1; i >= 0; i -= 1) {
      if (board[removed[i].index] !== 0) removed.splice(i, 1);
    }
    return {
      changed,
      placed,
      placedDigit,
      cleared: placed == null ? cleared : cleared.filter((item) => item.index !== placed),
    };
  }

  function effectsOf(step, outcome) {
    const touches = [];
    if (!outcome || !outcome.changed) return touches;
    const name = step.name || step.slug;
    if (outcome.placed != null) {
      touches.push({
        slug: step.slug,
        name,
        index: outcome.placed,
        kind: "placed",
        digits: [outcome.placedDigit],
      });
    }
    (outcome.cleared || []).forEach((item) => {
      touches.push({
        slug: step.slug,
        name,
        index: item.index,
        kind: "cleared",
        digits: item.digits.slice(),
      });
    });
    return touches;
  }

  function fillAll(board, removed, slug, explain, solution, onApply) {
    const applied = [];
    const touches = [];
    let guard = 0;
    while (guard < 300) {
      guard += 1;
      const step = explain(board, removed);
      if (!step || step.slug !== slug) return { applied, next: step || null, touches };
      const outcome = applyStep(board, removed, step, solution);
      if (!outcome.changed) return { applied, next: step, touches };
      if (onApply) onApply(step);
      applied.push(step);
      effectsOf(step, outcome).forEach((touch) => touches.push(touch));
    }
    return { applied, next: explain(board, removed), touches };
  }

  // Apply easier steps until the next one is the target. Stop without applying
  // the target, and stop if a harder technique shows up first.
  function fastForward(board, removed, target, explain, solution, onApply) {
    const applied = [];
    const touches = [];
    const targetRank = rankOf(target);
    let guard = 0;
    while (guard < 400) {
      guard += 1;
      const step = explain(board, removed);
      if (!step) return { applied, next: null, ready: false, touches };
      if (step.slug === target) return { applied, next: step, ready: true, touches };
      if (rankOf(step.slug) >= targetRank) return { applied, next: step, ready: false, touches };
      const outcome = applyStep(board, removed, step, solution);
      if (!outcome.changed) return { applied, next: step, ready: false, touches };
      if (onApply) onApply(step);
      applied.push(step.slug);
      effectsOf(step, outcome).forEach((touch) => touches.push(touch));
    }
    const next = explain(board, removed);
    return { applied, next, ready: Boolean(next && next.slug === target), touches };
  }

  function batchesOf(touches) {
    const batches = [];
    (touches || []).forEach((touch) => {
      if (!touch || touch.index == null || touch.index < 0) return;
      let batch = batches[batches.length - 1];
      if (!batch || batch.slug !== touch.slug) {
        batch = { slug: touch.slug, name: touch.name || touch.slug, cells: [] };
        batches.push(batch);
      }
      let cell = null;
      for (let i = 0; i < batch.cells.length; i += 1) {
        if (batch.cells[i].index === touch.index) {
          cell = batch.cells[i];
          break;
        }
      }
      if (!cell) {
        cell = {
          index: touch.index,
          kind: touch.kind === "placed" ? "placed" : "cleared",
          name: touch.name || batch.name,
          slug: touch.slug,
          digits: [],
        };
        batch.cells.push(cell);
      }
      if (touch.kind === "placed") cell.kind = "placed";
      (touch.digits || []).forEach((digit) => {
        if (!cell.digits.includes(digit)) cell.digits.push(digit);
      });
    });
    return batches;
  }

  function highlightOf(batches) {
    if (!batches || !batches.length) return [];
    const last = batches[batches.length - 1];
    return last.cells
      .map((cell) => ({
        index: cell.index,
        kind: cell.kind,
        name: cell.name,
        slug: cell.slug,
        digits: cell.digits.slice(),
      }))
      .sort((a, b) => a.index - b.index);
  }

  function reviewCopy(batches, nextName) {
    if (!batches || !batches.length) return "";
    if (nextName) {
      const grouped = [];
      batches.forEach((batch) => {
        let found = null;
        for (let i = 0; i < grouped.length; i += 1) {
          if (grouped[i].slug === batch.slug) {
            found = grouped[i];
            break;
          }
        }
        if (!found) {
          found = { slug: batch.slug, name: batch.name, indexes: [] };
          grouped.push(found);
        }
        batch.cells.forEach((cell) => {
          if (!found.indexes.includes(cell.index)) found.indexes.push(cell.index);
        });
      });
      const parts = grouped.map(
        (item) => `${techniqueLabel(item.name, item.indexes.length)} ${item.indexes.length}`
      );
      return `${parts.join(", ")}. Next up: ${nextName}.`;
    }
    const batch = batches[batches.length - 1];
    const count = batch.cells.length;
    const noun = count === 1 ? "cell" : "cells";
    const placed = batch.cells.every((cell) => cell.kind === "placed");
    return `${techniqueLabel(batch.name, count)}: ${count} ${noun} ${placed ? "filled" : "changed"}`;
  }

  function reviewCopyShort(batches, nextName) {
    if (!batches || !batches.length) return "";
    if (nextName) {
      const indexes = [];
      batches.forEach((batch) => {
        batch.cells.forEach((cell) => {
          if (!indexes.includes(cell.index)) indexes.push(cell.index);
        });
      });
      return `${indexes.length} to ${nextName}`;
    }
    const batch = batches[batches.length - 1];
    return `${techniqueLabel(batch.name, batch.cells.length)} · ${batch.cells.length}`;
  }

  function cellDetail(cell) {
    const digits = (cell && cell.digits ? cell.digits : []).slice().sort((a, b) => a - b);
    const list = digits.join(", ");
    const name = (cell && cell.name) || "This technique";
    if (cell && cell.kind === "placed") return `${name} placed ${list} here.`;
    return `${name} cleared ${list} here.`;
  }

  root.SudokuPractice = {
    RANK,
    FILL_LABEL,
    rankOf,
    fillLabel,
    promptFor,
    promptShort,
    wantsCandidates,
    techniqueLabel,
    applyStep,
    fillAll,
    fastForward,
    batchesOf,
    highlightOf,
    reviewCopy,
    reviewCopyShort,
    cellDetail,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
