// Puzzle generator. A full random grid is dug down while the solution stays
// unique, then graded by SudokuSolver and repaired until it sits in the
// level's technique window. No symmetry.
//
// Not Easy / Hard bottleneck gates come from the archived NYT window
// (August 30, 2021 through March 2, 2024), measured with this solver:
//   Medium, pointing only, ≤3 steps, ≤2 stalls (n=387):
//     bottlenecks p10 3, median 5, p90 8, max 11, mean 5.0
//   Hard, pair or triple, ≥4 steps (n=314):
//     bottlenecks p10 5, median 8, p90 13, max 21, mean 8.9
// Generated Not Easy puzzles must land in 3–11, Hard in 5–21.

let rng = Math.random;

function random() {
  return rng();
}

function hashSeed(seed) {
  const text = String(seed);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function solver() {
  return globalThis.SudokuSolver;
}

function countClues(puzzle) {
  let n = 0;
  for (let i = 0; i < 81; i++) if (puzzle[i]) n++;
  return n;
}

function shuffledIndexes() {
  const order = [];
  for (let i = 0; i < 81; i++) order.push(i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  return order;
}

function digUnique(puzzle, order, target) {
  const { countSolutions } = solver();
  const removed = [];
  for (let n = 0; n < order.length; n++) {
    if (countClues(puzzle) <= target) break;
    const i = order[n];
    if (!puzzle[i]) continue;
    const saved = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) !== 1) puzzle[i] = saved;
    else removed.push(i);
  }
  return removed;
}

function cellsMatch(grade, solution) {
  if (!grade || !grade.values) return false;
  for (let i = 0; i < 81; i++) if (grade.values[i] !== solution[i]) return false;
  return true;
}

function pack(found, difficulty, seed, relaxed) {
  const grade = found.grade;
  return {
    puzzle: found.puzzle.slice(),
    solution: found.solution.slice(),
    metadata: {
      difficulty,
      clues: found.clues,
      techniques: grade.techniques.slice(),
      hardestTechnique: grade.rank,
      hardestName: grade.hardestName,
      steps: grade.steps,
      stalls: grade.stalls,
      bottlenecks: grade.bottlenecks,
      placedBeforeStall: grade.placedBeforeStall,
      filledAtFirstStall: grade.filledAtFirstStall,
      path: (grade.path || []).slice(),
      solutions: 1,
      seed: seed == null ? null : String(seed),
      relaxedClues: Boolean(relaxed),
    },
  };
}

function carveSingles(bounds, mode) {
  const { fillGrid, grade } = solver();
  const solution = fillGrid(random);
  if (!solution) return null;
  const puzzle = solution.slice();
  const span = bounds.maxC - bounds.minC + 1;
  let target = bounds.minC + Math.floor(random() * span);
  if (mode === "easy" && !bounds.relax) {
    const roll = random();
    target = roll < 0.8 ? 38 : roll < 0.92 ? 37 : 36;
  }
  digUnique(puzzle, shuffledIndexes(), target);
  const clues = countClues(puzzle);
  if (clues < bounds.minC || clues > bounds.maxC) return null;
  const graded = grade(puzzle, {
    solution,
    boxOnly: mode === "quick",
    maxRank: mode === "quick" ? 1 : 2,
    maxSteps: 0,
    maxStalls: 0,
  });
  if (!graded.solved || graded.corrupt || graded.tooHard || graded.steps !== 0) return null;
  if (mode === "quick" && graded.rank > 1) return null;
  if (mode === "easy" && graded.rank > 2) return null;
  if (!cellsMatch(graded, solution)) return null;
  return { puzzle, solution, grade: graded, clues };
}

