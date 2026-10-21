import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const article = readFileSync(new URL("../articles/01-beginners-guide.md", import.meta.url), "utf8");
const fences = [...article.matchAll(/```\n([.\d \n]+)\n```/g)].map((match) =>
  match[1]
    .trim()
    .split("\n")
    .map((line) => line.trim().split(/\s+/).map((cell) => (cell === "." ? 0 : Number(cell))))
);

assert.equal(fences.length, 2, "beginner guide should show a puzzle and its solution");
const puzzle = fences[0].flat();
const solution = fences[1].flat();
assert.equal(puzzle.length, 16);
assert.equal(solution.length, 16);

function candidates(grid, index) {
  const row = Math.floor(index / 4);
  const col = index % 4;
  const boxRow = Math.floor(row / 2) * 2;
  const boxCol = Math.floor(col / 2) * 2;
  const found = [];
  for (let digit = 1; digit <= 4; digit += 1) {
    let ok = true;
    for (let i = 0; i < 4; i += 1) {
      if (grid[row * 4 + i] === digit || grid[i * 4 + col] === digit) ok = false;
    }
    for (let r = 0; r < 2 && ok; r += 1) {
      for (let c = 0; c < 2; c += 1) {
        if (grid[(boxRow + r) * 4 + (boxCol + c)] === digit) ok = false;
      }
    }
    if (ok) found.push(digit);
  }
  return found;
}

function countSolutions(grid) {
  const index = grid.findIndex((value) => value === 0);
  if (index < 0) return 1;
  let total = 0;
  for (const digit of candidates(grid, index)) {
    grid[index] = digit;
    total += countSolutions(grid);
    grid[index] = 0;
    if (total > 1) return total;
  }
  return total;
}

assert.equal(countSolutions(puzzle.slice()), 1, "4x4 example must have one solution");
assert.deepEqual(candidates(puzzle, 1), [3], "row 1 column 2 must be a naked single 3");
assert.equal(article.includes("Row 1, column 2 is 3."), true);
assert.equal(puzzle[1], 0, "the explained cell has to be empty in the puzzle");
assert.equal(solution[1], 3);

const filled = puzzle.slice();
function solve(grid) {
  const index = grid.findIndex((value) => value === 0);
  if (index < 0) return true;
  for (const digit of candidates(grid, index)) {
    grid[index] = digit;
    if (solve(grid)) return true;
    grid[index] = 0;
  }
  return false;
}
assert.equal(solve(filled), true);
assert.deepEqual(filled, solution);

console.log("4x4 beginner example: one solution, row 1 column 2 is 3");
