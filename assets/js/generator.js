// Puzzle generator. The search and grading below are the existing algorithm.
// generate(difficulty, seed) is the seam a later rewrite can replace.
// A seed swaps in a deterministic RNG; with no seed, Math.random is used.

let rng = Math.random;
let solution = [];
let lastAnalysis = { hardestTechnique: -1, techniquesUsed: [] };

// Naked-pair grading deletes from a notes grid. That used to be the live
// board's notes. Keep a private grid so the same statements run without
// touching the puzzle the player sees.
const notes = Array.from({ length: 81 }, () => new Set());

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

function isValidMove(index, value, checkBoard) {
  const row = Math.floor(index / 9);
  const col = index % 9;
  for (let i = 0; i < 9; i++) {
    if (checkBoard[row * 9 + i] === value && i !== col) return false;
    if (checkBoard[i * 9 + col] === value && i !== row) return false;
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (
        checkBoard[(startRow + i) * 9 + (startCol + j)] === value &&
        startRow + i !== row &&
        startCol + j !== col
      )
        return false;
    }
  }
  return true;
}
function generatePuzzle(difficulty) {
  console.log(`Generating puzzle: ${difficulty}`);
  const difficultyTargets = {
    quick: { minClues: 40, maxClues: 45, minTechnique: 0 },
    easy: { minClues: 36, maxClues: 40, minTechnique: 0 },
    "not easy": { minClues: 30, maxClues: 35, minTechnique: 1 },
    hard: { minClues: 27, maxClues: 31, minTechnique: 2 },
    expert: { minClues: 22, maxClues: 26, minTechnique: 3 },
    mental: { minClues: 17, maxClues: 24, minTechnique: 4 },
  };
  const target = difficultyTargets[difficulty] || difficultyTargets.easy;
  const minClues = target.minClues;
  const maxClues = target.maxClues;
  const minTechnique = target.minTechnique;

  // Step 1: Generate a full grid
  let fullGrid = Array(81).fill(0);
  if (!generateFullGrid(fullGrid)) {
    console.warn("Failed to generate full grid, retrying");
    return generatePuzzle(difficulty);
  }
  solution = fullGrid.slice();
  let puzzle = fullGrid.slice();

  // Step 2: Remove clues to start near maxClues
  const indices = shuffleArray(Array.from({ length: 81 }, (_, i) => i));
  let clues = 81;
  const initialRemoveCount = 81 - maxClues;
  for (let i = 0; i < initialRemoveCount && clues > maxClues; i++) {
    const pos = indices[i];
    const temp = puzzle[pos];
    puzzle[pos] = 0;
    if (countSolutions(puzzle) !== 1) {
      puzzle[pos] = temp;
    } else {
      clues--;
    }
  }

  // Step 3: Analyze and adjust by adding clues if needed
  let attempts = 0;
  const maxAttempts = 100;
  let analysis = analyzeDifficulty(puzzle, solution, difficulty, difficultyTargets);
  console.log(`Initial puzzle: clues=${clues}, hardestTechnique=${analysis.hardestTechnique}`);

  while (analysis.hardestTechnique < minTechnique && clues < maxClues && attempts < maxAttempts) {
    const emptyIndices = indices.filter((i) => puzzle[i] === 0);
    if (emptyIndices.length === 0) break;

    const addIndex = emptyIndices[Math.floor(random() * emptyIndices.length)];
    puzzle[addIndex] = solution[addIndex];
    clues++;

    if (countSolutions(puzzle) === 1) {
      analysis = analyzeDifficulty(puzzle, solution, difficulty, difficultyTargets);
      console.log(`Added clue at ${addIndex}: clues=${clues}, hardestTechnique=${analysis.hardestTechnique}`);
    } else {
      puzzle[addIndex] = 0;
      clues--;
    }
    attempts++;
  }

  // Step 4: Trim excess clues if above maxClues, keeping uniqueness and technique
  if (clues > maxClues && analysis.hardestTechnique >= minTechnique && countSolutions(puzzle) === 1) {
    let trimAttempts = 0;
    const trimMaxAttempts = 50;
    const filledIndices = indices.filter((i) => puzzle[i] !== 0);
    
    while (clues > maxClues && trimAttempts < trimMaxAttempts) {
      const removeIndex = filledIndices[Math.floor(random() * filledIndices.length)];
      const temp = puzzle[removeIndex];
      puzzle[removeIndex] = 0;

      if (countSolutions(puzzle) === 1) {
        const newAnalysis = analyzeDifficulty(puzzle, solution, difficulty, difficultyTargets);
        if (newAnalysis.hardestTechnique >= minTechnique) {
          clues--;
          console.log(`Trimmed clue at ${removeIndex}: clues=${clues}, hardestTechnique=${newAnalysis.hardestTechnique}`);
          analysis = newAnalysis;
        } else {
          puzzle[removeIndex] = temp; // Revert if technique drops too low
        }
      } else {
        puzzle[removeIndex] = temp; // Revert if not unique
      }
      trimAttempts++;
    }
  }

  // Step 5: Final validation
  const finalUnique = countSolutions(puzzle) === 1;
  if (!finalUnique) {
    console.warn(`Puzzle not unique: clues=${clues}, retrying`);
    return generatePuzzle(difficulty);
  }
  if (analysis.hardestTechnique < minTechnique) {
    console.warn(`Technique too low: ${analysis.hardestTechnique}, retrying`);
    return generatePuzzle(difficulty);
  }
  if (clues < minClues) {
    console.warn(`Too few clues: clues=${clues}, retrying`);
    return generatePuzzle(difficulty);
  }

  lastAnalysis = analysis;
  return puzzle;
}
function generateFullGrid(grid) {
  for (let i = 0; i < 81; i++) {
    if (grid[i] === 0) {
      const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (let num of nums) {
        if (isValidMove(i, num, grid)) {
          grid[i] = num;
          if (generateFullGrid(grid)) return true;
          grid[i] = 0;
        }
      }
      return false;
    }
  }
  return true;
}
function shuffleArray(array) {
  if (!array || !Array.isArray(array)) {
    console.error("shuffleArray received invalid input:", array);
    return Array.from({ length: 81 }, (_, i) => i);
  }
  const shuffled = array.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
function analyzeDifficulty(base, solution, difficulty, difficultyTargets) {
  const target = difficultyTargets[difficulty] || difficultyTargets.easy;
  let tempBoard = base.slice();
  let hardestTechnique = -1;
  const techniquesUsed = [];

  console.log(
    "Analyzing techniques for board:",
    tempBoard.filter((x) => x !== 0).length,
    "clues"
  );

  let solved = false;
  for (let level = 0; level <= 4 && !solved; level++) {
    const progress = applyTechnique(level, tempBoard, true);
    if (progress) {
      hardestTechnique = level;
      const techniqueName = [
        "Singles",
        "Locked Candidates",
        "Naked/Hidden Pairs",
        "X-Wing/Unique Rectangle",
        "Swordfish/XY-Wing",
      ][level];
      if (!techniquesUsed.includes(techniqueName)) {
        techniquesUsed.push(techniqueName);
        console.log(`Level ${level} required: ${techniqueName}`);
      }
      applyTechnique(level, tempBoard, false);
      solved = tempBoard.every((val, i) => val === solution[i]);
    }
  }

  console.log(
    `Techniques required: ${
      techniquesUsed.length ? techniquesUsed.join(", ") : "None detected"
    }, Hardest: ${hardestTechnique}`
  );
  return { hardestTechnique, techniquesUsed };
}
function applyTechnique(level, board, analyzeOnly = false) {
  let progress = false;
  let tempBoard = analyzeOnly ? board.slice() : board;

  function getCandidates(index) {
    if (tempBoard[index] !== 0) return new Set();
    const candidates = new Set();
    for (let num = 1; num <= 9; num++) {
      if (isValidMove(index, num, tempBoard)) candidates.add(num);
    }
    return candidates;
  }

  if (level === 0) {
    for (let i = 0; i < 81; i++) {
      if (tempBoard[i] === 0) {
        const candidates = getCandidates(i);
        if (candidates.size === 1) {
          progress = true;
          if (!analyzeOnly) {
            tempBoard[i] = [...candidates][0];
            console.log(`Naked Single at ${i}: ${tempBoard[i]}`);
          }
        }
      }
    }
    for (let unit = 0; unit < 27; unit++) {
      const cells = getUnitCells(unit);
      const counts = Array(10).fill(0);
      const positions = Array(10)
        .fill()
        .map(() => []);
      cells.forEach((i) => {
        if (tempBoard[i] === 0) {
          getCandidates(i).forEach((num) => {
            counts[num]++;
            positions[num].push(i);
          });
        }
      });
      for (let num = 1; num <= 9; num++) {
        if (counts[num] === 1 && positions[num].length === 1) {
          const i = positions[num][0];
          if (tempBoard[i] === 0) {
            progress = true;
            if (!analyzeOnly) {
              tempBoard[i] = num;
              console.log(`Hidden Single at ${i}: ${num}`);
            }
          }
        }
      }
    }
  } else if (level === 1) {
    for (let box = 0; box < 9; box++) {
      const boxStart = Math.floor(box / 3) * 27 + (box % 3) * 3;
      const boxCells = [];
      for (let i = 0; i < 9; i++)
        boxCells.push(boxStart + Math.floor(i / 3) * 9 + (i % 3));
      const boxCands = Array(10)
        .fill()
        .map(() => new Set());
      boxCells.forEach((i) => {
        if (tempBoard[i] === 0)
          getCandidates(i).forEach((num) => boxCands[num].add(i));
      });
      for (let num = 1; num <= 9; num++) {
        if (boxCands[num].size > 0) {
          const rows = [...boxCands[num]].map((i) => Math.floor(i / 9));
          const cols = [...boxCands[num]].map((i) => i % 9);
          if (new Set(rows).size === 1 || new Set(cols).size === 1) {
            progress = true;
            console.log(`Locked Candidates for ${num} in box ${box}`);
            if (!analyzeOnly) {
            }
          }
        }
      }
    }
  } else if (level === 2) {
    for (let unit = 0; unit < 27; unit++) {
      const cells = getUnitCells(unit);
      const cands = cells.map((i) =>
        tempBoard[i] === 0 ? getCandidates(i) : new Set()
      );
      for (let i = 0; i < 9; i++) {
        if (cands[i].size === 2) {
          for (let j = i + 1; j < 9; j++) {
            if (cands[j].size === 2 && setsEqual(cands[i], cands[j])) {
              progress = true;
              console.log(`Naked Pair in unit ${unit}: ${[...cands[i]]}`);
              if (!analyzeOnly) {
                cells.forEach((k, idx) => {
                  if (idx !== i && idx !== j && tempBoard[k] === 0) {
                    cands[i].forEach((num) => notes[k].delete(num));
                  }
                });
              }
            }
          }
        }
      }
    }
  } else if (level === 3) {
    for (let num = 1; num <= 9; num++) {
      const rowCands = Array(9)
        .fill()
        .map(() => new Set());
      for (let i = 0; i < 81; i++) {
        if (tempBoard[i] === 0 && getCandidates(i).has(num))
          rowCands[Math.floor(i / 9)].add(i % 9);
      }
      for (let r1 = 0; r1 < 8; r1++) {
        if (rowCands[r1].size === 2) {
          for (let r2 = r1 + 1; r2 < 9; r2++) {
            if (
              rowCands[r2].size === 2 &&
              setsEqual(rowCands[r1], rowCands[r2])
            ) {
              progress = true;
              console.log(`X-Wing for ${num} in rows ${r1}, ${r2}`);
              if (!analyzeOnly) {
              }
            }
          }
        }
      }
    }
  } else if (level === 4) {
    for (let num = 1; num <= 9; num++) {
      const rowCands = Array(9)
        .fill()
        .map(() => new Set());
      for (let i = 0; i < 81; i++) {
        if (tempBoard[i] === 0 && getCandidates(i).has(num))
          rowCands[Math.floor(i / 9)].add(i % 9);
      }
      for (let r1 = 0; r1 < 7; r1++) {
        if (rowCands[r1].size >= 2 && rowCands[r1].size <= 3) {
          for (let r2 = r1 + 1; r2 < 8; r2++) {
            if (rowCands[r2].size >= 2 && rowCands[r2].size <= 3) {
              for (let r3 = r2 + 1; r3 < 9; r3++) {
                if (rowCands[r3].size >= 2 && rowCands[r3].size <= 3) {
                  const cols = new Set([
                    ...rowCands[r1],
                    ...rowCands[r2],
                    ...rowCands[r3],
                  ]);
                  if (cols.size === 3) {
                    progress = true;
                    console.log(
                      `Swordfish for ${num} in rows ${r1}, ${r2}, ${r3}`
                    );
                    if (!analyzeOnly) {
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return progress;
}
function setsEqual(set1, set2) {
  if (set1.size !== set2.size) return false;
  return [...set1].every((item) => set2.has(item));
}
function getUnitCells(unit) {
  const cells = [];
  if (unit < 9) {
    for (let i = 0; i < 9; i++) cells.push(unit * 9 + i);
  } else if (unit < 18) {
    for (let i = 0; i < 9; i++) cells.push(i * 9 + (unit - 9));
  } else {
    const box = unit - 18;
    const start = Math.floor(box / 3) * 27 + (box % 3) * 3;
    for (let i = 0; i < 9; i++)
      cells.push(start + Math.floor(i / 3) * 9 + (i % 3));
  }
  return cells;
}
function canSolveWithSingles(board) {
  const temp = board.slice();
  let changed = true;
  while (changed && temp.indexOf(0) !== -1) {
    changed = false;
    for (let i = 0; i < 81; i++) {
      if (temp[i] === 0) {
        let candidates = [];
        for (let num = 1; num <= 9; num++) {
          if (isValidMove(i, num, temp)) candidates.push(num);
        }
        if (candidates.length === 1) {
          temp[i] = candidates[0];
          changed = true;
        } else if (candidates.length === 0) {
          return false;
        }
      }
    }
  }
  return temp.indexOf(0) === -1;
}
function countSolutions(board) {
  let solutions = 0;
  function solveAll(b) {
    if (solutions > 1) return;
    const empty = b.indexOf(0);
    if (empty === -1) {
      solutions++;
      return;
    }
    for (let num = 1; num <= 9; num++) {
      if (solutions > 1) return;
      if (isValidMove(empty, num, b)) {
        b[empty] = num;
        solveAll(b);
        b[empty] = 0;
      }
    }
  }
  const temp = board.slice();
  solveAll(temp);
  console.log(`Solutions found: ${solutions}`);
    if (solutions > 1) console.warn("Multiple solutions detected:", solutions);
  return solutions;
}

const DIFFICULTY_TARGETS = {
  quick: { minClues: 40, maxClues: 45, minTechnique: 0 },
  easy: { minClues: 36, maxClues: 40, minTechnique: 0 },
  "not easy": { minClues: 30, maxClues: 35, minTechnique: 1 },
  hard: { minClues: 27, maxClues: 31, minTechnique: 2 },
  expert: { minClues: 22, maxClues: 26, minTechnique: 3 },
  mental: { minClues: 17, maxClues: 24, minTechnique: 4 },
};

function generate(difficulty, seed) {
  const previous = rng;
  if (seed !== undefined && seed !== null && seed !== "") {
    const numeric = typeof seed === "number" ? seed : hashSeed(seed);
    rng = mulberry32(numeric);
  }
  try {
    const puzzle = generatePuzzle(difficulty);
    const clues = puzzle.filter((value) => value !== 0).length;
    return {
      puzzle,
      solution: solution.slice(),
      metadata: {
        difficulty,
        clues,
        techniques: lastAnalysis.techniquesUsed.slice(),
        hardestTechnique: lastAnalysis.hardestTechnique,
        solutions: 1,
        seed: seed ?? null,
      },
    };
  } finally {
    rng = previous;
  }
}

window.SudokuGenerator = {
  generate,
  difficulties: ["quick", "easy", "not easy", "hard", "expert", "mental"],
  dailyDifficulty: "not easy",
  targets: DIFFICULTY_TARGETS,
};