function carveWindow(spec) {
  const { fillGrid, grade, countSolutions } = solver();
  const solution = fillGrid(random);
  if (!solution) return null;
  const puzzle = solution.slice();
  const order = shuffledIndexes();
  const removed = digUnique(puzzle, order, spec.dig);
  const capped = {
    solution,
    maxRank: spec.maxRank,
    maxSteps: spec.maxSteps,
    maxStalls: spec.maxStalls,
  };

  function acceptable(graded, clues) {
    return graded.solved && !graded.corrupt && !graded.tooHard && spec.keep(graded, clues);
  }

  function ready(graded, clues, aimOnly) {
    if (!acceptable(graded, clues)) return false;
    if (!spec.fit(graded, clues)) return false;
    if (aimOnly && (clues < spec.aimMin || clues > spec.aimMax)) return false;
    return true;
  }

  let current = grade(puzzle, capped);
  if (!acceptable(current, countClues(puzzle))) {
    for (let k = removed.length - 1; k >= 0; k--) {
      const index = removed[k];
      if (puzzle[index]) continue;
      puzzle[index] = solution[index];
      current = grade(puzzle, capped);
      if (acceptable(current, countClues(puzzle))) break;
    }
  }

  let fitted = ready(current, countClues(puzzle), false);

  for (let pass = 0; pass < 2; pass++) {
    for (let n = 0; n < order.length; n++) {
      if (countClues(puzzle) <= spec.minC) break;
      const index = order[n];
      if (!puzzle[index]) continue;
      const saved = puzzle[index];
      puzzle[index] = 0;
      if (countSolutions(puzzle, 2) !== 1) {
        puzzle[index] = saved;
        continue;
      }
      const graded = grade(puzzle, capped);
      const clues = countClues(puzzle);
      if (fitted && !spec.fit(graded, clues)) {
        puzzle[index] = saved;
        continue;
      }
      if (!acceptable(graded, clues)) {
        puzzle[index] = saved;
        continue;
      }
      removed.push(index);
      current = graded;
      fitted = spec.fit(graded, clues);
      if (ready(graded, clues, pass === 0)) {
        const full = grade(puzzle, { solution });
        if (spec.fit(full, clues) && cellsMatch(full, solution) && countSolutions(puzzle, 2) === 1) {
          return { puzzle, solution, grade: full, clues };
        }
        puzzle[index] = saved;
        removed.pop();
        current = grade(puzzle, capped);
        fitted = spec.fit(current, countClues(puzzle));
      }
    }
  }

  const settledClues = countClues(puzzle);
  if (spec.fit(current, settledClues)) {
    const full = grade(puzzle, { solution });
    if (spec.fit(full, settledClues) && cellsMatch(full, solution) && countSolutions(puzzle, 2) === 1) {
      return { puzzle, solution, grade: full, clues: settledClues };
    }
  }

  if (!spec.below) return null;

  for (let k = removed.length - 1; k >= 0; k--) {
    const index = removed[k];
    if (puzzle[index]) continue;
    puzzle[index] = solution[index];
    const clues = countClues(puzzle);
    const graded = grade(puzzle, capped);
    if (ready(graded, clues, false)) {
      const full = grade(puzzle, { solution });
      if (spec.fit(full, clues) && cellsMatch(full, solution) && countSolutions(puzzle, 2) === 1) {
        return { puzzle, solution, grade: full, clues };
      }
    }
    if (graded.solved && spec.below && spec.below(graded)) {
      puzzle[index] = 0;
      break;
    }
  }
  return null;
}

const NOT_EASY_BN = { min: 3, max: 11 };
const HARD_BN = { min: 5, max: 21 };
const HARD_MAX_STEPS = 16;

function notEasySpec(relax) {
  const minC = relax ? 20 : 22;
  const maxC = relax ? 30 : 27;
  return {
    dig: 36,
    minC,
    maxC,
    aimMin: relax ? minC : 23,
    aimMax: relax ? maxC : 25,
    maxRank: 3,
    maxSteps: 3,
    maxStalls: 2,
    keep(g) {
      return g.rank <= 3 && g.steps <= 3 && g.stalls <= 2 && g.bottlenecks <= NOT_EASY_BN.max;
    },
    fit(g, clues) {
      return (
        g.solved &&
        !g.corrupt &&
        g.rank === 3 &&
        g.steps >= 1 &&
        g.steps <= 3 &&
        g.stalls >= 1 &&
        g.stalls <= 2 &&
        g.bottlenecks >= NOT_EASY_BN.min &&
        g.bottlenecks <= NOT_EASY_BN.max &&
        clues >= minC &&
        clues <= maxC
      );
    },
  };
}

