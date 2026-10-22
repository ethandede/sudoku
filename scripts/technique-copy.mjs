// Original explanations for the technique pages. Frequencies are the measured
// NYT profile already used by the grader (vivrao9/nyt-sudoku, Jan 2023–Mar 2024,
// 1,483 puzzles). Nothing here invents a rate the archive didn't show.

export const techniques = [
  {
    slug: "naked-single",
    name: "Naked single",
    description:
      "A Sudoku cell with one digit left. How naked singles work, where Easy puzzles use them, and a board you can step through.",
    level: "Easy",
    play: "easy",
    related: ["hidden-single"],
    when: "Easy puzzles on this site are singles only. Quick puzzles are too, limited to hidden singles inside a box. Every harder level ends in singles once the tougher step has opened them.",
    nyt: "All 495 NYT Easy puzzles in the archive are 38 clues and never need anything beyond singles.",
    paragraphs: [
      "A naked single is a cell with one digit left. The row, the column, or the box has already used the other eight, so the last digit is the one that goes in.",
      "You can see it without writing every candidate. If eight different digits already sit in the cell's row, column, and box, the missing digit is placed. That is the whole of an Easy puzzle here.",
    ],
  },
  {
    slug: "hidden-single",
    name: "Hidden single",
    description:
      "When a digit fits in only one cell of a row, column, or box. Hidden singles on Quick and Easy, with a worked example.",
    level: "Easy",
    play: "easy",
    related: ["naked-single", "pointing"],
    when: "Quick puzzles are solved with hidden singles inside boxes only. Easy puzzles also allow a hidden single in a row or column. Both stay inside singles, with no pointing and no pairs.",
    nyt: "NYT Easy is singles only. Three of the 495 Easy puzzles place a line hidden single if lines are scanned before boxes, and those three still solve with box hidden singles alone.",
    paragraphs: [
      "A hidden single is a digit that fits in only one cell of a row, column, or box. The cell may still look busy, because other digits haven't been ruled out of it yet. They don't matter. The digit has nowhere else in that house, so it is placed and the other candidates leave.",
      "In a box, this is the move Quick puzzles are built from: find the digit that has one home in the box. A row or a column can hide a digit the same way, and that is what separates Easy from Quick.",
    ],
  },
  {
    slug: "pointing",
    name: "Pointing",
    description:
      "When a digit in a box is locked to one row or column. Pointing on Not Easy, and why every NYT Medium needs it.",
    level: "Not Easy",
    play: "not-easy",
    related: ["claiming", "naked-pair"],
    when: "Not Easy is the pointing grade. The solver needs a pointing or a claiming step, one to three of them, and it stops before any pair. The narrowness of that path is kept in the same range as NYT Medium.",
    nyt: "Every one of the 494 NYT Medium puzzles needs pointing or claiming, and none of them needs a pair. About 24% of NYT Hard never goes past pointing either.",
    paragraphs: [
      "Pointing is a digit trapped on one line inside a box. Every cell that can still hold the digit in that box sits in the same row, or the same column. The box has to contain the digit, so those cells are the only homes it has. The rest of that row or column, outside the box, loses the digit.",
      "It is also called a pointing pair, or locked candidates. Two cells are the common case. Three cells lined up in the box work the same way.",
    ],
  },
  {
    slug: "claiming",
    name: "Claiming",
    description:
      "When a digit in a row or column is locked inside one box. Claiming, or box-line reduction, on Not Easy puzzles.",
    level: "Not Easy",
    play: "not-easy",
    related: ["pointing", "x-wing"],
    when: "Claiming is the other half of the Not Easy grade. A Not Easy puzzle's hardest step is pointing or claiming, never a pair.",
    nyt: "NYT Medium always needs pointing or claiming. The archive doesn't separate the two; both are the locked-candidate step that Medium never skips.",
    paragraphs: [
      "Claiming runs pointing in reverse. Take a digit in a row. If every cell that can still hold it sits inside a single box, the row has claimed that digit for the box. The rest of the box loses it. A column can claim a box the same way.",
      "The usual name in print is box-line reduction. On this site it shares a grade with pointing, because a player meets them at the same moment: the singles have run out, and a digit is locked to the overlap of a line and a box.",
    ],
  },
  {
    slug: "naked-pair",
    name: "Naked pair",
    description:
      "Two cells that share two digits and clear them from the rest of the house. Naked pairs are the most common NYT Hard step.",
    level: "Hard",
    play: "hard",
    related: ["hidden-pair", "naked-triple"],
    when: "Hard puzzles require a pair or a triple, and at least four steps that are not singles. A naked pair is enough to put a puzzle in Hard.",
    nyt: "A naked pair is the hardest step on 51% of the 494 NYT Hard puzzles. Nothing in the archive goes beyond triples.",
    paragraphs: [
      "A naked pair is two cells in the same row, column, or box whose only candidates are the same two digits. Those two cells will be those two digits, in one order or the other. Either way, both digits are used up, so they come out of every other cell in the house.",
      "The cells have to share a house. Two cells with {2, 4} that don't see each other are not a pair, and they eliminate nothing.",
    ],
  },
  {
    slug: "hidden-pair",
    name: "Hidden pair",
    description:
      "Two digits that fit in only two cells of a house. Hidden pairs on Hard puzzles, with a solver example.",
    level: "Hard",
    play: "hard",
    related: ["naked-pair", "hidden-triple"],
    when: "Hidden pairs are a Hard technique, same grade as a naked pair. The puzzle still has to need a pair or a triple, with at least four non-single steps.",
    nyt: "A hidden pair is the hardest step on 18% of NYT Hard.",
    paragraphs: [
      "A hidden pair is two digits that appear in only two cells of a house. Those cells often carry extra candidates, which is why the pair is hidden. The two digits have nowhere else to go, so they own the two cells, and every other candidate on those cells is removed.",
      "After that cleanup, the two cells are an ordinary naked pair. The hidden pair is the step that gets you there.",
    ],
  },
  {
    slug: "naked-triple",
    name: "Naked triple",
    description:
      "Three cells holding three digits between them. Naked triples on Hard, and how often triples show up in NYT Hard.",
    level: "Hard",
    play: "hard",
    related: ["hidden-triple", "naked-pair", "quads"],
    when: "A naked triple is a Hard technique. Triples share the Hard grade with pairs. Expert is where quads, fish, and wings begin.",
    nyt: "Triples, naked or hidden, are the hardest step on 6% of NYT Hard. The archive never needs a harder idea than that.",
    paragraphs: [
      "A naked triple is three cells in one house that use only three digits between them. Each cell can hold two of the digits, or all three. What matters is the union: three digits, three cells, nothing else.",
      "Those three digits are then deleted from the other cells in the house. The same pattern with two cells is a naked pair. With four, it is a naked quad.",
    ],
  },
  {
    slug: "hidden-triple",
    name: "Hidden triple",
    description:
      "Three digits confined to three cells of a house. Hidden triples on Hard puzzles, stepped through on a real board.",
    level: "Hard",
    play: "hard",
    related: ["naked-triple", "hidden-pair", "quads"],
    when: "Hidden triples are Hard, alongside naked triples and both kinds of pair.",
    nyt: "Triples of either kind are the hardest step on 6% of NYT Hard. No archived NYT puzzle needs a quad, a fish, or a chain.",
    paragraphs: [
      "A hidden triple is three digits that, inside one house, fit in only three cells. The cells may have other candidates written on them. Those extras are wrong: the three digits have to occupy the three cells, so anything else on them is eliminated.",
      "It is the hidden-pair idea with one more digit. Once the extras are gone, the three cells read as a naked triple.",
    ],
  },
  {
    slug: "quads",
    name: "Quads",
    description:
      "Naked and hidden quads lock four digits into four cells. An Expert technique this NYT set never needed.",
    level: "Expert",
    play: "expert",
    related: ["naked-triple", "hidden-triple"],
    when: "Quads are an Expert technique, with X-wings, swordfish, and XY-wings. A puzzle whose hardest step is a quad is Expert, not Hard.",
    nyt: "Across all 1,483 NYT puzzles in the archive, the solver never needs a quad. Hard stops at triples.",
    paragraphs: [
      "A quad is the subset pattern at four. A naked quad is four cells in one house whose combined candidates are exactly four digits. Those digits leave the rest of the house. A hidden quad is four digits that fit in only four cells of a house, so every other candidate on those cells is removed.",
      "Quads are easy to miss because four cells is a lot of the house, and the elimination is often small. They are also rare in newspaper puzzles. This site keeps them for Expert, where the puzzle is allowed to ask for one.",
    ],
  },
  {
    slug: "x-wing",
    name: "X-wing",
    description:
      "A rectangle of one digit across two rows and two columns. How an X-wing eliminates, on Expert puzzles.",
    level: "Expert",
    play: "expert",
    related: ["swordfish", "claiming"],
    when: "X-wings are Expert. Not Easy and Hard never require one.",
    nyt: "The 1,483 archived NYT puzzles never need an X-wing. Their hardest steps stop at triples.",
    paragraphs: [
      "An X-wing is one digit that forms a rectangle. In two rows, the digit has only two possible columns, and they are the same two columns in both rows. The digit has to occupy opposite corners of that rectangle, so it is eliminated from the rest of those two columns.",
      "Drawn the other way, two columns each hold the digit in the same two rows, and the rest of those rows loses it. Pointing and claiming are the one-house version of this lock. The X-wing is the same lock across two houses.",
    ],
  },
  {
    slug: "swordfish",
    name: "Swordfish",
    description:
      "An X-wing stretched over three rows and three columns. Swordfish eliminations on Expert puzzles.",
    level: "Expert",
    play: "expert",
    related: ["x-wing"],
    when: "Swordfish is Expert, one step past the X-wing. Mental is reserved for coloring and XY-chains.",
    nyt: "No puzzle in the NYT archive needs a swordfish. Expert is where this site asks for fish at all.",
    paragraphs: [
      "A swordfish is an X-wing with three rows instead of two. A digit is limited to the same three columns across three rows. It may not appear in every column of every row. Each of those rows uses two or three of the columns, and together the rows cover exactly three columns.",
      "The digit is then removed from those three columns everywhere outside the three rows. The column version clears three rows instead.",
    ],
  },
  {
    slug: "xy-wing",
    name: "XY-wing",
    description:
      "Three two-digit cells that force a digit off every cell seeing both wings. XY-wings on Expert.",
    level: "Expert",
    play: "expert",
    related: ["xy-chain", "naked-pair"],
    when: "XY-wings are Expert. A puzzle that needs one is past pairs, triples, and quads.",
    nyt: "XY-wings do not appear in the 1,483 NYT puzzles. That set never goes beyond triples.",
    paragraphs: [
      "An XY-wing is three cells, each with exactly two candidates. One cell, the pivot, sees the other two, the wings. The pivot's two digits are split across the wings: one wing shares the first digit, the other wing shares the second, and the wings share a third digit with each other.",
      "Whatever the pivot is, one of the wings is that third digit. A cell that can see both wings therefore can't be the third digit, and it loses it. The wings do not have to see each other.",
    ],
  },
  {
    slug: "coloring",
    name: "Simple coloring",
    description:
      "Color a digit's chain of two-cell links and follow the contradiction. Simple coloring on Mental puzzles.",
    level: "Mental",
    play: "mental",
    related: ["xy-chain"],
    when: "Simple coloring is a Mental technique. Mental puzzles are the ones whose hardest step is coloring or an XY-chain.",
    nyt: "Coloring is beyond the NYT archive. None of the 1,483 puzzles needs a chain.",
    paragraphs: [
      "Pick a digit. Wherever that digit has exactly two homes in a house, those two cells are linked: one of them is the digit, the other isn't. Color the links alternately. Two colors cover the chain.",
      "If two cells of the same color can see each other, that color is impossible, and every cell of that color loses the digit. A cell outside the chain that can see both colors loses the digit too, because one of the colors is real.",
    ],
  },
  {
    slug: "xy-chain",
    name: "XY-chain",
    description:
      "A chain of two-digit cells that starts and ends on the same digit. XY-chains on Mental puzzles.",
    level: "Mental",
    play: "mental",
    related: ["xy-wing", "coloring"],
    when: "XY-chains are Mental, with simple coloring. They are the hardest step this solver uses.",
    nyt: "The NYT archive never needs an XY-chain. Medium stops at pointing, and Hard stops at triples.",
    paragraphs: [
      "An XY-chain is a path of cells that each have two candidates. Each cell shares one candidate with the next cell, and the two cells see each other, so they can't both be that shared digit. The chain starts and ends on the same digit.",
      "One of the ends is that digit. Any other cell that sees both ends loses it. An XY-wing is the short chain: a pivot and two wings. A longer path is the same argument.",
    ],
  },
];

export const techniqueOrder = techniques.map((technique) => technique.slug);
