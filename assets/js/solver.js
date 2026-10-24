// Human Sudoku solver. Easiest move first, and every elimination is applied
// to its own candidate state. Technique order matches the Python reference
// grader through swordfish so the two agree on archived puzzles.
//
// Path width, at each step: number of singles, plus technique moves that
// create a single. A bottleneck step has exactly one such move. Stalls are
// episodes where singles have run out (several techniques can share one stall).

(function (root) {
  const FULL = 0x1ff;
  const POP = new Uint8Array(512);
  for (let i = 1; i < 512; i++) POP[i] = POP[i >> 1] + (i & 1);

  const ROWS = [];
  const COLS = [];
  const BOXS = [];
  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) row.push(r * 9 + c);
    ROWS.push(row);
  }
  for (let c = 0; c < 9; c++) {
    const col = [];
    for (let r = 0; r < 9; r++) col.push(r * 9 + c);
    COLS.push(col);
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const box = [];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) box.push((br * 3 + i) * 9 + (bc * 3 + j));
      }
      BOXS.push(box);
    }
  }
  const UNITS = ROWS.concat(COLS, BOXS);
  const ROW_OF = new Uint8Array(81);
  const COL_OF = new Uint8Array(81);
  const BOX_OF = new Uint8Array(81);
  for (let i = 0; i < 81; i++) {
    ROW_OF[i] = (i / 9) | 0;
    COL_OF[i] = i % 9;
    BOX_OF[i] = ((ROW_OF[i] / 3) | 0) * 3 + ((COL_OF[i] / 3) | 0);
  }
  const PEERS = Array.from({ length: 81 }, () => []);
  const SEES = new Uint8Array(81 * 81);
  for (let u = 0; u < UNITS.length; u++) {
    const unit = UNITS[u];
    for (let a = 0; a < 9; a++) {
      for (let b = 0; b < 9; b++) {
        if (a === b) continue;
        const i = unit[a];
        const j = unit[b];
        const key = i * 81 + j;
        if (!SEES[key]) {
          SEES[key] = 1;
          PEERS[i].push(j);
        }
      }
    }
  }

  const RANK_NAME = [
    "single",
    "hidden_box",
    "hidden_line",
    "locked",
    "pair",
    "triple",
    "quad",
    "xwing",
    "xywing",
    "swordfish",
    "chain",
  ];

  function digitOf(bit) {
    return 32 - Math.clz32(bit);
  }

  function eachCombo(items, n, visit) {
    if (items.length < n) return false;
    const pick = new Array(n);
    function rec(start, depth) {
      if (depth === n) return visit(pick);
      const last = items.length - (n - depth);
      for (let i = start; i <= last; i++) {
        pick[depth] = items[i];
        if (rec(i + 1, depth + 1)) return true;
      }
      return false;
    }
    return rec(0, 0);
  }

  function load(puzzle) {
    const v = new Uint8Array(81);
    const c = new Uint16Array(81);
    const rows = new Uint16Array(9);
    const cols = new Uint16Array(9);
    const boxes = new Uint16Array(9);
    let clues = 0;
    for (let i = 0; i < 81; i++) {
      const d = puzzle[i] | 0;
      if (!d) continue;
      clues++;
      v[i] = d;
      const bit = 1 << (d - 1);
      rows[ROW_OF[i]] |= bit;
      cols[COL_OF[i]] |= bit;
      boxes[BOX_OF[i]] |= bit;
    }
    for (let i = 0; i < 81; i++) {
      if (v[i]) continue;
      c[i] = (~(rows[ROW_OF[i]] | cols[COL_OF[i]] | boxes[BOX_OF[i]])) & FULL;
    }
    return { v, c, clues, corrupt: false };
  }

  function place(state, i, digit, solution) {
    const bit = 1 << (digit - 1);
    if (solution && solution[i] && solution[i] !== digit) state.corrupt = true;
    state.v[i] = digit;
    state.c[i] = 0;
    const peers = PEERS[i];
    for (let p = 0; p < peers.length; p++) {
      const j = peers[p];
      if (state.c[j] & bit) {
        if (solution && !state.v[j] && solution[j] === digit) state.corrupt = true;
        state.c[j] &= ~bit;
      }
    }
  }

  function snapshot(state, indexes) {
    const saved = new Uint16Array(indexes.length);
    for (let i = 0; i < indexes.length; i++) saved[i] = state.c[indexes[i]];
    return saved;
  }

  function restore(state, indexes, saved) {
    for (let i = 0; i < indexes.length; i++) state.c[indexes[i]] = saved[i];
  }

  // Python order: lowest-index naked single, else the first hidden single in
  // unit-major (rows, cols, boxes) digit-minor scan order.
  function findSingles(state, boxOnly) {
    let firstNaked = -1;
    let nakedDigit = 0;
    let nakedCount = 0;
    const naked = new Uint8Array(81);
    for (let i = 0; i < 81; i++) {
      if (state.v[i]) continue;
      const mask = state.c[i];
      if (mask && (mask & (mask - 1)) === 0) {
        naked[i] = 1;
        nakedCount++;
        if (firstNaked < 0) {
          firstNaked = i;
          nakedDigit = digitOf(mask);
        }
      }
    }

    let firstHiddenI = -1;
    let firstHiddenD = 0;
    let firstHiddenBox = false;
    const hidden = new Uint8Array(81);
    for (let u = 0; u < UNITS.length; u++) {
      const unit = UNITS[u];
      for (let d = 1; d <= 9; d++) {
        const bit = 1 << (d - 1);
        let pos = -1;
        let count = 0;
        for (let k = 0; k < 9; k++) {
          const i = unit[k];
          if (state.c[i] & bit) {
            count++;
            if (count > 1) break;
            pos = i;
          }
        }
        if (count !== 1) continue;
        const inBox = uniqueInBox(state, pos, bit);
        if (boxOnly && !inBox && !naked[pos]) continue;
        if (!hidden[pos]) hidden[pos] = d;
        if (firstHiddenI < 0 && !naked[pos]) {
          if (boxOnly && !inBox) continue;
          firstHiddenI = pos;
          firstHiddenD = d;
          firstHiddenBox = inBox;
        }
      }
    }

    let width = nakedCount;
    for (let i = 0; i < 81; i++) if (hidden[i] && !naked[i]) width++;

    // The first hidden single that is not also naked, even when a naked single
    // comes first. Fill a technique uses it to fill hidden singles on demand.
    const hiddenPlace =
      firstHiddenI >= 0
        ? { i: firstHiddenI, d: firstHiddenD, kind: firstHiddenBox ? "hidden_box" : "hidden_line" }
        : null;

    if (firstNaked >= 0) {
      return { place: { i: firstNaked, d: nakedDigit, kind: "single" }, hidden: hiddenPlace, width };
    }
    if (hiddenPlace) return { place: hiddenPlace, hidden: hiddenPlace, width };
    return { place: null, hidden: null, width: 0 };
  }

  function uniqueInBox(state, index, bit) {
    const box = BOXS[BOX_OF[index]];
    let count = 0;
    for (let k = 0; k < 9; k++) if (state.c[box[k]] & bit) count++;
    return count === 1;
  }

  function lockedHits(state) {
    const hits = [];
    for (let b = 0; b < 9; b++) {
      const box = BOXS[b];
      for (let d = 0; d < 9; d++) {
        const bit = 1 << d;
        const pos = [];
        for (let k = 0; k < 9; k++) if (state.c[box[k]] & bit) pos.push(box[k]);
        if (pos.length < 2) continue;
        const r0 = ROW_OF[pos[0]];
        const c0 = COL_OF[pos[0]];
        let sameRow = true;
        let sameCol = true;
        for (let t = 1; t < pos.length; t++) {
          if (ROW_OF[pos[t]] !== r0) sameRow = false;
          if (COL_OF[pos[t]] !== c0) sameCol = false;
        }
        if (sameRow) pushLine(state, ROWS[r0], b, bit, true, hits, pos, "row", r0);
        if (sameCol) pushLine(state, COLS[c0], b, bit, true, hits, pos, "column", c0);
      }
    }
    for (let li = 0; li < 9; li++) claim(state, ROWS[li], li, true, hits);
    for (let li = 0; li < 9; li++) claim(state, COLS[li], li, false, hits);
    return hits;
  }

  function pushLine(state, line, boxIndex, bit, pointing, hits, pattern, lineKind, lineIndex) {
    const targets = [];
    for (let k = 0; k < 9; k++) {
      const x = line[k];
      if (pointing && BOX_OF[x] === boxIndex) continue;
      if (state.c[x] & bit) targets.push(x);
    }
    if (targets.length) {
      hits.push({
        targets,
        bit,
        type: "pointing",
        pattern: pattern.slice(),
        box: boxIndex,
        lineKind,
        lineIndex,
      });
    }
  }

  function claim(state, line, lineIndex, isRow, hits) {
    for (let d = 0; d < 9; d++) {
      const bit = 1 << d;
      const pos = [];
      for (let k = 0; k < 9; k++) if (state.c[line[k]] & bit) pos.push(line[k]);
      if (pos.length < 2) continue;
      const b0 = BOX_OF[pos[0]];
      let same = true;
      for (let t = 1; t < pos.length; t++) {
        if (BOX_OF[pos[t]] !== b0) {
          same = false;
          break;
        }
      }
      if (!same) continue;
      const box = BOXS[b0];
      const targets = [];
      for (let k = 0; k < 9; k++) {
        const x = box[k];
        const onLine = isRow ? ROW_OF[x] === lineIndex : COL_OF[x] === lineIndex;
        if (!onLine && state.c[x] & bit) targets.push(x);
      }
      if (targets.length) {
        hits.push({
          targets,
          bit,
          type: "claiming",
          pattern: pos.slice(),
          box: b0,
          lineKind: isRow ? "row" : "column",
          lineIndex,
        });
      }
    }
  }

  function nakedHits(state, n) {
    const hits = [];
    for (let u = 0; u < UNITS.length; u++) {
      const unit = UNITS[u];
      const cells = [];
      for (let k = 0; k < 9; k++) {
        const i = unit[k];
        if (state.v[i]) continue;
        const pc = POP[state.c[i]];
        if (pc >= 2 && pc <= n) cells.push(i);
      }
      if (cells.length < n) continue;
      eachCombo(cells, n, (combo) => {
        let union = 0;
        for (let i = 0; i < n; i++) union |= state.c[combo[i]];
        if (POP[union] !== n) return false;
        const skip = new Uint8Array(81);
        for (let i = 0; i < n; i++) skip[combo[i]] = 1;
        const targets = [];
        for (let k = 0; k < 9; k++) {
          const x = unit[k];
          if (state.v[x] || skip[x]) continue;
          if (state.c[x] & union) targets.push(x);
        }
        if (targets.length) {
          hits.push({
            targets,
            mask: union,
            type: n === 2 ? "naked_pair" : n === 3 ? "naked_triple" : "naked_quad",
            pattern: combo.slice(),
            unit: u,
          });
        }
        return false;
      });
    }
    return hits;
  }

  function hiddenHits(state, n) {
    const hits = [];
    for (let u = 0; u < UNITS.length; u++) {
      const unit = UNITS[u];
      const empt = [];
      for (let k = 0; k < 9; k++) if (!state.v[unit[k]]) empt.push(unit[k]);
      const digs = [];
      for (let d = 0; d < 9; d++) {
        const bit = 1 << d;
        let cnt = 0;
        for (let i = 0; i < empt.length; i++) if (state.c[empt[i]] & bit) cnt++;
        if (cnt >= 2 && cnt <= n) digs.push(d);
      }
      if (digs.length < n) continue;
      eachCombo(digs, n, (combo) => {
        let mask = 0;
        for (let i = 0; i < n; i++) mask |= 1 << combo[i];
        const cells = [];
        for (let i = 0; i < empt.length; i++) if (state.c[empt[i]] & mask) cells.push(empt[i]);
        if (cells.length !== n) return false;
        let extra = false;
        for (let i = 0; i < cells.length; i++) {
          if (state.c[cells[i]] & ~mask & FULL) {
            extra = true;
            break;
          }
        }
        if (extra) {
          hits.push({
            cells,
            mask,
            kind: "hidden",
            type: n === 2 ? "hidden_pair" : n === 3 ? "hidden_triple" : "hidden_quad",
            pattern: cells.slice(),
            unit: u,
          });
        }
        return false;
      });
    }
    return hits;
  }

  function fishHits(state, n) {
    const hits = [];
    for (let d = 0; d < 9; d++) {
      const bit = 1 << d;
      collectFish(state, bit, n, ROWS, COLS, COL_OF, hits);
      collectFish(state, bit, n, COLS, ROWS, ROW_OF, hits);
    }
    return hits;
  }

  function collectFish(state, bit, n, base, cover, keyOf, hits) {
    const lines = [];
    for (let li = 0; li < 9; li++) {
      const line = base[li];
      let mask = 0;
      let cnt = 0;
      for (let k = 0; k < 9; k++) {
        const i = line[k];
        if (state.c[i] & bit) {
          const m = 1 << keyOf[i];
          if (!(mask & m)) cnt++;
          mask |= m;
        }
      }
      if (cnt >= 2 && cnt <= n) lines.push({ line, mask, index: li });
    }
    if (lines.length < n) return;
    eachCombo(lines, n, (combo) => {
      let coverMask = 0;
      for (let i = 0; i < n; i++) coverMask |= combo[i].mask;
      if (POP[coverMask] !== n) return false;
      const inBase = new Uint8Array(81);
      for (let i = 0; i < n; i++) {
        const line = combo[i].line;
        for (let k = 0; k < 9; k++) inBase[line[k]] = 1;
      }
      const targets = [];
      let bits = coverMask;
      while (bits) {
        const kbit = bits & -bits;
        bits ^= kbit;
        const k = 31 - Math.clz32(kbit);
        const coverLine = cover[k];
        for (let t = 0; t < 9; t++) {
          const i = coverLine[t];
          if (!inBase[i] && state.c[i] & bit) targets.push(i);
        }
      }
      if (targets.length) {
        const pattern = [];
        const lineIndexes = [];
        for (let i = 0; i < n; i++) {
          lineIndexes.push(combo[i].index);
          const fishLine = combo[i].line;
          for (let k = 0; k < 9; k++) if (state.c[fishLine[k]] & bit) pattern.push(fishLine[k]);
        }
        hits.push({
          targets,
          bit,
          type: n === 2 ? "xwing" : "swordfish",
          pattern,
          fishBase: base === ROWS ? "row" : "column",
          lineIndexes,
        });
      }
      return false;
    });
  }

  function xywingHits(state) {
    const bv = [];
    for (let i = 0; i < 81; i++) if (POP[state.c[i]] === 2) bv.push(i);
    const hits = [];
    for (let pIndex = 0; pIndex < bv.length; pIndex++) {
      const p = bv[pIndex];
      const pc = state.c[p];
      for (let aIndex = 0; aIndex < bv.length; aIndex++) {
        const a = bv[aIndex];
        if (!SEES[p * 81 + a]) continue;
        const ac = state.c[a];
        const interA = ac & pc;
        if (POP[interA] !== 1) continue;
        for (let bIndex = 0; bIndex < bv.length; bIndex++) {
          const b = bv[bIndex];
          if (b === a || !SEES[p * 81 + b]) continue;
          const bc = state.c[b];
          const interB = bc & pc;
          if (POP[interB] !== 1) continue;
          const za = ac & ~pc & FULL;
          const zb = bc & ~pc & FULL;
          if (za !== zb || interA === interB) continue;
          const targets = [];
          const peers = PEERS[a];
          for (let i = 0; i < peers.length; i++) {
            const cell = peers[i];
            if (cell !== p && SEES[b * 81 + cell] && state.c[cell] & za) targets.push(cell);
          }
          if (targets.length) {
            hits.push({
              targets,
              bit: za,
              type: "xywing",
              pattern: [p, a, b],
              pivot: p,
            });
          }
        }
      }
    }
    return hits;
  }

  function coloringHits(state) {
    const hits = [];
    const adj = Array.from({ length: 81 }, () => []);
    for (let d = 0; d < 9; d++) {
      const bit = 1 << d;
      for (let i = 0; i < 81; i++) adj[i].length = 0;
      for (let u = 0; u < UNITS.length; u++) {
        const unit = UNITS[u];
        let a = -1;
        let b = -1;
        let count = 0;
        for (let k = 0; k < 9; k++) {
          if (state.c[unit[k]] & bit) {
            count++;
            if (count === 1) a = unit[k];
            else if (count === 2) b = unit[k];
            else break;
          }
        }
        if (count === 2) {
          adj[a].push(b);
          adj[b].push(a);
        }
      }
      const color = new Int8Array(81);
      const seen = new Uint8Array(81);
      for (let start = 0; start < 81; start++) {
        if (seen[start] || adj[start].length === 0 || !(state.c[start] & bit)) continue;
        const comp = [];
        const queue = [start];
        seen[start] = 1;
        color[start] = 1;
        let falseColor = 0;
        for (let qi = 0; qi < queue.length; qi++) {
          const node = queue[qi];
          comp.push(node);
          const next = adj[node];
          for (let e = 0; e < next.length; e++) {
            const other = next[e];
            if (!seen[other]) {
              seen[other] = 1;
              color[other] = 3 - color[node];
              queue.push(other);
            } else if (color[other] === color[node]) {
              falseColor = color[node];
            }
          }
        }
        if (!falseColor) {
          for (let a = 0; a < comp.length && !falseColor; a++) {
            for (let b = a + 1; b < comp.length; b++) {
              if (color[comp[a]] === color[comp[b]] && SEES[comp[a] * 81 + comp[b]]) {
                falseColor = color[comp[a]];
                break;
              }
            }
          }
        }
        if (falseColor) {
          const targets = [];
          for (let i = 0; i < comp.length; i++) {
            if (color[comp[i]] === falseColor && state.c[comp[i]] & bit) targets.push(comp[i]);
          }
          if (targets.length) hits.push({ targets, bit, type: "coloring", pattern: comp.slice() });
          continue;
        }
        for (let i = 0; i < 81; i++) {
          if (state.v[i] || color[i] || !(state.c[i] & bit)) continue;
          let see1 = false;
          let see2 = false;
          for (let j = 0; j < comp.length; j++) {
            if (!SEES[i * 81 + comp[j]]) continue;
            if (color[comp[j]] === 1) see1 = true;
            else see2 = true;
          }
          if (see1 && see2) hits.push({ targets: [i], bit, type: "coloring", pattern: comp.slice() });
        }
      }
    }
    return hits;
  }

  function xyChainHits(state) {
    const bv = [];
    for (let i = 0; i < 81; i++) if (POP[state.c[i]] === 2) bv.push(i);
    const hits = [];
    let budget = 4000;
    const onPath = new Uint8Array(81);

    function dfs(prev, link, target, start, path) {
      if (budget <= 0 || hits.length >= 24) return;
      for (let n = 0; n < bv.length; n++) {
        if (budget-- <= 0) return;
        const nxt = bv[n];
        if (onPath[nxt] || !SEES[prev * 81 + nxt]) continue;
        const mask = state.c[nxt];
        if ((mask & link) === 0) continue;
        const other = mask ^ link;
        if (other === target && path.length >= 3) {
          const targets = [];
          const peers = PEERS[start];
          for (let i = 0; i < peers.length; i++) {
            const cell = peers[i];
            if (SEES[nxt * 81 + cell] && state.c[cell] & target) targets.push(cell);
          }
          if (targets.length) {
            hits.push({ targets, bit: target, type: "xychain", pattern: path.concat(nxt) });
          }
        } else if (other !== target && path.length < 7) {
          onPath[nxt] = 1;
          path.push(nxt);
          dfs(nxt, other, target, start, path);
          path.pop();
          onPath[nxt] = 0;
        }
      }
    }

    for (let s = 0; s < bv.length && hits.length < 24 && budget > 0; s++) {
      const start = bv[s];
      const mask = state.c[start];
      const low = mask & -mask;
      const high = mask ^ low;
      const targets = low < high ? [low, high] : [high, low];
      for (let t = 0; t < 2 && hits.length < 24 && budget > 0; t++) {
        const target = targets[t];
        onPath[start] = 1;
        dfs(start, mask ^ target, target, start, [start]);
        onPath[start] = 0;
      }
    }
    return hits;
  }

  // Two strong links on one digit that share one cover line and miss the other.
  // The cells that see both free ends lose the digit. Tried after swordfish so
  // an X-wing or swordfish that is also present still goes first.
  function skyscraperHits(state) {
    const hits = [];
    for (let d = 0; d < 9; d++) {
      const bit = 1 << d;
      collectSkyscraper(state, bit, ROWS, COL_OF, "row", hits);
      collectSkyscraper(state, bit, COLS, ROW_OF, "column", hits);
    }
    return hits;
  }

  function strongPairs(state, bit, lines, keyOf) {
    const found = [];
    for (let li = 0; li < 9; li++) {
      const line = lines[li];
      const cells = [];
      for (let k = 0; k < 9; k++) if (state.c[line[k]] & bit) cells.push(line[k]);
      if (cells.length === 2) found.push({ cells, keys: [keyOf[cells[0]], keyOf[cells[1]]] });
    }
    return found;
  }

  function seenByBoth(state, bit, a, b, skip) {
    const targets = [];
    for (let i = 0; i < 81; i++) {
      if (skip[i] || !(state.c[i] & bit)) continue;
      if (SEES[i * 81 + a] && SEES[i * 81 + b]) targets.push(i);
    }
    return targets;
  }

  function collectSkyscraper(state, bit, lines, keyOf, baseKind, hits) {
    const pairs = strongPairs(state, bit, lines, keyOf);
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const left = pairs[i];
        const right = pairs[j];
        let shared = -1;
        for (let k = 0; k < 2; k++) {
          if (left.keys[k] === right.keys[0] || left.keys[k] === right.keys[1]) {
            if (shared >= 0 && shared !== left.keys[k]) {
              shared = -2;
              break;
            }
            shared = left.keys[k];
          }
        }
        if (shared < 0) continue;
        const roofA = left.cells[left.keys[0] === shared ? 1 : 0];
        const roofB = right.cells[right.keys[0] === shared ? 1 : 0];
        if (keyOf[roofA] === keyOf[roofB]) continue;
        const skip = new Uint8Array(81);
        skip[left.cells[0]] = 1;
        skip[left.cells[1]] = 1;
        skip[right.cells[0]] = 1;
        skip[right.cells[1]] = 1;
        const targets = seenByBoth(state, bit, roofA, roofB, skip);
        if (!targets.length) continue;
        hits.push({
          targets,
          bit,
          type: "skyscraper",
          pattern: [left.cells[0], left.cells[1], right.cells[0], right.cells[1]],
          fishBase: baseKind,
          roofs: [roofA, roofB],
        });
      }
    }
  }

  // A row strong link and a column strong link for one digit, joined by one box.
  function kiteHits(state) {
    const hits = [];
    for (let d = 0; d < 9; d++) {
      const bit = 1 << d;
      const rows = strongPairs(state, bit, ROWS, COL_OF);
      const cols = strongPairs(state, bit, COLS, ROW_OF);
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols.length; c++) {
          const row = rows[r];
          const col = cols[c];
          if (
            row.cells[0] === col.cells[0] ||
            row.cells[0] === col.cells[1] ||
            row.cells[1] === col.cells[0] ||
            row.cells[1] === col.cells[1]
          ) {
            continue;
          }
          const links = [];
          for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
              if (BOX_OF[row.cells[i]] === BOX_OF[col.cells[j]]) links.push(i * 2 + j);
            }
          }
          if (links.length !== 1) continue;
          const ri = links[0] >> 1;
          const ci = links[0] & 1;
          const tailR = row.cells[1 - ri];
          const tailC = col.cells[1 - ci];
          const skip = new Uint8Array(81);
          skip[row.cells[0]] = 1;
          skip[row.cells[1]] = 1;
          skip[col.cells[0]] = 1;
          skip[col.cells[1]] = 1;
          const targets = seenByBoth(state, bit, tailR, tailC, skip);
          if (!targets.length) continue;
          hits.push({
            targets,
            bit,
            type: "kite",
            pattern: [row.cells[0], row.cells[1], col.cells[0], col.cells[1]],
            roofs: [tailR, tailC],
          });
        }
      }
    }
    return hits;
  }

  // Pivot with three candidates, two wings that split them. A cell that sees
  // all three loses the digit the wings share.
  function xyzwingHits(state) {
    const tri = [];
    const bi = [];
    for (let i = 0; i < 81; i++) {
      const pop = POP[state.c[i]];
      if (pop === 3) tri.push(i);
      else if (pop === 2) bi.push(i);
    }
    const hits = [];
    for (let pIndex = 0; pIndex < tri.length; pIndex++) {
      const p = tri[pIndex];
      const pc = state.c[p];
      const wings = [];
      for (let w = 0; w < bi.length; w++) {
        const cell = bi[w];
        if (!SEES[p * 81 + cell]) continue;
        const mask = state.c[cell];
        if ((mask & ~pc) !== 0 || POP[mask] !== 2) continue;
        wings.push(cell);
      }
      for (let i = 0; i < wings.length; i++) {
        for (let j = i + 1; j < wings.length; j++) {
          const a = wings[i];
          const b = wings[j];
          const ac = state.c[a];
          const bc = state.c[b];
          if (ac === bc || (ac | bc) !== pc) continue;
          const shared = ac & bc;
          if (POP[shared] !== 1) continue;
          const skip = new Uint8Array(81);
          skip[p] = 1;
          skip[a] = 1;
          skip[b] = 1;
          const targets = [];
          for (let cell = 0; cell < 81; cell++) {
            if (skip[cell] || !(state.c[cell] & shared)) continue;
            if (SEES[cell * 81 + p] && SEES[cell * 81 + a] && SEES[cell * 81 + b]) targets.push(cell);
          }
          if (!targets.length) continue;
          hits.push({
            targets,
            bit: shared,
            type: "xyzwing",
            pattern: [p, a, b],
            pivot: p,
          });
        }
      }
    }
    return hits;
  }

  // Two matching bivalue cells that do not see each other, joined by a strong
  // link on one of their digits. At least one wing is the other digit.
  function wwingHits(state) {
    const hits = [];
    const bi = [];
    for (let i = 0; i < 81; i++) if (POP[state.c[i]] === 2) bi.push(i);
    const links = [];
    for (let d = 0; d < 9; d++) {
      const bit = 1 << d;
      const groups = [ROWS, COLS, BOXS];
      for (let g = 0; g < groups.length; g++) {
        const lines = groups[g];
        for (let li = 0; li < 9; li++) {
          const line = lines[li];
          const cells = [];
          for (let k = 0; k < 9; k++) if (state.c[line[k]] & bit) cells.push(line[k]);
          if (cells.length === 2) links.push({ bit, cells });
        }
      }
    }
    for (let i = 0; i < bi.length && hits.length < 12; i++) {
      for (let j = i + 1; j < bi.length && hits.length < 12; j++) {
        const a = bi[i];
        const b = bi[j];
        if (state.c[a] !== state.c[b] || SEES[a * 81 + b]) continue;
        const digits = maskDigits(state.c[a]);
        for (let s = 0; s < 2 && hits.length < 12; s++) {
          const linkBit = 1 << (digits[s] - 1);
          const elimBit = 1 << (digits[1 - s] - 1);
          for (let n = 0; n < links.length && hits.length < 12; n++) {
            const link = links[n];
            if (link.bit !== linkBit) continue;
            const p = link.cells[0];
            const q = link.cells[1];
            if (p === a || p === b || q === a || q === b) continue;
            const aSeesP = SEES[a * 81 + p];
            const aSeesQ = SEES[a * 81 + q];
            const bSeesP = SEES[b * 81 + p];
            const bSeesQ = SEES[b * 81 + q];
            const crossed = (aSeesP && !aSeesQ && bSeesQ && !bSeesP) || (aSeesQ && !aSeesP && bSeesP && !bSeesQ);
            if (!crossed) continue;
            const skip = new Uint8Array(81);
            skip[a] = 1;
            skip[b] = 1;
            skip[p] = 1;
            skip[q] = 1;
            const targets = seenByBoth(state, elimBit, a, b, skip);
            if (!targets.length) continue;
            hits.push({
              targets,
              bit: elimBit,
              type: "wwing",
              pattern: [a, b, p, q],
            });
          }
        }
      }
    }
    return hits;
  }

  // Counted once per solve. Unique rectangle and BUG+1 both read it.
  function ensureUnique(state) {
    if (state.uniqueChecked) return state.unique;
    const puzzle = [];
    for (let i = 0; i < 81; i++) puzzle.push(state.v[i]);
    state.unique = countSolutions(puzzle, 2) === 1;
    state.uniqueChecked = true;
    return state.unique;
  }

  // Type 1. Three corners of a two-box rectangle are exactly two digits.
  // The fourth holds those digits plus extras. A unique puzzle cannot leave
  // the rectangle able to flip, so the two digits come off the fourth cell.
  function uniqueRectangleHits(state) {
    const hits = [];
    if (!ensureUnique(state)) return hits;
    for (let r1 = 0; r1 < 8 && hits.length < 8; r1++) {
      for (let r2 = r1 + 1; r2 < 9 && hits.length < 8; r2++) {
        const sameBand = ((r1 / 3) | 0) === ((r2 / 3) | 0);
        for (let c1 = 0; c1 < 8 && hits.length < 8; c1++) {
          for (let c2 = c1 + 1; c2 < 9 && hits.length < 8; c2++) {
            const sameStack = ((c1 / 3) | 0) === ((c2 / 3) | 0);
            if (sameBand === sameStack) continue;
            const cells = [r1 * 9 + c1, r1 * 9 + c2, r2 * 9 + c1, r2 * 9 + c2];
            let filled = false;
            const masks = [];
            for (let k = 0; k < 4; k++) {
              if (state.v[cells[k]]) filled = true;
              masks.push(state.c[cells[k]]);
            }
            if (filled) continue;
            const bi = [];
            for (let k = 0; k < 4; k++) if (POP[masks[k]] === 2) bi.push(k);
            if (bi.length !== 3) continue;
            const base = masks[bi[0]];
            if (masks[bi[1]] !== base || masks[bi[2]] !== base) continue;
            const extraAt = [0, 1, 2, 3].find((k) => bi.indexOf(k) < 0);
            const extraMask = masks[extraAt];
            if ((extraMask & base) !== base || POP[extraMask] < 3) continue;
            const ordered = [cells[bi[0]], cells[bi[1]], cells[bi[2]], cells[extraAt]];
            hits.push({
              targets: [cells[extraAt]],
              mask: base,
              type: "uniquerect",
              pattern: ordered,
            });
          }
        }
      }
    }
    return hits;
  }

  // BUG+1. Every empty cell has two candidates except one cell with three.
  // The candidate that appears three times in a house is the one that stays.
  function bugHits(state) {
    const hits = [];
    if (!ensureUnique(state)) return hits;
    let tri = -1;
    for (let i = 0; i < 81; i++) {
      if (state.v[i]) continue;
      const pop = POP[state.c[i]];
      if (pop === 2) continue;
      if (pop === 3 && tri < 0) {
        tri = i;
        continue;
      }
      return hits;
    }
    if (tri < 0) return hits;
    const extraDigits = [];
    const groups = [ROWS, COLS, BOXS];
    for (let g = 0; g < groups.length; g++) {
      const lines = groups[g];
      for (let li = 0; li < 9; li++) {
        const line = lines[li];
        let holdsTri = false;
        const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let k = 0; k < 9; k++) {
          const cell = line[k];
          if (cell === tri) holdsTri = true;
          const mask = state.c[cell];
          for (let d = 0; d < 9; d++) if (mask & (1 << d)) counts[d]++;
        }
        for (let d = 0; d < 9; d++) {
          const count = counts[d];
          if (count === 0 || count === 2) continue;
          if (count === 3 && holdsTri && (state.c[tri] & (1 << d))) {
            extraDigits.push(d);
            continue;
          }
          return hits;
        }
      }
    }
    const kinds = [];
    for (let i = 0; i < extraDigits.length; i++) if (kinds.indexOf(extraDigits[i]) < 0) kinds.push(extraDigits[i]);
    if (kinds.length !== 1) return hits;
    const keep = 1 << kinds[0];
    const elim = state.c[tri] & ~keep & FULL;
    if (POP[elim] !== 2) return hits;
    hits.push({
      targets: [tri],
      mask: elim,
      bit: keep,
      type: "bug",
      pattern: [tri],
    });
    return hits;
  }

  const TECHNIQUES = [
    { name: "locked", rank: 3, find: lockedHits },
    { name: "naked_pair", rank: 4, find: (state) => nakedHits(state, 2) },
    { name: "hidden_pair", rank: 4, find: (state) => hiddenHits(state, 2) },
    { name: "naked_triple", rank: 5, find: (state) => nakedHits(state, 3) },
    { name: "hidden_triple", rank: 5, find: (state) => hiddenHits(state, 3) },
    { name: "naked_quad", rank: 6, find: (state) => nakedHits(state, 4) },
    { name: "hidden_quad", rank: 6, find: (state) => hiddenHits(state, 4) },
    { name: "xwing", rank: 7, find: (state) => fishHits(state, 2) },
    { name: "xywing", rank: 8, find: xywingHits },
    { name: "swordfish", rank: 9, find: (state) => fishHits(state, 3) },
    { name: "skyscraper", rank: 9, find: skyscraperHits },
    { name: "kite", rank: 9, find: kiteHits },
    { name: "xyzwing", rank: 9, find: xyzwingHits },
    { name: "wwing", rank: 9, find: wwingHits },
    { name: "uniquerect", rank: 9, find: uniqueRectangleHits },
    { name: "bug", rank: 9, find: bugHits },
    { name: "coloring", rank: 10, find: coloringHits },
    { name: "xychain", rank: 10, find: xyChainHits },
  ];

  function applyHit(state, hit, solution) {
    if (hit.kind === "hidden") {
      for (let i = 0; i < hit.cells.length; i++) {
        const cell = hit.cells[i];
        const next = state.c[cell] & hit.mask;
        if (solution && solution[cell] && !(next & (1 << (solution[cell] - 1)))) state.corrupt = true;
        state.c[cell] = next;
      }
      return;
    }
    const mask = hit.mask || hit.bit;
    for (let i = 0; i < hit.targets.length; i++) {
      const cell = hit.targets[i];
      if (!(state.c[cell] & mask)) continue;
      const next = state.c[cell] & ~mask;
      if (solution && solution[cell] && state.c[cell] & (1 << (solution[cell] - 1)) && !(next & (1 << (solution[cell] - 1)))) {
        state.corrupt = true;
      }
      state.c[cell] = next;
    }
  }

  function createsSingle(state, hit) {
    const indexes = hit.kind === "hidden" ? hit.cells : hit.targets;
    const saved = snapshot(state, indexes);
    applyHit(state, hit, null);
    const created = findSingles(state, false).place !== null;
    restore(state, indexes, saved);
    return created;
  }

