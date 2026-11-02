// Hand-built technique boards. Capture wins when the solver finds a step.
// A page can still supply `example` for the build to check, and a page with
// neither capture nor example still publishes.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { captureExamples } from "./capture-examples.mjs";

function loadSolver(root) {
  const source = readFileSync(join(root, "assets/js/solver.js"), "utf8");
  const context = { console, globalThis: null };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { solver: context.SudokuSolver, source };
}

function knownSlugs(source) {
  const slugs = new Set(["naked-single", "hidden-single"]);
  const block = source.match(/const STEP_SLUG = \{([\s\S]*?)\n  \};/);
  if (block) {
    for (const match of block[1].matchAll(/"([a-z0-9-]+)"/g)) slugs.add(match[1]);
  }
  return slugs;
}

function uniqueSolution(puzzle) {
  const grid = puzzle.slice();
  let count = 0;
  let solution = null;
  function clear(index, digit) {
    const row = Math.floor(index / 9);
    const col = index % 9;
    for (let i = 0; i < 9; i += 1) {
      if (grid[row * 9 + i] === digit || grid[i * 9 + col] === digit) return false;
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        if (grid[(br + r) * 9 + bc + c] === digit) return false;
      }
    }
    return true;
  }
  function search() {
    if (count > 1) return;
    let index = -1;
    for (let i = 0; i < 81; i += 1) {
      if (!grid[i]) {
        index = i;
        break;
      }
    }
    if (index < 0) {
      count += 1;
      if (count === 1) solution = grid.slice();
      return;
    }
    for (let digit = 1; digit <= 9; digit += 1) {
      if (!clear(index, digit)) continue;
      grid[index] = digit;
      search();
      grid[index] = 0;
      if (count > 1) return;
    }
  }
  search();
  return { count, solution };
}

function samePattern(left, right) {
  const a = (left || []).slice().sort((x, y) => x - y);
  const b = (right || []).slice().sort((x, y) => x - y);
  return a.join(",") === b.join(",");
}

function sameEliminate(left, right) {
  const key = (items) =>
    (items || [])
      .map((item) => `${item.index}:${item.digit}`)
      .sort()
      .join(",");
  return key(left) === key(right);
}

function samePlace(left, right) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.index === right.index && left.digit === right.digit;
}

function publicStep(step, name) {
  return {
    slug: step.slug,
    name: name || step.name,
    look: step.look,
    explain: step.explain,
    pattern: step.pattern,
    region: step.region,
    eliminate: step.eliminate,
    place: step.place,
    candidates: step.candidates,
  };
}

function walkTo(solver, puzzle, solution, slug) {
  const board = puzzle.slice();
  let removed = [];
  for (let guard = 0; guard < 240; guard += 1) {
    const step = solver.explain(board, removed, true);
    if (!step) return null;
    if (step.slug === slug) return { board: board.slice(), removed: removed.slice(), step };
    if (step.place && solution[step.place.index] !== step.place.digit) return null;
    if (step.place && board[step.place.index] === 0) board[step.place.index] = step.place.digit;
    if (step.eliminate && step.eliminate.length) {
      removed = removed.concat(step.eliminate.filter((item) => board[item.index] === 0));
    } else if (!step.place) return null;
    removed = removed.filter((item) => board[item.index] === 0);
  }
  return null;
}

function assertBoard(slug, board, solution, puzzle) {
  if (!board || board.length !== 81) throw new Error(`${slug} example board must have 81 cells`);
  for (let i = 0; i < 81; i += 1) {
    const digit = board[i];
    if (digit < 0 || digit > 9) throw new Error(`${slug} example board has a bad digit`);
    if (puzzle[i] && digit !== puzzle[i]) throw new Error(`${slug} example board erases a given`);
    if (digit && digit !== solution[i]) throw new Error(`${slug} example board disagrees with the solution`);
  }
}

