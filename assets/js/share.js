// Share text and the story card. No solution digits leave this file.
(function (root) {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const KINDS = {
    quick: "quick",
    easy: "easy",
    "not-easy": "not easy",
    hard: "hard",
    expert: "expert",
    mental: "mental",
  };
  const TECHNIQUE_LABELS = {
    single: "Singles",
    hidden_box: "Hidden single",
    hidden_line: "Hidden single",
    locked: "Pointing",
    pointing: "Pointing",
    claiming: "Claiming",
    naked_pair: "Naked pair",
    hidden_pair: "Hidden pair",
    naked_triple: "Naked triple",
    hidden_triple: "Hidden triple",
    naked_quad: "Quads",
    hidden_quad: "Quads",
    quads: "Quads",
    xwing: "X-wing",
    swordfish: "Swordfish",
    xywing: "XY-wing",
    coloring: "Simple coloring",
    xychain: "XY-chain",
    stuck: "A hard step",
    too_hard: "A hard step",
  };
  const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
  const SITE = "https://sudokusudoku.com";
  let last = null;

  function slugFor(kind) {
    return String(kind || "easy")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
  }

  function mintId(kind) {
    const slug = KINDS[slugFor(kind)] ? slugFor(kind) : "easy";
    const bytes = new Uint8Array(8);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(bytes);
    else {
      for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    let token = "";
    for (let i = 0; i < bytes.length; i += 1) token += ALPHABET[bytes[i] % ALPHABET.length];
    return `${slug}.${token}`;
  }

  function encodeGivens(puzzle) {
    if (!puzzle || puzzle.length !== 81) return "";
    let n = 0n;
    for (let i = 0; i < 81; i += 1) {
      const digit = puzzle[i] | 0;
      if (digit < 0 || digit > 9) return "";
      n = n * 10n + BigInt(digit);
    }
    return n.toString(36);
  }

  function decodeGivens(text) {
    if (!text || !/^[0-9a-z]+$/.test(text)) return null;
    let n = 0n;
    for (let i = 0; i < text.length; i += 1) {
      const value = parseInt(text[i], 36);
      if (Number.isNaN(value)) return null;
      n = n * 36n + BigInt(value);
    }
    const digits = n.toString(10).padStart(81, "0");
    if (digits.length !== 81) return null;
    const puzzle = [];
    for (let i = 0; i < 81; i += 1) puzzle.push(digits.charCodeAt(i) - 48);
    return puzzle;
  }

  function idFromGivens(kind, puzzle) {
    const slug = KINDS[slugFor(kind)] ? slugFor(kind) : "easy";
    const body = encodeGivens(puzzle);
    if (!body) return "";
    return `${slug}.g.${body}`;
  }

  function parseId(raw) {
    const id = String(raw || "")
      .trim()
      .toLowerCase();
    const givens = /^(quick|easy|not-easy|hard|expert|mental)\.g\.([0-9a-z]+)$/.exec(id);
    if (givens) {
      const puzzle = decodeGivens(givens[2]);
      if (!puzzle) return null;
      return { kind: KINDS[givens[1]], id, givens: puzzle };
    }
    const seeded = /^(quick|easy|not-easy|hard|expert|mental)\.([abcdefghjkmnpqrstuvwxyz23456789]{8})$/.exec(id);
    if (!seeded) return null;
    return { kind: KINDS[seeded[1]], id, seed: id };
  }

  function techniqueLabel(name) {
    const key = String(name || "single").trim().toLowerCase();
    return TECHNIQUE_LABELS[key] || "Singles";
  }

  function shortDate(iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!match) return "";
    return `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}`;
  }

  function longDate(iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!match) return "";
    return `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`;
  }

  function shareText(info) {
    const hints = info.hints | 0;
    const mistakes = info.mistakes | 0;
    const lines = [
      `SudokuSudoku · ${info.kindLabel}`,
      `Solved in ${info.time} · ${hints} ${hints === 1 ? "hint" : "hints"} · ${mistakes} ${mistakes === 1 ? "mistake" : "mistakes"}`,
      `✦ ${techniqueLabel(info.hardest)}`,
    ];
    const badges = Array.isArray(info.badges) ? info.badges.filter(Boolean) : [];
    if (badges.length) {
      const shown = badges.slice(0, 2);
      const extra = badges.length - shown.length;
      lines.push(extra ? `Badge: ${shown.join(", ")} and ${extra} more` : `Badge: ${shown.join(", ")}`);
    }
    lines.push(info.url);
    return lines.join("\n");
  }

  function dailyUrl() {
    return `${SITE}/?daily`;
  }

  function puzzleUrl(id) {
    return `${SITE}/?p=${encodeURIComponent(id)}`;
  }

  function patternCells(key) {
    let hash = 2166136261;
    const text = String(key || "sudoku");
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const on = [];
    for (let i = 0; i < 81; i += 1) {
      hash = Math.imul(hash ^ (hash >>> 15), hash | 1) >>> 0;
      on.push(hash % 5 === 0 ? 1 : 0);
    }
    return on;
  }

  function uniqueSolution(puzzle) {
    if (!puzzle || puzzle.length !== 81) return null;
    const rows = Array.from({ length: 9 }, () => 0);
    const cols = Array.from({ length: 9 }, () => 0);
    const boxes = Array.from({ length: 9 }, () => 0);
    const empty = [];
    const values = puzzle.slice();
    for (let i = 0; i < 81; i += 1) {
      const digit = values[i] | 0;
      if (digit < 0 || digit > 9) return null;
      if (!digit) {
        empty.push(i);
        continue;
      }
      const bit = 1 << (digit - 1);
      const row = Math.floor(i / 9);
      const col = i % 9;
      const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
      if (rows[row] & bit || cols[col] & bit || boxes[box] & bit) return null;
      rows[row] |= bit;
      cols[col] |= bit;
      boxes[box] |= bit;
    }
    let found = 0;
    const solved = values.slice();
    function search(index) {
      if (found > 1) return;
      if (index === empty.length) {
        found += 1;
        if (found === 1) {
          for (let i = 0; i < 81; i += 1) solved[i] = values[i];
        }
        return;
      }
      let best = index;
      let bestCount = 10;
      for (let i = index; i < empty.length; i += 1) {
        const cell = empty[i];
        const row = Math.floor(cell / 9);
        const col = cell % 9;
        const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        let bits = ~(rows[row] | cols[col] | boxes[box]) & 0x1ff;
        let count = 0;
        while (bits) {
          bits &= bits - 1;
          count += 1;
        }
        if (count < bestCount) {
          best = i;
          bestCount = count;
          if (count < 2) break;
        }
      }
      if (bestCount === 0) return;
      if (best !== index) {
        const swap = empty[index];
        empty[index] = empty[best];
        empty[best] = swap;
      }
      const cell = empty[index];
      const row = Math.floor(cell / 9);
      const col = cell % 9;
      const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
      let bits = ~(rows[row] | cols[col] | boxes[box]) & 0x1ff;
      while (bits) {
        const bit = bits & -bits;
        bits ^= bit;
        let digit = 0;
        let probe = bit;
        while (probe > 1) {
          probe >>= 1;
          digit += 1;
        }
        values[cell] = digit + 1;
        rows[row] |= bit;
        cols[col] |= bit;
        boxes[box] |= bit;
        search(index + 1);
        rows[row] ^= bit;
        cols[col] ^= bit;
        boxes[box] ^= bit;
        values[cell] = 0;
        if (found > 1) break;
      }
      if (best !== index) {
        const swap = empty[index];
        empty[index] = empty[best];
        empty[best] = swap;
      }
    }
    search(0);
    return found === 1 ? solved : null;
  }

  function materialize(givens, kind) {
    const puzzle = givens.slice();
    const solution = uniqueSolution(puzzle);
    if (!solution) return null;
    let hardestName = "single";
    let path = [];
    if (root.SudokuSolver && root.SudokuSolver.grade) {
      try {
        const graded = root.SudokuSolver.grade(puzzle);
        if (graded && graded.hardestName) hardestName = graded.hardestName;
        if (graded && Array.isArray(graded.path)) path = graded.path.slice();
      } catch {
        /* the grid still has one solution */
      }
    }
    const clues = puzzle.reduce((sum, digit) => sum + (digit ? 1 : 0), 0);
    return {
      puzzle,
      solution,
      metadata: {
        difficulty: kind,
        clues,
        hardestName,
        path,
        seed: null,
        techniques: [],
      },
    };
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function paletteHex(name, fallback) {
    if (typeof document === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  }

  function hexToRgba(hex, alpha) {
    const match = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!match) return `rgba(52, 63, 173, ${alpha})`;
    const value = Number.parseInt(match[1], 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }

  function paintCard(canvas, info) {
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const accent = paletteHex("--accent-color", "#343fad");
    const ink = "#1e232b";
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f4f6f8";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, width, 28);

    ctx.fillStyle = ink;
    ctx.font = "700 64px 'Open Sans', 'Helvetica Neue', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("SudokuSudoku", 80, 160);

    ctx.fillStyle = accent;
    ctx.font = "700 46px 'Open Sans', 'Helvetica Neue', sans-serif";
    ctx.fillText(info.kindLabel || "Sudoku", 80, 240);

    ctx.fillStyle = ink;
    ctx.font = "700 132px 'Open Sans', 'Helvetica Neue', sans-serif";
    ctx.fillText(info.time || "0:00", 80, 410);

    const hints = info.hints | 0;
    const mistakes = info.mistakes | 0;
    ctx.fillStyle = "#5c6670";
    ctx.font = "600 36px 'Open Sans', 'Helvetica Neue', sans-serif";
    ctx.fillText(
      `${hints} ${hints === 1 ? "hint" : "hints"}  ·  ${mistakes} ${mistakes === 1 ? "mistake" : "mistakes"}`,
      80,
      480
    );
    ctx.fillStyle = accent;
    ctx.font = "700 40px 'Open Sans', 'Helvetica Neue', sans-serif";
    ctx.fillText(`✦ ${techniqueLabel(info.hardest)}`, 80, 550);
    let gridTop = 640;
    const badges = Array.isArray(info.badges) ? info.badges.filter(Boolean) : [];
    if (badges.length) {
      ctx.fillStyle = accent;
      ctx.font = "700 34px 'Open Sans', 'Helvetica Neue', sans-serif";
      const label = badges.length > 1 ? `Badges: ${badges.slice(0, 2).join(", ")}` : `Badge: ${badges[0]}`;
      ctx.fillText(label, 80, 620);
      gridTop = 700;
    }
    if (info.dateLine) {
      ctx.fillStyle = "#5c6670";
      ctx.font = "600 32px 'Open Sans', 'Helvetica Neue', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(info.dateLine, width - 80, 160);
      ctx.textAlign = "left";
    }

    const board = 760;
    const originX = (width - board) / 2;
    const originY = gridTop;
    const cell = board / 9;
    const pattern = patternCells(info.patternKey || info.url || "sudoku");
    ctx.save();
    ctx.filter = "blur(10px)";
    for (let i = 0; i < 81; i += 1) {
      if (!pattern[i]) continue;
      const col = i % 9;
      const row = Math.floor(i / 9);
      ctx.fillStyle = (row + col) % 2 === 0 ? hexToRgba(accent, 0.55) : hexToRgba(accent, 0.28);
      roundedRect(ctx, originX + col * cell + 8, originY + row * cell + 8, cell - 16, cell - 16, 10);
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = "rgba(30, 35, 43, 0.18)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= 9; i += 1) {
      ctx.beginPath();
      ctx.moveTo(originX, originY + i * cell);
      ctx.lineTo(originX + board, originY + i * cell);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(originX + i * cell, originY);
      ctx.lineTo(originX + i * cell, originY + board);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(30, 35, 43, 0.72)";
    ctx.lineWidth = 6;
    ctx.strokeRect(originX, originY, board, board);
    for (const at of [3, 6]) {
      ctx.beginPath();
      ctx.moveTo(originX + at * cell, originY);
      ctx.lineTo(originX + at * cell, originY + board);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(originX, originY + at * cell);
      ctx.lineTo(originX + board, originY + at * cell);
      ctx.stroke();
    }

    ctx.fillStyle = accent;
    ctx.font = "700 32px 'Open Sans', 'Helvetica Neue', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("sudokusudoku.com", 80, height - 72);
  }

  function remember(info) {
    last = info;
  }

  root.SudokuShare = {
    mintId,
    parseId,
    idFromGivens,
    encodeGivens,
    decodeGivens,
    techniqueLabel,
    shortDate,
    longDate,
    shareText,
    dailyUrl,
    puzzleUrl,
    patternCells,
    uniqueSolution,
    materialize,
    paintCard,
    remember,
    current() {
      return last;
    },
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
