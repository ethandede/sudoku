import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { techniqueOrder } from "./technique-copy.mjs";

function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(random) {
  const order = Array.from({ length: 81 }, (_, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  return order;
}

function publicStep(step) {
  return {
    slug: step.slug,
    name: step.name,
    look: step.look,
    explain: step.explain,
    pattern: step.pattern,
    region: step.region,
    eliminate: step.eliminate,
    place: step.place,
    candidates: step.candidates,
  };
}

export function captureExamples(root) {
  const context = { console, globalThis: null };
  context.globalThis = context;
  vm.createContext(context);
  const source = ["solver.js", "pools.js", "generator.js"]
    .map((file) => readFileSync(join(root, "assets/js", file), "utf8"))
    .join("\n");
  vm.runInContext(source, context);
  const { SudokuSolver, SudokuGenerator, SudokuPools } = context;
  const found = new Map();
  const wanted = new Set(techniqueOrder);

  function remember(puzzle, board, step, solution) {
    if (!step || !wanted.has(step.slug) || found.has(step.slug)) return;
    if (step.place && solution && solution[step.place.index] !== step.place.digit) return;
    found.set(step.slug, {
      given: puzzle.slice(),
      board: board.slice(),
      pencil: step.pencil,
      step: publicStep(step),
    });
    wanted.delete(step.slug);
  }

  function harvest(puzzle, solution) {
    if (!wanted.size) return;
    const board = puzzle.slice();
    let removed = [];
    const seen = new Set();
    for (let guard = 0; guard < 240 && wanted.size; guard++) {
      const step = SudokuSolver.explain(board, removed, true);
      if (!step) break;
      const placeKey = step.place ? step.place.index : "none";
      const key = `${step.slug}:${step.pattern.join(".")}:${placeKey}`;
      if (seen.has(key)) break;
      seen.add(key);
      remember(puzzle, board, step, solution);
      if (step.place && board[step.place.index] === 0) board[step.place.index] = step.place.digit;
      if (step.eliminate && step.eliminate.length) {
        removed = removed.concat(step.eliminate.filter((item) => board[item.index] === 0));
      } else if (!step.place) {
        break;
      }
      removed = removed.filter((item) => board[item.index] === 0);
    }
  }

  for (const level of ["not easy", "hard", "expert", "mental"]) {
    const pool = SudokuPools[level] || [];
    for (const item of pool) {
      harvest(item.puzzle, item.solution);
      if (!wanted.size) break;
    }
  }

  const plans = [
    ["easy", 4],
    ["quick", 2],
    ["not easy", 6],
    ["hard", 8],
    ["expert", 16],
    ["mental", 8],
  ];
  for (const [level, count] of plans) {
    for (let i = 0; i < count && wanted.size; i++) {
      const result = SudokuGenerator.generate(level, `teach-${level}-${i}`);
      harvest(result.puzzle, result.solution);
    }
  }

  let extra = 0;
  while (wanted.size && extra < 50) {
    const level = extra % 5 === 0 ? "hard" : extra % 2 === 0 ? "mental" : "expert";
    const result = SudokuGenerator.generate(level, `teach-extra-${extra}`);
    harvest(result.puzzle, result.solution);
    extra += 1;
  }

  let digs = 0;
  while (wanted.size && digs < 20) {
    digs += 1;
    const random = mulberry32(0x51ed0000 + digs * 97);
    const solution = SudokuSolver.fillGrid(random);
    if (!solution) continue;
    const puzzle = solution.slice();
    let clues = 81;
    for (const index of shuffle(random)) {
      if (clues <= 23) break;
      const saved = puzzle[index];
      puzzle[index] = 0;
      if (SudokuSolver.countSolutions(puzzle, 2) !== 1) puzzle[index] = saved;
      else clues -= 1;
    }
    const graded = SudokuSolver.grade(puzzle, { solution, metrics: false });
    if (!graded.solved || graded.corrupt) continue;
    harvest(puzzle, solution);
  }

  // Mental seed teach-extra-4 used to be the only captured quad. Newer techniques
  // can outrank that carve, so generate() no longer returns it. The grid itself
  // still has a quad, so harvest it directly when the search comes up empty.
  if (wanted.has("quads")) {
    harvest(
      [0,0,0,0,4,0,0,0,0,0,0,0,7,0,9,0,0,0,0,9,0,0,0,8,0,0,3,0,0,0,5,0,0,9,0,6,0,8,0,0,6,0,0,0,0,2,5,0,0,0,1,0,0,0,4,0,7,0,1,0,0,0,0,0,0,9,0,0,2,3,1,0,0,0,8,0,0,4,0,2,0],
      [3,7,2,1,4,6,5,9,8,8,1,5,7,3,9,6,4,2,6,9,4,2,5,8,1,7,3,7,4,1,5,2,3,9,8,6,9,8,3,4,6,7,2,5,1,2,5,6,9,8,1,4,3,7,4,2,7,3,1,5,8,6,9,5,6,9,8,7,2,3,1,4,1,3,8,6,9,4,7,2,5]
    );
  }

  if (wanted.size) {
    throw new Error(`No solver example for: ${[...wanted].join(", ")}`);
  }

  const examples = {};
  for (const slug of techniqueOrder) examples[slug] = found.get(slug);
  return examples;
}