// Width of the easiest tier. Singles are placements. When none are left, the
// moves are the applications of the easiest technique that create a single
// (or, if none do, the applications that delete a candidate).
function stepWidth(state, singleCount, rankCap) {
  if (singleCount > 0) return singleCount;
  const cap = rankCap == null ? 10 : rankCap;
  for (let t = 0; t < TECHNIQUES.length; t++) {
    const tech = TECHNIQUES[t];
    if (tech.rank > cap) break;
    const hits = tech.find(state);
    if (!hits.length) continue;
    let leads = 0;
    for (let h = 0; h < hits.length; h++) if (createsSingle(state, hits[h])) leads++;
    return leads > 0 ? leads : hits.length;
  }
  return 0;
}

  function filledCount(state) {
    let n = 0;
    for (let i = 0; i < 81; i++) if (state.v[i]) n++;
    return n;
  }

  function finish(state, info) {
    const solved = filledCount(state) === 81 && !state.corrupt;
    if (info.filledAtFirstStall < 0) info.filledAtFirstStall = solved ? 81 : filledCount(state);
    const rank = solved ? info.rank : 11;
    return {
      solved,
      corrupt: state.corrupt,
      tooHard: false,
      rank: solved ? info.rank : 11,
      hardestName: solved ? info.hardestName : "stuck",
      techniques: info.techniques,
      used: info.used,
      steps: info.steps,
      stalls: info.stalls,
      bottlenecks: info.bottlenecks,
      placedBeforeStall: info.placedBeforeStall,
      filledAtFirstStall: info.filledAtFirstStall,
      widths: info.widths,
      clues: state.clues,
      values: state.v,
      path: info.path,
    };
  }

  // Page slugs, in the order the solver actually applied them. `techniques`
  // and `hardestName` stay on the coarse grader names.
  const PATH_SLUG = {
    single: "naked-single",
    hidden_box: "hidden-single",
    hidden_line: "hidden-single",
    pointing: "pointing",
    claiming: "claiming",
    naked_pair: "naked-pair",
    hidden_pair: "hidden-pair",
    naked_triple: "naked-triple",
    hidden_triple: "hidden-triple",
    naked_quad: "quads",
    hidden_quad: "quads",
    xwing: "x-wing",
    swordfish: "swordfish",
    xywing: "xy-wing",
    skyscraper: "skyscraper",
    kite: "two-string-kite",
    xyzwing: "xyz-wing",
    wwing: "w-wing",
    uniquerect: "unique-rectangle",
    bug: "bug-plus-one",
    coloring: "coloring",
    xychain: "xy-chain",
  };

  function notePath(info, type) {
    const slug = PATH_SLUG[type];
    if (!slug || info.seenPath[slug]) return;
    info.seenPath[slug] = 1;
    info.path.push(slug);
  }

  function tooHard(state, info) {
    const result = finish(state, info);
    result.solved = false;
    result.tooHard = true;
    result.hardestName = "too_hard";
    return result;
  }

  function grade(puzzle, options) {
    const opt = options || {};
    const solution = opt.solution || null;
    const state = load(puzzle);
    const info = {
      rank: 0,
      hardestName: "single",
      techniques: [],
      used: {},
      steps: 0,
      stalls: 0,
      bottlenecks: 0,
      placedBeforeStall: 0,
      filledAtFirstStall: -1,
      widths: opt.exactWidths ? [] : null,
      path: [],
      seenPath: {},
    };
    let inStall = false;
    let guard = 0;
    while (filledCount(state) < 81 && guard++ < 300) {
      if (state.corrupt) break;
      const singles = findSingles(state, Boolean(opt.boxOnly));
      if (opt.metrics !== false) {
        const available = stepWidth(state, singles.width, opt.maxRank == null ? 10 : opt.maxRank);
        if (info.widths) info.widths.push(available);
        if (available === 1) info.bottlenecks++;
      }

      if (singles.place) {
        if (info.filledAtFirstStall < 0) info.placedBeforeStall++;
        const kind = singles.place.kind;
        info.used[kind] = (info.used[kind] || 0) + 1;
        if (kind === "hidden_box" && info.rank < 1) {
          info.rank = 1;
          info.hardestName = "hidden_box";
        } else if (kind === "hidden_line" && info.rank < 2) {
          info.rank = 2;
          info.hardestName = "hidden_line";
        }
        notePath(info, kind);
        place(state, singles.place.i, singles.place.d, solution);
        inStall = false;
        continue;
      }

      if (!inStall) {
        info.stalls++;
        inStall = true;
        if (info.filledAtFirstStall < 0) info.filledAtFirstStall = filledCount(state);
      }
      if (opt.maxStalls != null && info.stalls > opt.maxStalls) return tooHard(state, info);

      let applied = false;
      for (let t = 0; t < TECHNIQUES.length; t++) {
        const tech = TECHNIQUES[t];
        if (opt.maxRank != null && tech.rank > opt.maxRank) return tooHard(state, info);
        const hits = tech.find(state);
        if (!hits.length) continue;
        applyHit(state, hits[0], solution);
        notePath(info, hits[0].type);
        info.steps++;
        info.techniques.push(tech.name);
        info.used[tech.name] = (info.used[tech.name] || 0) + 1;
        if (tech.rank >= info.rank) {
          info.rank = tech.rank;
          info.hardestName = tech.name;
        }
        applied = true;
        break;
      }
      if (!applied) break;
      if (opt.maxSteps != null && info.steps > opt.maxSteps) return tooHard(state, info);
    }

    if (solution && !state.corrupt) {
      for (let i = 0; i < 81; i++) {
        if (state.v[i] && state.v[i] !== solution[i]) state.corrupt = true;
      }
    }
    return finish(state, info);
  }

  function nextStep(puzzle) {
    const state = load(puzzle);
    const singles = findSingles(state, false);
    if (!singles.place) return null;
    return { index: singles.place.i, digit: singles.place.d, kind: singles.place.kind };
  }

  function countSolutions(puzzle, limit) {
    const cap = limit == null ? 2 : limit;
    const rows = new Uint16Array(9);
    const cols = new Uint16Array(9);
    const boxes = new Uint16Array(9);
    const empty = [];
    for (let i = 0; i < 81; i++) {
      const d = puzzle[i] | 0;
      if (!d) {
        empty.push(i);
        continue;
      }
      const bit = 1 << (d - 1);
      const r = ROW_OF[i];
      const c = COL_OF[i];
      const b = BOX_OF[i];
      if (rows[r] & bit || cols[c] & bit || boxes[b] & bit) return 0;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
    }
    let found = 0;
    function search(k) {
      if (found >= cap) return;
      if (k === empty.length) {
        found++;
        return;
      }
      let best = k;
      let bestCount = 10;
      for (let i = k; i < empty.length; i++) {
        const idx = empty[i];
        const mask = (~(rows[ROW_OF[idx]] | cols[COL_OF[idx]] | boxes[BOX_OF[idx]])) & FULL;
        const cnt = POP[mask];
        if (cnt < bestCount) {
          best = i;
          bestCount = cnt;
          if (cnt < 2) break;
        }
      }
      if (bestCount === 0) return;
      if (best !== k) {
        const swap = empty[k];
        empty[k] = empty[best];
        empty[best] = swap;
      }
      const idx = empty[k];
      const r = ROW_OF[idx];
      const c = COL_OF[idx];
      const b = BOX_OF[idx];
      let bits = (~(rows[r] | cols[c] | boxes[b])) & FULL;
      while (bits) {
        const bit = bits & -bits;
        bits ^= bit;
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[b] |= bit;
        search(k + 1);
        rows[r] ^= bit;
        cols[c] ^= bit;
        boxes[b] ^= bit;
        if (found >= cap) break;
      }
      if (best !== k) {
        const swap = empty[k];
        empty[k] = empty[best];
        empty[best] = swap;
      }
    }
    search(0);
    return found;
  }

  function fillGrid(random) {
    const rows = new Uint16Array(9);
    const cols = new Uint16Array(9);
    const boxes = new Uint16Array(9);
    const values = new Uint8Array(81);
    function search(i) {
      if (i === 81) return true;
      const r = ROW_OF[i];
      const c = COL_OF[i];
      const b = BOX_OF[i];
      let mask = (~(rows[r] | cols[c] | boxes[b])) & FULL;
      const opts = [];
      while (mask) {
        const bit = mask & -mask;
        mask ^= bit;
        opts.push(bit);
      }
      for (let a = opts.length - 1; a > 0; a--) {
        const s = (random() * (a + 1)) | 0;
        const tmp = opts[a];
        opts[a] = opts[s];
        opts[s] = tmp;
      }
      for (let o = 0; o < opts.length; o++) {
        const bit = opts[o];
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[b] |= bit;
        values[i] = digitOf(bit);
        if (search(i + 1)) return true;
        rows[r] ^= bit;
        cols[c] ^= bit;
        boxes[b] ^= bit;
        values[i] = 0;
      }
      return false;
    }
    if (!search(0)) return null;
    return Array.from(values);
  }

  function maskDigits(mask) {
    const digits = [];
    let bits = mask & FULL;
    while (bits) {
      const bit = bits & -bits;
      bits ^= bit;
      digits.push(digitOf(bit));
    }
    return digits;
  }

  function joinDigits(digits) {
    if (digits.length <= 1) return String(digits[0] || "");
    if (digits.length === 2) return `${digits[0]} and ${digits[1]}`;
    return `${digits.slice(0, -1).join(", ")}, and ${digits[digits.length - 1]}`;
  }

  function housePhrase(kind, index) {
    const n = index + 1;
    if (kind === "row") return `row ${n}`;
    if (kind === "column") return `column ${n}`;
    return `box ${n}`;
  }

  function unitPhrase(unit) {
    if (unit < 9) return housePhrase("row", unit);
    if (unit < 18) return housePhrase("column", unit - 9);
    return housePhrase("box", unit - 18);
  }

  function candidateSnapshot(state, indexes) {
    const seen = new Uint8Array(81);
    const out = [];
    for (let n = 0; n < indexes.length; n++) {
      const index = indexes[n];
      if (index == null || index < 0 || seen[index] || state.v[index]) continue;
      seen[index] = 1;
      const digits = maskDigits(state.c[index]);
      if (digits.length) out.push({ index, digits });
    }
    return out;
  }

  function eliminationList(state, hit) {
    const out = [];
    if (hit.kind === "hidden") {
      for (let i = 0; i < hit.cells.length; i++) {
        const cell = hit.cells[i];
        const extra = state.c[cell] & ~hit.mask & FULL;
        const digits = maskDigits(extra);
        for (let d = 0; d < digits.length; d++) out.push({ index: cell, digit: digits[d] });
      }
      return out;
    }
    const mask = hit.mask || hit.bit;
    for (let i = 0; i < hit.targets.length; i++) {
      const cell = hit.targets[i];
      const gone = state.c[cell] & mask;
      const digits = maskDigits(gone);
      for (let d = 0; d < digits.length; d++) out.push({ index: cell, digit: digits[d] });
    }
    return out;
  }

  function resultingPlace(state, hit) {
    const indexes = hit.kind === "hidden" ? hit.cells : hit.targets;
    const saved = snapshot(state, indexes);
    applyHit(state, hit, null);
    const place = findSingles(state, false).place;
    restore(state, indexes, saved);
    if (!place) return null;
    return { index: place.i, digit: place.d };
  }

  const STEP_SLUG = {
    pointing: "pointing",
    claiming: "claiming",
    naked_pair: "naked-pair",
    hidden_pair: "hidden-pair",
    naked_triple: "naked-triple",
    hidden_triple: "hidden-triple",
    naked_quad: "quads",
    hidden_quad: "quads",
    xwing: "x-wing",
    swordfish: "swordfish",
    xywing: "xy-wing",
    skyscraper: "skyscraper",
    kite: "two-string-kite",
    xyzwing: "xyz-wing",
    wwing: "w-wing",
    uniquerect: "unique-rectangle",
    bug: "bug-plus-one",
    coloring: "coloring",
    xychain: "xy-chain",
  };

  const STEP_NAME = {
    pointing: "Pointing",
    claiming: "Claiming",
    naked_pair: "Naked pair",
    hidden_pair: "Hidden pair",
    naked_triple: "Naked triple",
    hidden_triple: "Hidden triple",
    naked_quad: "Naked quad",
    hidden_quad: "Hidden quad",
    xwing: "X-wing",
    swordfish: "Swordfish",
    xywing: "XY-wing",
    skyscraper: "Skyscraper",
    kite: "Two-string kite",
    xyzwing: "XYZ-wing",
    wwing: "W-wing",
    uniquerect: "Unique rectangle",
    bug: "BUG+1",
    coloring: "Simple coloring",
    xychain: "XY-chain",
  };

  function copyList(list) {
    return list.slice();
  }

  function describeSingle(state, place) {
    const index = place.i;
    const digit = place.d;
    const row = ROW_OF[index] + 1;
    const col = COL_OF[index] + 1;
    if (place.kind === "single") {
      return {
        slug: "naked-single",
        name: "Naked single",
        look: "Look at this cell.",
        explain: `Every other digit is already used in row ${row}, column ${col}, or their box, so this cell has to be ${digit}.`,
        pattern: [index],
        region: [index],
        eliminate: [],
        place: { index, digit },
        candidates: [{ index, digits: [digit] }],
      };
    }
    const bit = 1 << (digit - 1);
    let unit;
    let phrase;
    if (place.kind === "hidden_box") {
      unit = BOXS[BOX_OF[index]];
      phrase = housePhrase("box", BOX_OF[index]);
    } else {
      let rowCount = 0;
      const rowCells = ROWS[ROW_OF[index]];
      for (let k = 0; k < 9; k++) if (state.c[rowCells[k]] & bit) rowCount++;
      if (rowCount === 1) {
        unit = rowCells;
        phrase = housePhrase("row", ROW_OF[index]);
      } else {
        unit = COLS[COL_OF[index]];
        phrase = housePhrase("column", COL_OF[index]);
      }
    }
    const house = phrase.split(" ")[0];
    const extras = maskDigits(state.c[index] & ~bit);
    return {
      slug: "hidden-single",
      name: "Hidden single",
      look: `Look at the ${digit}s in this ${house}.`,
      explain: `${digit} fits in only one cell of ${phrase}, so it goes in row ${row}, column ${col}.`,
      pattern: [index],
      region: copyList(unit),
      eliminate: extras.map((extra) => ({ index, digit: extra })),
      place: { index, digit },
      candidates: [{ index, digits: maskDigits(state.c[index]) }],
    };
  }

  function describeHit(state, hit) {
    const type = hit.type;
    const digit = hit.bit ? digitOf(hit.bit) : 0;
    const eliminate = eliminationList(state, hit);
    const place = resultingPlace(state, hit);
    let look = "Look at these cells.";
    let explain = "This step removes candidates.";
    let region = hit.pattern ? hit.pattern.slice() : [];

    if (type === "pointing") {
      const line = housePhrase(hit.lineKind, hit.lineIndex);
      look = `Look at the ${digit}s in this box.`;
      explain = `The ${digit}s in box ${hit.box + 1} are all in ${line}, so ${digit} can't go anywhere else in ${line}.`;
      region = BOXS[hit.box].slice();
    } else if (type === "claiming") {
      const line = housePhrase(hit.lineKind, hit.lineIndex);
      look = `Look at the ${digit}s in this ${hit.lineKind}.`;
      explain = `Every ${digit} in ${line} sits in box ${hit.box + 1}, so ${digit} can't go in the rest of box ${hit.box + 1}.`;
      region = (hit.lineKind === "row" ? ROWS[hit.lineIndex] : COLS[hit.lineIndex]).slice();
    } else if (type === "naked_pair" || type === "naked_triple" || type === "naked_quad") {
      const digits = maskDigits(hit.mask);
      const word = hit.pattern.length === 2 ? "two" : hit.pattern.length === 3 ? "three" : "four";
      const house = unitPhrase(hit.unit);
      look = `Look at these ${word} cells.`;
      explain =
        hit.pattern.length === 2
          ? `These two cells are the only ones that can hold ${joinDigits(digits)}, so those digits come out of the rest of ${house}.`
          : `These ${word} cells hold only ${joinDigits(digits)} between them, so those digits come out of the rest of ${house}.`;
      region = UNITS[hit.unit].slice();
    } else if (type === "hidden_pair" || type === "hidden_triple" || type === "hidden_quad") {
      const digits = maskDigits(hit.mask);
      const word = hit.pattern.length === 2 ? "two" : hit.pattern.length === 3 ? "three" : "four";
      const house = unitPhrase(hit.unit);
      look = `Look at these ${word} cells.`;
      explain = `Only these ${word} cells in ${house} can hold ${joinDigits(digits)}, so every other digit comes out of them.`;
      region = UNITS[hit.unit].slice();
    } else if (type === "xwing" || type === "swordfish") {
      const cover = hit.fishBase === "row" ? "column" : "row";
      const many = type === "xwing" ? "two" : "three";
      look = `Look at the ${digit}s in these ${many} ${hit.fishBase}s.`;
      explain =
        type === "xwing"
          ? `Those ${digit}s form a rectangle, so ${digit} comes out of the rest of those ${cover}s.`
          : `Those ${digit}s cover only three ${cover}s, so ${digit} comes out of the rest of those ${cover}s.`;
      region = hit.pattern.slice();
    } else if (type === "xywing") {
      look = "Look at these three cells.";
      explain = `The middle cell links two pairs. One of the wings has to be ${digit}, so ${digit} can't go in a cell that sees both wings.`;
      region = hit.pattern.slice();
    } else if (type === "skyscraper") {
      const lines = hit.fishBase === "row" ? "rows" : "columns";
      look = `Look at the ${digit}s in these two ${lines}.`;
      explain = `Each of those ${lines} has two ${digit}s, and one end lines up. At least one of the other two ends is ${digit}, so ${digit} comes out of any cell that sees both.`;
      region = hit.pattern.slice();
    } else if (type === "kite") {
      look = `Look at the ${digit}s in this row and this column.`;
      explain = `The row's two ${digit}s and the column's two ${digit}s meet in one box. One of the far cells is ${digit}, so a cell that sees both loses it.`;
      region = hit.pattern.slice();
    } else if (type === "xyzwing") {
      look = "Look at these three cells.";
      explain = `The pivot holds three digits and each wing takes two of them. One of those three cells is ${digit}, so ${digit} can't go in a cell that sees all three.`;
      region = hit.pattern.slice();
    } else if (type === "wwing") {
      look = "Look at these two cells.";
      explain = `Both cells hold the same two digits, and a strong link on one of them joins the cells. At least one cell is ${digit}, so ${digit} comes out of any cell that sees both.`;
      region = hit.pattern.slice();
    } else if (type === "uniquerect") {
      const digits = joinDigits(maskDigits(hit.mask));
      look = "Look at these four cells.";
      explain = `Three corners hold only ${digits}. This puzzle has one solution, so ${digits} come out of the fourth corner.`;
      region = hit.pattern.slice();
    } else if (type === "bug") {
      look = "Look at this cell.";
      explain = `Every other empty cell has two candidates. ${digit} is the extra one here, so the other two come out. The puzzle has one solution.`;
      region = hit.pattern.slice();
    } else if (type === "coloring") {
      const outside = hit.targets.some((index) => hit.pattern.indexOf(index) === -1);
      look = `Look at the ${digit}s in this chain.`;
      explain = outside
        ? `This cell sees both colors of ${digit}, so ${digit} can't go there.`
        : `Two cells of the same color see each other, so ${digit} is impossible on that color.`;
      region = hit.pattern.slice();
    } else if (type === "xychain") {
      look = "Look at this chain of pairs.";
      explain = `The chain starts and ends on ${digit}, so ${digit} can't go in a cell that sees both ends.`;
      region = hit.pattern.slice();
    }

    const indexes = region.concat(hit.pattern || [], eliminate.map((item) => item.index));
    if (place) indexes.push(place.index);
    return {
      slug: STEP_SLUG[type] || type,
      name: STEP_NAME[type] || type,
      look,
      explain,
      pattern: hit.pattern ? hit.pattern.slice() : [],
      region,
      eliminate,
      place,
      candidates: candidateSnapshot(state, indexes),
    };
  }

  function applyRemoved(state, removed) {
    if (!removed) return;
    for (let i = 0; i < removed.length; i++) {
      const item = removed[i];
      if (!item || state.v[item.index]) continue;
      const bit = 1 << (item.digit - 1);
      if (state.c[item.index] & bit) state.c[item.index] &= ~bit;
    }
  }

  function explainState(state) {
    const singles = findSingles(state, false);
    if (singles.place) return describeSingle(state, singles.place);
    for (let t = 0; t < TECHNIQUES.length; t++) {
      const hits = TECHNIQUES[t].find(state);
      if (!hits.length) continue;
      return describeHit(state, hits[0]);
    }
    return null;
  }

  // First step of one technique, wherever it is on the board, even when an
  // easier step comes first. Null when that technique has nothing to do.
  // Fill a technique uses this, so "Apply all pointing" works while singles
  // are still open.
  function explainTechnique(puzzle, removed, slug) {
    const state = load(puzzle);
    applyRemoved(state, removed);
    if (slug === "naked-single" || slug === "hidden-single") {
      const singles = findSingles(state, false);
      const place = slug === "naked-single" ? singles.place && singles.place.kind === "single" && singles.place : singles.hidden;
      return place ? describeSingle(state, place) : null;
    }
    for (let t = 0; t < TECHNIQUES.length; t++) {
      const hits = TECHNIQUES[t].find(state);
      for (let h = 0; h < hits.length; h++) {
        if (STEP_SLUG[hits[h].type] && STEP_SLUG[hits[h].type] !== slug) continue;
        const step = describeHit(state, hits[h]);
        if (step && step.slug === slug) return step;
      }
    }
    return null;
  }

  // Next logical step on the current digits. `removed` is a list of
  // {index, digit} candidates already eliminated by an earlier hint.
  // Pass full=true to attach the candidate grid used for that step.
  function explain(puzzle, removed, full) {
    const state = load(puzzle);
    applyRemoved(state, removed);
    const step = explainState(state);
    if (full && step) {
      const pencil = [];
      for (let i = 0; i < 81; i++) pencil.push(state.v[i] ? [] : maskDigits(state.c[i]));
      step.pencil = pencil;
    }
    return step;
  }

  root.SudokuSolver = {
    grade,
    countSolutions,
    nextStep,
    fillGrid,
    explain,
    explainTechnique,
    RANK_NAME,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