function legalStatedStep(slug, step, board, pencil, solution) {
  if (!step || typeof step.look !== "string" || typeof step.explain !== "string") {
    throw new Error(`${slug} example needs look and explain text`);
  }
  const pattern = step.pattern || [];
  if (!pattern.length) throw new Error(`${slug} example needs pattern cells`);
  for (const index of pattern) {
    if (index < 0 || index > 80 || board[index]) throw new Error(`${slug} example pattern is not an empty cell`);
  }
  const eliminate = step.eliminate || [];
  for (const item of eliminate) {
    if (!item || board[item.index]) throw new Error(`${slug} example eliminates a filled cell`);
    if (item.digit === solution[item.index]) throw new Error(`${slug} example removes the solution digit`);
    const marks = pencil[item.index] || [];
    if (!marks.includes(item.digit)) throw new Error(`${slug} example eliminates a digit that is not a candidate`);
  }
  if (step.place) {
    const { index, digit } = step.place;
    if (board[index]) throw new Error(`${slug} example places into a filled cell`);
    if (digit !== solution[index]) throw new Error(`${slug} example places the wrong digit`);
    const marks = pencil[index] || [];
    if (!marks.includes(digit)) throw new Error(`${slug} example places a digit that is not a candidate`);
  }
  if (!eliminate.length && !step.place) throw new Error(`${slug} example does not change the board`);
}

export function verifyHandExample(solver, technique, known) {
  const slug = technique.slug;
  const spec = technique.example;
  if (!spec || !spec.puzzle || spec.puzzle.length !== 81) {
    throw new Error(`${slug} example needs an 81-cell puzzle`);
  }
  const puzzle = spec.puzzle.slice();
  for (let i = 0; i < 81; i += 1) {
    if (puzzle[i] < 0 || puzzle[i] > 9) throw new Error(`${slug} example puzzle has a bad digit`);
  }
  const solved = uniqueSolution(puzzle);
  if (solved.count !== 1 || solver.countSolutions(puzzle, 2) !== 1) {
    throw new Error(`${slug} example is not a unique puzzle`);
  }
  const solution = solved.solution;
  if (spec.solution) {
    if (spec.solution.length !== 81 || spec.solution.some((digit, index) => digit !== solution[index])) {
      throw new Error(`${slug} example solution does not match the puzzle`);
    }
  }
  const detected = known.has(slug);
  let board;
  let removed;
  let live;
  if (spec.board) {
    board = spec.board.slice();
    removed = (spec.removed || []).map((item) => ({ index: item.index, digit: item.digit }));
    assertBoard(slug, board, solution, puzzle);
    live = solver.explain(board, removed, true);
  } else if (detected) {
    const found = walkTo(solver, puzzle, solution, slug);
    if (!found) throw new Error(`${slug} example never reaches ${slug}`);
    board = found.board;
    removed = found.removed;
    live = found.step;
  } else {
    throw new Error(`${slug} example needs a board, because the solver has no ${slug} detector`);
  }
  if (detected) {
    if (!live || live.slug !== slug) {
      throw new Error(`${slug} example is not the next step${live ? ` (${live.slug} is)` : ""}`);
    }
    const stated = spec.step;
    if (stated) {
      if (stated.pattern && !samePattern(stated.pattern, live.pattern)) {
        throw new Error(`${slug} example pattern is not the solver step`);
      }
      if (stated.eliminate && !sameEliminate(stated.eliminate, live.eliminate)) {
        throw new Error(`${slug} example eliminations are not the solver step`);
      }
      if (stated.place && !samePlace(stated.place, live.place)) {
        throw new Error(`${slug} example placement is not the solver step`);
      }
    }
    return {
      given: puzzle.slice(),
      board,
      pencil: live.pencil,
      step: publicStep(live, technique.name),
    };
  }
  if (!live || !live.pencil) throw new Error(`${slug} example has no candidates to check`);
  legalStatedStep(slug, spec.step, board, live.pencil, solution);
  return {
    given: puzzle.slice(),
    board,
    pencil: live.pencil,
    step: {
      slug,
      name: technique.name,
      look: spec.step.look,
      explain: spec.step.explain,
      pattern: spec.step.pattern.slice(),
      region: spec.step.region || spec.step.pattern.slice(),
      eliminate: (spec.step.eliminate || []).map((item) => ({ index: item.index, digit: item.digit })),
      place: spec.step.place ? { index: spec.step.place.index, digit: spec.step.place.digit } : null,
      candidates: spec.step.candidates || null,
    },
  };
}

export function resolveTechniqueExamples(root, techniques) {
  const { solver, source } = loadSolver(root);
  const known = knownSlugs(source);
  const captured = captureExamples(root);
  const examples = {};
  for (const technique of techniques) {
    if (captured[technique.slug]) {
      examples[technique.slug] = captured[technique.slug];
      continue;
    }
    if (technique.example) {
      examples[technique.slug] = verifyHandExample(solver, technique, known);
      continue;
    }
    examples[technique.slug] = null;
  }
  return examples;
}