function hardSpec(relax) {
  const minC = relax ? 20 : 22;
  const maxC = relax ? 30 : 27;
  return {
    dig: 36,
    minC,
    maxC,
    aimMin: relax ? minC : 23,
    aimMax: relax ? maxC : 25,
    maxRank: 5,
    maxSteps: HARD_MAX_STEPS,
    keep(g) {
      return g.rank <= 5 && g.steps <= HARD_MAX_STEPS && g.bottlenecks <= HARD_BN.max;
    },
    fit(g, clues) {
      return (
        g.solved &&
        !g.corrupt &&
        (g.rank === 4 || g.rank === 5) &&
        g.steps >= 4 &&
        g.steps <= HARD_MAX_STEPS &&
        g.bottlenecks >= HARD_BN.min &&
        g.bottlenecks <= HARD_BN.max &&
        clues >= minC &&
        clues <= maxC
      );
    },
  };
}

function expertSpec(relax) {
  const minC = relax ? 20 : 22;
  const maxC = relax ? 28 : 26;
  return {
    dig: 30,
    minC,
    maxC,
    aimMin: minC,
    aimMax: maxC,
    maxRank: 9,
    keep(g) {
      return g.rank <= 9;
    },
    fit(g, clues) {
      return g.solved && !g.corrupt && g.rank >= 6 && g.rank <= 9 && clues >= minC && clues <= maxC;
    },
    below(g) {
      return g.rank < 6;
    },
  };
}

function mentalSpec(relax) {
  const minC = relax ? 16 : 17;
  const maxC = relax ? 26 : 24;
  return {
    dig: 26,
    minC,
    maxC,
    aimMin: minC,
    aimMax: maxC,
    maxRank: 10,
    keep(g) {
      return g.rank <= 10;
    },
    fit(g, clues) {
      return g.solved && !g.corrupt && g.rank === 10 && clues >= minC && clues <= maxC;
    },
    below(g) {
      return g.rank < 10;
    },
  };
}

const ATTEMPTS = {
  quick: 12,
  easy: 12,
  "not easy": 28,
  hard: 32,
  expert: 16,
  mental: 16,
};

// A stored pool row can stop matching its level once a new technique solves it
// earlier. Skip those rows. The first random index is unchanged when it still
// fits, so levels whose puzzles did not move keep the same fallback.
function levelStillFits(kind, graded, meta) {
  if (!graded || !graded.solved || graded.corrupt) return false;
  // Stored rows keep their published grade. A row whose fresh solve moved
  // is left in the file and reported, and it is not dealt as that level.
  if (meta && (graded.steps !== meta.steps || graded.bottlenecks !== meta.bottlenecks || graded.rank !== meta.hardestTechnique)) {
    return false;
  }
  if (kind === "quick") return graded.rank <= 1 && graded.steps === 0;
  if (kind === "easy") return graded.rank <= 2 && graded.steps === 0;
  if (kind === "not easy") return graded.rank === 3;
  if (kind === "hard") return graded.rank === 4 || graded.rank === 5;
  if (kind === "expert") return graded.rank >= 6 && graded.rank <= 9;
  if (kind === "mental") return graded.rank === 10;
  return true;
}

function takePool(kind, seed) {
  const pools = globalThis.SudokuPools;
  const pool = pools && pools[kind];
  if (!pool || !pool.length) return null;
  const { grade } = solver();
  const start = Math.floor(random() * pool.length) % pool.length;
  for (let n = 0; n < pool.length; n++) {
    const entry = pool[(start + n) % pool.length];
    const quick = grade(entry.puzzle, { solution: entry.solution });
    if (!levelStillFits(kind, quick, entry.metadata || {})) continue;
    const meta = entry.metadata || {};
    const found = {
      puzzle: entry.puzzle.slice(),
      solution: entry.solution.slice(),
      clues: meta.clues,
      grade: {
        techniques: (meta.techniques || []).slice(),
        rank: meta.hardestTechnique,
        hardestName: meta.hardestName,
        steps: meta.steps,
        stalls: meta.stalls,
        bottlenecks: meta.bottlenecks,
        placedBeforeStall: meta.placedBeforeStall,
        filledAtFirstStall: meta.filledAtFirstStall,
      },
    };
    const packed = pack(found, kind, seed, false);
    packed.metadata.fromPool = true;
    return packed;
  }
  return null;
}

