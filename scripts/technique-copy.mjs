// Original explanations for the technique pages. Frequencies are the measured
// NYT profile already used by the grader (vivrao9/nyt-sudoku, Jan 2023-Mar 2024,
// 1,483 puzzles). Nothing here invents a rate the archive didn't show.
//
// `order` is the solver's difficulty, lowest first. The techniques index and
// the "next harder" link both sort by it, so array position does not matter.
// A tenth breaks ties (claiming after pointing, a hidden subset after the
// naked one, XY-chain after coloring). Leave the gaps. A new technique slots
// in by setting `order` and nothing else:
//   skyscraper 72, two-string-kite 74 (after x-wing, before xy-wing)
//   xyz-wing 82, w-wing 84 (after xy-wing, before swordfish)
//   unique-rectangle 92, bug-plus-one 94 (after swordfish, before coloring)

export const techniques = [
  {
    slug: "naked-single",
    name: "Naked single",
    description:
      "A Sudoku cell with one digit left. How naked singles work, where Easy puzzles use them, and a board you can step through.",
    level: "Easy",
    play: "easy",
    order: 0,
    related: ["hidden-single"],
    when: "Easy puzzles on this site are singles only. Quick puzzles are too, limited to hidden singles inside a box. Every harder level ends in singles once the tougher step has opened them.",
    nyt: "All 495 NYT Easy puzzles in the archive are 38 clues and never need anything beyond singles.",
    sections: [
      {
        h: "The cell is down to one digit",
        p: [
          "Row 5, column 3 on the board below has one candidate left, a 2. That is a naked single. The row, the column, and the box have already used the other eight digits, so this cell is finished whether or not you have written notes.",
          "I place these before I look for anything clever. If a single is on the board, a pair or a fish is just me showing off. Easy puzzles here are this move and hidden singles, and then they are over.",
        ],
      },
      {
        h: "Why eight placed digits leave one",
        p: [
          "A cell is seen by its row, its column, and its box. Each of those houses holds each digit once. Any digit already sitting in one of the three is banned from the cell. Cover eight digits with those bans and the ninth is placed. There is nowhere else for the logic to go.",
          "The cell does not have to be the only home for that digit in the row. Other empty cells can still list it. You are reading this cell's candidates. A hidden single is a different question: whether one digit has a single seat in a house, even while the cell looks crowded. I mix those up when I am rushing, and the board below is a clean way to tell them apart.",
        ],
      },
      {
        h: "How I scan for one",
        p: [
          "With notes on, it is the cell with a single mark. I still check the houses before I type it in. A stale note will invent a naked single that the board does not have.",
        ],
        ol: [
          "Take an empty cell and list the digits already in its row.",
          "Add the digits in its column that the row did not already include.",
          "Add anything in its box that is still new.",
          "Eight digits on that list means you place the missing one. Fewer than eight, and you move to the next crowded cell.",
        ],
      },
      {
        p: [
          "Without notes I do the same pass by eye, and I start in boxes that are already full. Six or seven digits in a box is where a naked single tends to sit. An empty-looking box can wait. After each placement I look again at the cells that saw it, because one digit often knocks the next cell down to a single.",
        ],
      },
      {
        demo: true,
        h: "The 2 in row 5",
        intro:
          "These marks are the candidates left when a naked single is the next step. The highlighted cell is the one with a single candidate.",
      },
      {
        h: "What the houses already hold",
        p: [
          "Row 5 shows 1 in column 1, 4 in column 2, 9 in column 5, 5 in column 6, and 6 in column 8. Column 3 shows 7 in row 2, 8 in row 4, and 3 in row 7. Box 4, the middle box on the left, holds that same 8 plus the 1 and the 4, so the box adds nothing you have not counted.",
          "The banned digits are 1, 3, 4, 5, 6, 7, 8, and 9. The digit left is 2, and it is the only mark in row 5, column 3. The step places 2 there.",
          "Row 5, column 4 still carries 2 and 8. The 2 has a second seat in the row, so it is not a hidden single. The naked single is the quiet cell. Row 5, column 4 can keep its 2 for now.",
        ],
      },
      {
        h: "Two ways to mess it up",
        p: [
          "A [hidden single](/techniques/hidden-single/) still has extra candidates on the cell. You place the digit because the house has one home for it, and you cross the extras off. A naked single has no extras to cross off. If you are deleting other digits from the cell, you are looking at a different move.",
          "The other miss is a note I never updated. I have placed a \"naked\" 4 that was only naked because I had forgotten to rub a 4 out of the column. If those eight digits are not actually on the board, the cell is not solved. Count what you see, then place it.",
        ],
      },
      {
        h: "Where this is the whole puzzle",
        p: [
          "Easy puzzles on this site are singles only. Quick puzzles are narrower: hidden singles inside a box, and no line singles. Every harder level still ends in singles once the tougher step has opened them. I reach for this before pointing, before pairs, before any of it.",
          "All 495 NYT Easy puzzles in the archive are 38 clues and never need anything beyond singles. A puzzle that needs more than this is not an Easy here, and it was not an NYT Easy in that set.",
          "When the singles dry up and the board just sits there, look for a hidden single you skipped, then for [pointing](/techniques/pointing/). Guessing between two leftover candidates is how a clean Easy turns into a mess.",
        ],
      },
    ],
  },
  {
    slug: "hidden-single",
    name: "Hidden single",
    description:
      "When a digit fits in only one cell of a row, column, or box. Hidden singles on Quick and Easy, with a worked example.",
    level: "Easy",
    play: "easy",
    order: 20,
    related: ["naked-single", "pointing"],
    when: "Quick puzzles are solved with hidden singles inside boxes only. Easy puzzles also allow a hidden single in a row or column. Both stay inside singles, with no pointing and no pairs.",
    nyt: "NYT Easy is singles only. Three of the 495 Easy puzzles place a line hidden single if lines are scanned before boxes, and those three still solve with box hidden singles alone.",
    sections: [
      {
        h: "The cell can still look busy",
        p: [
          "What if the cell has four candidates, and one of them is the answer anyway? That is a hidden single. A digit fits in only one cell of a row, a column, or a box. The other marks on that cell have not been ruled out yet. They are about to be.",
          "On the board below, row 1, column 7 still shows 1, 3, 7, and 8. Busy is not the same as undecided. The 7 has nowhere else to go inside box 3, so the cell is 7, and 1, 3, and 8 leave.",
        ],
      },
      {
        h: "The house does the work",
        p: [
          "Each house holds each digit once. Walk every cell in the house. Filled cells are done. An empty cell is a home for the digit only when that digit is still a candidate, which already means the digit is missing from its row and its column. One home left means you place it. You never needed the cell to become a [naked single](/techniques/naked-single/) first.",
          "In a box, this is the move Quick puzzles are built from. A row or a column can hide a digit the same way, and that extra reach is what separates Easy from Quick. I still scan boxes first. A line single is easy to \"discover\" after a box single has been sitting there the whole time.",
        ],
      },
      {
        h: "Stick with one digit",
        p: [
          "Hopping digits is how I miss the one open cell. Pick a digit and finish the boxes before you fall in love with a different number.",
        ],
        ol: [
          "Choose a digit that already appears a lot on the board. Fewer homes to check.",
          "In one box, list every empty cell that can still be that digit.",
          "One home means place it, and cross the other candidates off that cell.",
          "Two or three homes that share a line are [pointing](/techniques/pointing/), which is the next grade up. Leave them.",
          "After the nine boxes, run the same count on rows, then on columns.",
        ],
      },
      {
        p: [
          "Notes make the count faster, and they lie when you have not cleared them. If the notes and the board disagree, believe the board.",
        ],
      },
      {
        demo: true,
        h: "One 7 in box 3",
        intro:
          "Box 3 is the top right. The 7 has a single home there. Step through and watch the extra marks come off the cell.",
      },
      {
        h: "Five empty cells, one of them can be 7",
        p: [
          "Box 3 is rows 1 to 3 and columns 7 to 9. Four cells are filled: row 1 column 8 is 4, row 1 column 9 is 5, row 2 column 8 is 9, and row 3 column 7 is 2. Five cells are still open.",
          "Row 1, column 7 can be 1, 3, 7, or 8. Row 2, column 7 can be 1, 3, or 8. Row 2, column 9 can be 1, 3, 6, or 8. Row 3, column 8 can be 1 or 8. Row 3, column 9 can be 1, 3, 6, or 8. Read that list for a 7. It shows up once, in row 1, column 7.",
          "The 1, the 3, and the 8 come off row 1, column 7. The step places 7 there. The box was enough on its own, which is why a Quick puzzle never needs a single in a row.",
        ],
      },
      {
        h: "Placing it too early, or backwards",
        p: [
          "The slip I make most is calling it with two homes left. One of the cells \"looks\" more like a 7, and I place it. It is a hidden single when the other homes are gone, and not a minute sooner. Two homes that happen to share a line are pointing, and pointing does not place the digit at all.",
          "The backwards version is deleting the 7 and keeping the noise. The digit with one home is the one that stays. Everything else on that cell goes. Wipe the cell and you have played the move in reverse.",
          "A naked single starts from a cell that already has one mark. This cell had four, and the house had one seat for 7. If the cell is already down to one mark, place it and stop recounting the box.",
        ],
      },
      {
        h: "Quick, then Easy",
        p: [
          "Quick puzzles on this site are hidden singles inside boxes only. Easy puzzles also allow a hidden single in a row or a column. Both stay inside singles. No pointing and no pairs. I reach for a line single only after the boxes have nothing left.",
          "NYT Easy is singles only. Three of the 495 Easy puzzles place a line hidden single if you scan lines before boxes, and those three still solve with box hidden singles alone. Scanning boxes first matches that. The line version is real. It is a poor first pass.",
          "When every digit has two or more homes in every house, singles are done. That is the moment for pointing. It is a bad moment to guess between the two homes.",
        ],
      },
    ],
  },
  {
    slug: "pointing",
    name: "Pointing",
    description:
      "When a digit in a box is locked to one row or column. Pointing on Not Easy, and why every NYT Medium needs it.",
    level: "Not Easy",
    play: "not-easy",
    order: 30,
    related: ["claiming", "naked-pair"],
    when: "Not Easy is the pointing grade. The solver needs a pointing or a claiming step, one to three of them, and it stops before any pair. The narrowness of that path is kept in the same range as NYT Medium.",
    nyt: "Every one of the 494 NYT Medium puzzles needs pointing or claiming, and none of them needs a pair. About 24% of NYT Hard never goes past pointing either.",
    sections: [
      {
        h: "Singles run out, then a digit lines up",
        p: [
          "Pointing is the first move I need once [naked singles](/techniques/naked-single/) and [hidden singles](/techniques/hidden-single/) have stopped. A digit inside one box has two or three homes, and those homes all sit on one row or one column. The box still has to contain the digit, so those cells are its only seats. The rest of that row or column, outside the box, loses the digit.",
          "Two cells is the usual case. Three cells in a line follow the same rule. One home is a hidden single you should have placed already.",
        ],
      },
      {
        h: "Why the rest of the line loses it",
        p: [
          "The digit goes somewhere in the box. If every legal cell for it in that box is in column 5, then the column's copy of that digit is inside the box. Another copy out in column 5 would double the column, or it would leave the box without the digit. So the outside cells give it up.",
          "You are deleting the digit from the line, not placing it inside the box. Sometimes that leaves a naked single and the board moves. Sometimes it only cleans a note. I used to skip the quiet ones, then wonder why the next single never showed up.",
        ],
      },
      {
        h: "One digit, then the next",
        ol: [
          "Pick a digit and stay with it.",
          "In a box, find every cell that can still be that digit.",
          "If those cells use more than one row and more than one column, there is no point. Next box.",
          "If they share a row, delete the digit from the other cells of that row, outside this box.",
          "If they share a column, delete it from the rest of the column.",
          "Then the next digit. Most boxes take a glance.",
        ],
      },
      {
        p: [
          "[Claiming](/techniques/claiming/) is the same overlap, read from the line instead of the box. I do this pass while I am still thinking in boxes, because that is how the hidden-single scan was going. If the boxes find nothing, I switch and read the lines.",
        ],
      },
      {
        demo: true,
        h: "The 2s in box 5",
        intro:
          "Box 5 is the center. The 2s left in it are the pattern. Step through and see which 2 leaves column 5.",
      },
      {
        h: "Both homes are in column 5",
        p: [
          "Box 5 is rows 4 to 6, columns 4 to 6. Most of it is filled. The cells in that box that can still be 2 are row 4, column 5 and row 6, column 5. Row 4, column 5 holds 1, 2, and 4. Row 6, column 5 holds 1, 2, and 4. Both sit in column 5. Row 6, column 6 is in the same box and only holds 1 and 4, so it is not a third home for the 2.",
          "The 2 in box 5 is locked to column 5. Outside the box, row 1, column 5 still lists 1 and 2. That 2 is deleted. The cell is left with 1, and the step places 1 in row 1, column 5.",
          "Nothing else in column 5 was carrying a 2. One candidate leaves, and a 1 lands in box 2. Row 4, column 5 and row 6, column 5 still hold 1, 2, and 4 afterward. The line got cleared. The box did not get solved.",
        ],
      },
      {
        h: "A third home, or the wrong direction",
        p: [
          "If the two cells share a line and the digit still has another home in the box, it is not pointing. I have knocked a 2 off a column when the corner of the box could still be 2. Check the whole box, not the pair that caught your eye.",
          "Claiming is the look-alike. Pointing starts in the box and deletes from the line outside it. Claiming starts on the line and deletes inside the box. On this board the cell that loses a 2 is row 1, column 5, outside box 5 and still on column 5. That direction is pointing. A deletion inside the box, caused by a line, would be claiming, and it would be a different puzzle.",
        ],
      },
      {
        h: "This is the Not Easy grade",
        p: [
          "Not Easy is the pointing grade. The solver needs a pointing or a claiming step, one to three of them, and it stops before any pair. The narrowness of that path is kept in the same range as NYT Medium.",
          "Every one of the 494 NYT Medium puzzles needs pointing or claiming, and none of them needs a pair. About 24% of NYT Hard never goes past pointing either. This is the move that shows up the moment singles are not enough.",
          "I run singles again after every point. The 1 in row 1, column 5 is the payoff, and it only appeared because the 2 left. Hunting a [naked pair](/techniques/naked-pair/) while that 1 is sitting there is extra work.",
        ],
      },
    ],
  },
  {
    slug: "claiming",
    name: "Claiming",
    description:
      "When a digit in a row or column is locked inside one box. Claiming, or box-line reduction, on Not Easy puzzles.",
    level: "Not Easy",
    play: "not-easy",
    order: 31,
    related: ["pointing", "x-wing"],
    when: "Claiming is the other half of the Not Easy grade. A Not Easy puzzle's hardest step is pointing or claiming, never a pair.",
    nyt: "NYT Medium always needs pointing or claiming. The archive doesn't separate the two; both are the locked-candidate step that Medium never skips.",
    sections: [
      {
        h: "I kept deleting the wrong side",
        p: [
          "Claiming runs [pointing](/techniques/pointing/) backwards, and I spent a week walking in through the other door. Take a digit in a row. If every cell that can still hold it sits inside a single box, the row has claimed that digit for the box. The rest of the box loses it. A column can claim a box the same way.",
          "The name in a lot of books is box-line reduction. On this site it shares a grade with pointing, because you meet them together. Singles have run out, and a digit is locked to the overlap of a line and a box. The only real question is which side of the overlap you noticed.",
        ],
      },
      {
        h: "Why the box gives the digit up",
        p: [
          "The row has to put the digit somewhere. If its only legal cells are inside one box, that box is where the row's digit will live. The box also holds the digit once. So the box's seat for that digit is on the row that claimed it. A cell in the box, off that row, cannot be the digit. If it were, the row would have nowhere to put its own copy.",
          "The deletion lands inside the box, off the line. That is the test I use when I am unsure which move I found. A deletion outside the box means I was pointing, or I was inventing.",
        ],
      },
      {
        demo: true,
        h: "Row 1 claims the 3",
        intro:
          "Row 1 is almost full. The 3s left in it both sit in the top right box. Step through and see what box 3 loses.",
      },
      {
        h: "The only open cells are in box 3",
        p: [
          "Row 1, columns 1 through 6, are filled: 8, 5, 6, 9, 7, and 2. Three cells are open, and all three are in box 3. Row 1, column 7 can be 1, 3, or 4. Row 1, column 8 can be 1, 3, or 4. Row 1, column 9 can be 1 or 4, with no 3 on it.",
          "Every 3 left in the row sits in box 3. The row has claimed the 3. Off that row, still inside the box, row 2, column 8 lists 2 and 3. The 3 comes off. The cell is left with 2, and the step places 2 in row 2, column 8.",
          "Row 2, column 9 can be 2, 5, or 9. Row 3, column 9 can be 2, 5, or 9. Neither had a 3 to lose. One deletion, then a placement. Same kind of small payoff as a point, aimed into the box.",
        ],
      },
      {
        h: "How I scan a line",
        ol: [
          "Pick a row that is more than half filled. The digit has fewer places to hide.",
          "For one digit, list the cells in that row that can still hold it.",
          "If those cells spread across two boxes, it is not claiming. Next digit.",
          "If they all sit in one box, delete that digit from the other cells of the box.",
          "Run the columns the same way once the rows are quiet.",
        ],
      },
      {
        h: "The elimination is not on the row",
        p: [
          "My recurring slip is to delete the 3 from the rest of row 1. There is nothing to delete. The other cells are filled, or they already lack a 3. The elimination was never going to land on the row. It lands in the box, on row 2, column 8.",
          "Two 3s aligned in a row feel like pointing. Pointing would need the box's only 3s to be those cells, and the deletion would hit the row outside the box. Here the row is where we started, and the box is what gave a candidate up. If box 3 still had a 3 down in row 2 or row 3, on top of the ones in row 1, the row would not have claimed anything, and row 2, column 8 would keep its 3.",
          "An [X-wing](/techniques/x-wing/) is this lock stretched over two rows at once. You do not need it on a Not Easy. If claiming is available, the fish is extra machinery.",
        ],
      },
      {
        h: "Same evening as pointing",
        p: [
          "Claiming is the other half of Not Easy. A Not Easy puzzle's hardest step is pointing or claiming, never a pair. I check boxes for pointing first, because I was already in the boxes for hidden singles. Then I read each row and each column for a digit that has collapsed into one box.",
          "NYT Medium always needs pointing or claiming. The archive does not separate the two. Both are the locked-candidate step that Medium never skips. Learn them as a pair of directions. They are the same picture.",
          "After the 2 is placed, go back to singles. The next harder idea on this site is a naked pair, and a pair is the wrong tool while a single is still on the board.",
        ],
      },
    ],
  },
  {
    slug: "naked-pair",
    name: "Naked pair",
    description:
      "Two cells that share two digits and clear them from the rest of the house. Naked pairs are the most common NYT Hard step.",
    level: "Hard",
    play: "hard",
    order: 40,
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
    order: 41,
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
    order: 50,
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
    order: 51,
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
    order: 60,
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
    order: 70,
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
    order: 90,
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
    order: 80,
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
    order: 100,
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
    order: 101,
    related: ["xy-wing", "coloring"],
    when: "XY-chains are Mental, with simple coloring. They are the hardest step this solver uses.",
    nyt: "The NYT archive never needs an XY-chain. Medium stops at pointing, and Hard stops at triples.",
    paragraphs: [
      "An XY-chain is a path of cells that each have two candidates. Each cell shares one candidate with the next cell, and the two cells see each other, so they can't both be that shared digit. The chain starts and ends on the same digit.",
      "One of the ends is that digit. Any other cell that sees both ends loses it. An XY-wing is the short chain: a pivot and two wings. A longer path is the same argument.",
    ],
  },
];

export function techniqueOrderValue(technique, index = 0) {
  return Number.isFinite(technique.order) ? technique.order : 1000 + index;
}

export function orderedTechniques(list = techniques) {
  return list
    .map((technique, index) => ({ technique, index }))
    .sort((a, b) => {
      const delta = techniqueOrderValue(a.technique, a.index) - techniqueOrderValue(b.technique, b.index);
      return delta || a.index - b.index;
    })
    .map((item) => item.technique);
}

export function nextTechnique(technique, list = techniques) {
  const ordered = orderedTechniques(list);
  const index = ordered.findIndex((item) => item.slug === technique.slug);
  if (index < 0 || index + 1 >= ordered.length) return null;
  return ordered[index + 1];
}

export const techniqueOrder = techniques.map((technique) => technique.slug);
