import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const context = { console, Math, performance, crypto };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/solver.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/share.js"), "utf8"), context);
const share = context.SudokuShare;

let failed = 0;
function check(name, ok) {
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${name}`);
  }
}

const daily = share.shareText({
  kindLabel: "Daily · Oct 21",
  time: "12:34",
  hints: 1,
  mistakes: 0,
  hardest: "locked",
  badges: [],
  url: share.dailyUrl(),
});
check("daily headline", daily.startsWith("SudokuSudoku · Daily · Oct 21\n"));
check("daily stats", daily.includes("Solved in 12:34 · 1 hint · 0 mistakes"));
check("daily technique", daily.includes("✦ Pointing"));
check("daily link", daily.endsWith("https://sudokusudoku.com/?daily"));
check("daily has no puzzle id", !daily.includes("?p="));

const seeded = share.shareText({
  kindLabel: "Not Easy",
  time: "8:02",
  hints: 0,
  mistakes: 2,
  hardest: "naked_pair",
  badges: ["Spotless", "Hard, no hints", "Ceiling breaker"],
  url: share.puzzleUrl("not-easy.abcdefgh"),
});
check("level line", seeded.includes("SudokuSudoku · Not Easy"));
check("plural hints", seeded.includes("0 hints"));
check("plural mistakes", seeded.includes("2 mistakes"));
check("badge trim", seeded.includes("Badge: Spotless, Hard, no hints and 1 more"));
check("puzzle link", seeded.includes("https://sudokusudoku.com/?p=not-easy.abcdefgh"));
check("no em dash", !daily.includes("—") && !seeded.includes("—"));
check("short date", share.shortDate("2026-10-21") === "Oct 21");
check("long date", share.longDate("2026-10-21") === "Oct 21, 2026");

const id = share.mintId("not easy");
const parsed = share.parseId(id);
check("mint parses", parsed && parsed.kind === "not easy" && parsed.seed === id);
check("bad id rejected", share.parseId("nope") === null);
check("daily param is not a puzzle id", share.parseId("daily") === null);

const puzzle = Array(81).fill(0);
const sample = "010040000000009005000030280700000010908005007000062000005000609000003000607000048";
for (let i = 0; i < 81; i += 1) puzzle[i] = Number(sample[i]);
const givensId = share.idFromGivens("not easy", puzzle);
const givensParsed = share.parseId(givensId);
check(
  "givens round trip",
  givensParsed && givensParsed.givens.join("") === sample && givensParsed.kind === "not easy"
);
const solution = share.uniqueSolution(puzzle);
check("unique solution", solution && solution.length === 81 && solution.every((digit) => digit >= 1 && digit <= 9));
check("solution keeps givens", solution && puzzle.every((digit, index) => !digit || solution[index] === digit));
const again = share.uniqueSolution(puzzle);
check("solution stable", again && again.join("") === solution.join(""));
const clash = solution.slice();
clash[1] = clash[0];
check("conflict rejected", share.uniqueSolution(clash) === null);

const pattern = share.patternCells("not-easy.abcdefgh");
check("pattern length", pattern.length === 81);
check("pattern is not all filled", pattern.some((cell) => cell === 0) && pattern.some((cell) => cell === 1));
check("pattern stable", share.patternCells("not-easy.abcdefgh").join("") === pattern.join(""));
check("share text has no 81 digit run", !/\d{81}/.test(seeded) && !/\d{81}/.test(daily));

vm.runInContext(fs.readFileSync(path.join(root, "assets/js/pools.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/generator.js"), "utf8"), context);
const generate = context.SudokuGenerator.generate;
const first = generate("easy", id);
const second = generate("easy", id);
check(
  "seed reproduces the grid",
  first.puzzle.join("") === second.puzzle.join("") && first.solution.join("") === second.solution.join("")
);
const other = generate("easy", share.mintId("easy"));
check("different seed differs", other.puzzle.join("") !== first.puzzle.join(""));
const built = share.materialize(first.puzzle, "easy");
check(
  "materialize matches the generator solution",
  built && built.solution.join("") === first.solution.join("")
);

const home = fs.readFileSync(path.join(root, "scripts/build.mjs"), "utf8");
check("og image", home.includes('og:image" content="${image}"') || home.includes("og:image"));
check("twitter card", home.includes('twitter:card" content="summary_large_image"'));
check("twitter image alt", home.includes("twitter:image:alt"));

if (failed) {
  console.error(`${failed} share checks failed`);
  process.exit(1);
}
console.log("share tests passed");