function attemptLevel(kind, relax) {
  if (kind === "quick") {
    return carveSingles(relax ? { minC: 38, maxC: 47, relax: true } : { minC: 40, maxC: 45 }, "quick");
  }
  if (kind === "easy") {
    return carveSingles(relax ? { minC: 34, maxC: 40, relax: true } : { minC: 36, maxC: 38 }, "easy");
  }
  if (kind === "not easy") return carveWindow(notEasySpec(relax));
  if (kind === "hard") return carveWindow(hardSpec(relax));
  if (kind === "expert") return carveWindow(expertSpec(relax));
  return carveWindow(mentalSpec(relax));
}

function generateLevel(difficulty, seed) {
  const kind = ATTEMPTS[difficulty] ? difficulty : "easy";
  const attempts = ATTEMPTS[kind];

  for (let i = 0; i < attempts; i++) {
    const found = attemptLevel(kind, false);
    if (found) return pack(found, kind, seed, false);
  }
  const pooled = takePool(kind, seed);
  if (pooled) return pooled;
  for (let i = 0; i < 12; i++) {
    const found = attemptLevel(kind, true);
    if (found) return pack(found, kind, seed, true);
  }
  const fallback = carveSingles({ minC: 40, maxC: 45 }, "quick");
  if (!fallback) {
    const { fillGrid } = solver();
    const solution = fillGrid(random);
    const packed = pack(
      {
        puzzle: solution,
        solution,
        grade: {
          techniques: [],
          rank: 0,
          hardestName: "single",
          steps: 0,
          stalls: 0,
          bottlenecks: 0,
          placedBeforeStall: 0,
          filledAtFirstStall: 81,
        },
        clues: 81,
      },
      kind,
      seed,
      true
    );
    packed.metadata.offSpec = true;
    return packed;
  }
  const packed = pack(fallback, kind, seed, true);
  packed.metadata.offSpec = true;
  return packed;
}

function generate(difficulty, seed) {
  const previous = rng;
  if (seed !== undefined && seed !== null) rng = mulberry32(hashSeed(seed));
  try {
    return generateLevel(difficulty, seed);
  } finally {
    rng = previous;
  }
}

// Solver rank of each page slug. Ties break toward the later technique in
// the library (claiming after pointing, hidden subset after naked, XY-chain
// after coloring). Swordfish outranks an XY-wing, matching the solver.
const TECHNIQUE_RANK = {
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
  // After swordfish, before coloring. Same solver rank as swordfish, so an
  // X-wing, XY-wing, or swordfish that is also available still runs first.
  skyscraper: 9.1,
  "two-string-kite": 9.2,
  "xyz-wing": 9.3,
  "w-wing": 9.4,
  "unique-rectangle": 9.5,
  "bug-plus-one": 9.6,
  coloring: 10,
  "xy-chain": 10.1,
};

const TRAIN = {
  "naked-single": { level: "easy", live: 12, budget: 200 },
  "hidden-single": { level: "easy", live: 24, budget: 250 },
  pointing: { level: "not easy", live: 2, budget: 80 },
  claiming: { level: "not easy", live: 2, budget: 80 },
  "naked-pair": { level: "hard", live: 2, budget: 80 },
  "hidden-pair": { level: "hard", live: 2, budget: 80 },
  "naked-triple": { level: "hard", live: 8, budget: 500 },
  "hidden-triple": { level: "hard", live: 8, budget: 500 },
  quads: { level: "expert", live: 8, budget: 500 },
  "x-wing": { level: "expert", live: 2, budget: 80 },
  swordfish: { level: "expert", live: 4, budget: 200 },
  "xy-wing": { level: "expert", live: 2, budget: 80 },
  skyscraper: {
    level: "expert",
    name: "Skyscraper",
    live: 2,
    budget: 80,
    puzzle: [0,0,0,0,0,0,2,0,0,0,0,0,8,9,0,4,7,0,3,9,0,0,0,0,0,0,0,0,0,8,6,0,4,0,0,0,0,5,0,0,0,8,0,0,9,0,4,1,3,0,0,0,5,0,0,0,0,9,7,2,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,6,3,0],
    solution: [8,1,4,5,6,7,2,9,3,5,2,6,8,9,3,4,7,1,3,9,7,2,4,1,5,6,8,9,3,8,6,5,4,7,1,2,6,5,2,7,1,8,3,4,9,7,4,1,3,2,9,8,5,6,4,6,3,9,7,2,1,8,5,1,8,5,4,3,6,9,2,7,2,7,9,1,8,5,6,3,4],
  },
  "two-string-kite": {
    level: "expert",
    name: "Two-string kite",
    live: 2,
    budget: 80,
    puzzle: [0,0,0,0,0,2,1,0,0,0,0,0,9,5,0,0,3,0,7,0,0,4,0,0,6,5,0,0,5,0,0,3,0,0,0,0,0,0,1,0,0,0,4,0,0,0,0,8,0,0,0,0,0,0,8,0,0,0,7,3,0,0,0,0,3,0,0,1,0,2,0,0,9,0,0,0,2,0,0,8,1],
    solution: [5,8,9,3,6,2,1,4,7,1,4,6,9,5,7,8,3,2,7,2,3,4,8,1,6,5,9,2,5,4,7,3,6,9,1,8,3,7,1,2,9,8,4,6,5,6,9,8,1,4,5,7,2,3,8,1,2,6,7,3,5,9,4,4,3,5,8,1,9,2,7,6,9,6,7,5,2,4,3,8,1],
  },
  "xyz-wing": {
    level: "expert",
    name: "XYZ-wing",
    live: 2,
    budget: 80,
    puzzle: [0,5,3,0,1,0,0,0,0,2,0,0,0,0,4,0,0,0,4,0,8,2,6,0,0,9,0,0,2,0,0,0,7,6,0,0,0,0,0,5,4,0,8,0,0,1,0,0,0,9,0,0,0,0,7,0,0,3,2,0,0,0,0,0,0,0,0,0,0,0,0,0,8,0,9,0,0,0,4,3,2],
    solution: [6,5,3,9,1,8,2,7,4,2,9,1,7,5,4,3,6,8,4,7,8,2,6,3,1,9,5,5,2,4,8,3,7,6,1,9,9,3,6,5,4,1,8,2,7,1,8,7,6,9,2,5,4,3,7,4,5,3,2,6,9,8,1,3,1,2,4,8,9,7,5,6,8,6,9,1,7,5,4,3,2],
  },
  "w-wing": {
    level: "expert",
    name: "W-wing",
    live: 2,
    budget: 80,
    puzzle: [0,0,0,0,2,8,7,0,0,0,0,0,0,0,0,0,6,0,0,8,0,0,6,7,0,0,3,2,0,0,6,0,0,0,1,0,0,0,0,1,0,0,0,5,0,0,0,0,0,7,0,2,0,0,0,4,0,9,0,0,5,0,0,5,0,0,0,0,1,0,7,6,0,0,1,0,0,0,0,4,0],
    solution: [6,1,3,5,2,8,7,9,4,4,2,7,3,1,9,8,6,5,9,8,5,4,6,7,1,2,3,2,7,9,6,5,3,4,1,8,8,3,4,1,9,2,6,5,7,1,5,6,8,7,4,2,3,9,7,4,2,9,3,6,5,8,1,5,9,8,2,4,1,3,7,6,3,6,1,7,8,5,9,4,2],
  },
  "unique-rectangle": {
    level: "expert",
    name: "Unique rectangle",
    live: 2,
    budget: 80,
    puzzle: [0,7,0,0,0,0,8,5,0,0,2,0,3,0,5,0,0,0,1,0,0,0,9,0,0,0,0,0,1,0,4,0,0,0,0,0,0,0,0,1,0,0,5,6,0,2,0,4,8,0,0,0,0,0,0,0,0,0,0,0,0,0,1,3,0,0,0,0,0,0,4,0,6,5,9,0,0,0,0,0,3],
    solution: [4,7,3,6,2,1,8,5,9,9,2,8,3,4,5,1,7,6,1,6,5,7,9,8,4,3,2,5,1,6,4,7,9,3,2,8,8,9,7,1,3,2,5,6,4,2,3,4,8,5,6,9,1,7,7,4,2,5,8,3,6,9,1,3,8,1,9,6,7,2,4,5,6,5,9,2,1,4,7,8,3],
  },
  "bug-plus-one": {
    level: "expert",
    name: "BUG+1",
    live: 2,
    budget: 80,
    puzzle: [0,2,0,0,0,6,8,4,0,0,0,0,0,4,0,2,9,1,0,0,0,3,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,6,0,0,5,0,0,0,0,9,8,0,6,0,4,1,0,9,0,0,4,5,0,0,6,7,5,0,7,0,0,0,0,3,0,0,0,0,0,0,0,0,0,2],
    solution: [7,2,9,5,1,6,8,4,3,6,5,3,7,4,8,2,9,1,8,1,4,3,9,2,7,5,6,1,7,5,9,3,4,6,2,8,2,4,6,1,8,5,3,7,9,3,9,8,2,6,7,4,1,5,9,8,2,4,5,3,1,6,7,5,6,7,8,2,1,9,3,4,4,3,1,6,7,9,5,8,2],
  },
  coloring: { level: "mental", live: 2, budget: 120 },
  "xy-chain": { level: "mental", live: 2, budget: 120 },
};

function hardestSlug(path) {
  let best = -1;
  let slug = null;
  for (let i = 0; i < path.length; i++) {
    const rank = TECHNIQUE_RANK[path[i]];
    if (rank == null || rank < best) continue;
    best = rank;
    slug = path[i];
  }
  return slug;
}

function restAllowed(path, slug, allowed) {
  for (let i = 0; i < path.length; i++) {
    if (path[i] === slug) continue;
    if (!allowed.has(path[i])) return false;
  }
  return true;
}

function shuffleIndexes(length) {
  const order = [];
  for (let i = 0; i < length; i++) order.push(i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  return order;
}

const gradedPoolCache = new Map();

function gradePool(level) {
  const cached = gradedPoolCache.get(level);
  if (cached) return cached;
  const pools = globalThis.SudokuPools;
  const pool = pools && pools[level];
  if (!pool || !pool.length) {
    gradedPoolCache.set(level, []);
    return [];
  }
  const { grade } = solver();
  const rows = [];
  for (let n = 0; n < pool.length; n++) {
    const entry = pool[n];
    const quick = grade(entry.puzzle, { solution: entry.solution, metrics: false });
    if (!quick.solved || quick.corrupt) continue;
    rows.push({ entry, path: quick.path || [] });
  }
  gradedPoolCache.set(level, rows);
  return rows;
}

function chooseRow(rows, slug, allowed) {
  const order = shuffleIndexes(rows.length);
  for (let n = 0; n < order.length; n++) {
    const row = rows[order[n]];
    if (hardestSlug(row.path) !== slug) continue;
    if (allowed && !restAllowed(row.path, slug, allowed)) continue;
    return row;
  }
  return null;
}

function exemplarTrain(slug, allowed) {
  const spec = TRAIN[slug];
  if (!spec || !spec.puzzle || !spec.solution) return null;
  const { grade } = solver();
  const quick = grade(spec.puzzle, { solution: spec.solution, metrics: false });
  if (!quick.solved || quick.corrupt) return null;
  const path = quick.path || [];
  if (hardestSlug(path) !== slug) return null;
  if (allowed && !restAllowed(path, slug, allowed)) return null;
  return packTrain({ puzzle: spec.puzzle, solution: spec.solution }, slug, false);
}

function packTrain(entry, slug, relaxed) {
  const { grade } = solver();
  const full = grade(entry.puzzle, { solution: entry.solution });
  const clues = countClues(entry.puzzle);
  const packed = pack(
    { puzzle: entry.puzzle.slice(), solution: entry.solution.slice(), grade: full, clues },
    TRAIN[slug].level,
    null,
    false
  );
  packed.metadata.fromPool = Boolean(entry.metadata);
  packed.metadata.trainTarget = slug;
  if (relaxed) packed.metadata.trainRelaxed = true;
  return packed;
}

function liveTrain(slug, allowed) {
  const spec = TRAIN[slug];
  let loose = null;
  const started = Date.now();
  let seen = 0;
  let guard = 0;
  while (seen < spec.live && guard < 48 && Date.now() - started < spec.budget) {
    guard += 1;
    const found = attemptLevel(spec.level, false);
    if (!found || !found.grade || !found.grade.solved) continue;
    seen += 1;
    const path = found.grade.path || [];
    if (hardestSlug(path) !== slug) continue;
    const packed = pack(found, spec.level, null, false);
    packed.metadata.trainTarget = slug;
    if (allowed && !restAllowed(path, slug, allowed)) {
      if (!loose) loose = packed;
      continue;
    }
    return packed;
  }
  if (loose) loose.metadata.trainRelaxed = true;
  return loose;
}

function approximateTrain(slug) {
  const level = TRAIN[slug].level;
  const pooled = takePool(level, null);
  if (pooled) {
    const { grade } = solver();
    const quick = grade(pooled.puzzle, { solution: pooled.solution, metrics: false });
    pooled.metadata.path = quick.path || [];
    pooled.metadata.trainTarget = slug;
    pooled.metadata.trainApproximate = true;
    return pooled;
  }
  const found = attemptLevel(level, true);
  if (found) {
    const packed = pack(found, level, null, true);
    packed.metadata.trainTarget = slug;
    packed.metadata.trainApproximate = true;
    return packed;
  }
  const fallback = generateLevel(level, null);
  fallback.metadata.trainTarget = slug;
  fallback.metadata.trainApproximate = true;
  return fallback;
}

// Puzzle whose hardest required technique is `slug`. Other techniques on the
// path must be in `options.allowed` when that list is non-empty. The pool is
// checked first; live carving is a short fallback.
function generateForTechnique(slug, options) {
  const spec = TRAIN[slug];
  if (!spec) return generate("easy", options && options.seed);
  const opt = options || {};
  const previous = rng;
  if (opt.seed !== undefined && opt.seed !== null) rng = mulberry32(hashSeed(opt.seed));
  try {
    const list = Array.isArray(opt.allowed) ? opt.allowed : [];
    const allowed = new Set(list.filter((item) => item && item !== slug));
    const strictAllowed = allowed.size ? allowed : null;
    const rows = gradePool(spec.level);
    const strict = chooseRow(rows, slug, strictAllowed);
    if (strict) return packTrain(strict.entry, slug, false);
    const loose = strictAllowed ? chooseRow(rows, slug, null) : null;
    if (loose) return packTrain(loose.entry, slug, true);
    const example = exemplarTrain(slug, strictAllowed);
    if (example) return example;
    const carved = liveTrain(slug, strictAllowed);
    if (carved) return carved;
    return approximateTrain(slug);
  } finally {
    rng = previous;
  }
}

const TARGETS = {
  quick: { minClues: 40, maxClues: 45, hardest: "box hidden singles" },
  easy: { minClues: 36, maxClues: 38, hardest: "singles" },
  "not easy": {
    minClues: 22,
    maxClues: 27,
    aimMin: 23,
    aimMax: 25,
    minBottlenecks: NOT_EASY_BN.min,
    maxBottlenecks: NOT_EASY_BN.max,
    maxSteps: 3,
    maxStalls: 2,
  },
  hard: {
    minClues: 22,
    maxClues: 27,
    aimMin: 23,
    aimMax: 25,
    minBottlenecks: HARD_BN.min,
    maxBottlenecks: HARD_BN.max,
    minSteps: 4,
    maxSteps: HARD_MAX_STEPS,
  },
  expert: { minClues: 22, maxClues: 26, hardest: "quad, fish, wing, skyscraper, two-string kite, W-wing, unique rectangle, or BUG+1" },
  mental: { minClues: 17, maxClues: 24, hardest: "chain or coloring" },
};

globalThis.SudokuGenerator = {
  generate,
  generateForTechnique,
  trainLevel(slug) {
    const spec = TRAIN[slug];
    return spec ? spec.level : null;
  },
  trainName(slug) {
    const spec = TRAIN[slug];
    return spec && spec.name ? spec.name : null;
  },
  techniqueRank(slug) {
    const rank = TECHNIQUE_RANK[slug];
    return rank == null ? null : rank;
  },
  difficulties: ["quick", "easy", "not easy", "hard", "expert", "mental"],
  dailyDifficulty: "not easy",
  targets: TARGETS,
};
