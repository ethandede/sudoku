// Original explanations for the technique pages. Frequencies are the measured
// NYT profile already used by the grader (vivrao9/nyt-sudoku, August 30, 2021 through March 2, 2024,
// 1,483 puzzles). Nothing here invents a rate the archive didn't show.
//
// `order` is the solver's difficulty, lowest first. The techniques index,
// the "next harder" link, and the skill ladder all sort by it, so array
// position does not matter.
// A tenth breaks ties (claiming after pointing, a hidden subset after the
// naked one, XY-chain after coloring). Leave the gaps. A new technique slots
// in by setting `order` and nothing else.
// `example` is optional. Capture wins when it finds a board. Otherwise the
// build checks `example`: unique puzzle, and the stated step at that position.
// A page with neither still builds.
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
    sections: [
      {
        h: "These two sit at opposite ends of the row",
        p: [
          "Row 5, column 2 and row 5, column 9 each hold 2 and 3, and nothing else. They do not share a box. One is in box 4, the other in box 6. They share the row, and that is enough. A naked pair is two cells in the same row, column, or box whose only candidates are the same two digits.",
          "Those cells will be 2 and 3, one way or the other. I cannot tell which cell gets the 2 yet. I do not need to. Both digits are spent, so they come out of every other cell in the row.",
        ],
      },
      {
        h: "Why the rest of the house loses both",
        p: [
          "Suppose the first cell is 2. Then the second is 3. Suppose the first is 3. Then the second is 2. Neither cell has a third candidate, so there is no third story. The house has used its 2 and its 3. Another cell in that house cannot take either digit.",
          "The two cells have to see each other. Two cells that both read 2 and 3, and do not share a row, a column, or a box, are just two cells. They eliminate nothing. I have chased that shape across a puzzle and felt sharp right up until the notes did not change.",
        ],
      },
      {
        h: "Where I look",
        p: [
          "Singles and locked candidates come first. A naked pair on a board that still has a [hidden single](/techniques/hidden-single/) or a [pointing](/techniques/pointing/) means I skipped an easier move. On Hard those easier moves do run out, and then the pair is the one to find.",
        ],
        ol: [
          "Scan one house for cells with exactly two candidates.",
          "Find two of those cells with the same two digits.",
          "Confirm they share that house. A row pair may sit in different boxes. A box pair has to sit inside the box.",
          "Delete both digits from the other cells in the house. Leave the pair cells alone.",
        ],
      },
      {
        demo: true,
        h: "Row 5, the 2 and the 3",
        intro:
          "The highlighted cells are the pair, one at each end of the row. Step through and watch 2 and 3 leave the cells between them.",
      },
      {
        h: "What leaves, and the 7 that appears",
        p: [
          "Row 5 already shows 8 in column 1, 9 in column 3, 1 in column 5, and 5 in column 7. The open cells are column 2 with 2 and 3, column 4 with 3, 4, and 6, column 6 with 2, 4, 6, and 7, column 8 with 2, 3, and 7, and column 9 with 2 and 3.",
          "Row 5, column 2 and row 5, column 9 are the pair. Row 5, column 4 loses its 3 and keeps 4 and 6. Row 5, column 6 loses its 2 and keeps 4, 6, and 7. Row 5, column 8 loses both 2 and 3. It was 2, 3, and 7, so it is left with 7, and the step places 7 in row 5, column 8.",
          "The pair cells stay unsolved. Both still read 2 and 3. The profit is the rest of the row. If you spot the pair and never clear the house, the 7 stays buried under the 2 and the 3.",
        ],
      },
      {
        h: "Pairs that are not this",
        p: [
          "A [hidden pair](/techniques/hidden-pair/) is the same two digits found from the other direction. You notice that the digits have only two homes, and those homes are still wearing extra candidates. You delete the extras from the pair cells. Here the cells are already bare, so you delete the two digits from everyone else. Strip 2 and 3 off the pair cells and you have erased the cells that were supposed to hold them.",
          "A cell with 2 and 3, next to a cell with 2, 3, and 7, is not a naked pair. The second cell can still be 7, so 2 and 3 are not reserved. On this row that second cell is row 5, column 8. It is what the pair cleans, not a member of it.",
          "Three cells whose notes add up to three digits are a naked triple. I look there after the pairs in the house are quiet. Pairs are smaller, and on newspaper Hards they are the move you actually meet.",
        ],
      },
      {
        h: "Hard starts with this",
        p: [
          "Hard puzzles here need a pair or a triple, and at least four steps that are not singles. One naked pair is enough to put a puzzle in Hard. After it fires I sweep singles again. The 7 in row 5, column 8 is a naked single that was not there a moment earlier.",
          "A naked pair is the hardest step on 51% of the 494 NYT Hard puzzles. Nothing in that archive goes past triples. See this often enough and most of what the Times calls Hard comes apart. The Hard grade on this site is built so a pair or a triple really is required.",
        ],
      },
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
    sections: [
      {
        h: "Count the digits, ignore the clutter",
        p: [
          "A hidden pair is two digits that fit in only two cells of one house. Those cells usually carry extra candidates, which is why the pair does not look naked. The digits have nowhere else to go, so they own the two cells, and every other candidate on those cells comes off.",
          "I count them the way I count a hidden single, and I stop at two homes instead of one. On the board below, 4 and 7 each have two homes in row 3, and the homes are the same two cells.",
        ],
      },
      {
        demo: true,
        h: "4 and 7 in a nearly empty row",
        intro:
          "Row 3 has one digit filled and a lot of noise. The highlighted cells are the pair. Step through and the extra marks come off them. Nothing gets placed.",
      },
      {
        h: "The same two cells, twice",
        p: [
          "Row 3, column 1 is filled with 6. Everyone else in the row is open. Row 3, column 2 can be 1, 5, 8, or 9. Row 3, column 3 can be 1, 5, or 8. Row 3, column 4 can be 3 or 9. Row 3, column 5 can be 3, 4, or 7. Row 3, column 6 can be 4, 7, or 9. Row 3, column 7 can be 1, 2, or 8. Row 3, column 8 can be 1, 2, 3, 5, or 8. Row 3, column 9 can be 2, 3, 5, or 8.",
          "The digit 4 shows up in row 3, column 5 and row 3, column 6, and nowhere else in the row. The digit 7 shows up in those same two cells, and nowhere else. That is the pair. They happen to be neighbors, both inside box 2. On a naked pair the cells might sit at opposite ends of the house. Distance is irrelevant. Sharing the house is the rule.",
          "Row 3, column 5 loses its 3 and keeps 4 and 7. Row 3, column 6 loses its 9 and keeps 4 and 7. No digit is placed. A lot of hidden pairs end this way. You cleaned two cells, and the single shows up on a later pass. If you only respect a move that types a number in, you will leave the junk on the cells and stall.",
        ],
      },
      {
        h: "The count, in order",
        ol: [
          "Pick a house whose cells still have three or four candidates. Solved houses do not hide pairs.",
          "For one digit, list every cell in the house that can still hold it.",
          "Find a second digit with exactly those same cells, and no others.",
          "Delete every candidate on those cells that is not one of the two digits.",
        ],
      },
      {
        p: [
          "What you have left is an ordinary [naked pair](/techniques/naked-pair/). In this row, no other cell still holds a 4 or a 7, so that naked pair would have nothing further to delete. The hidden pair was the whole step. I still glance at the box afterward. Cells you just cleaned in a row are also cells in a box, and the box may still be carrying the digits you removed from the row.",
        ],
      },
      {
        h: "People strip the pair off",
        p: [
          "The easy mistake is to play it as a naked pair and remove 4 and 7 from the two cells. Those digits have to stay. The 3 on row 3, column 5 leaves. The 9 on row 3, column 6 leaves. Anything that is not 4 or 7 leaves. Anything that is 4 or 7 stays, even if the cell looked too busy to be a pair.",
          "If the two digits do not land on the same two cells, you do not have a pair. A 4 in three cells, with a 7 in two of them, is a crowded row. I have talked myself into a pair by ignoring the third 4. Count the whole house before you erase anything.",
        ],
      },
      {
        h: "Same shelf as a naked pair",
        p: [
          "Hidden pairs are Hard, the same grade as a naked pair. The puzzle still needs a pair or a triple, and at least four steps that are not singles. I look for naked pairs first, because they are visible. This is the pass for when those are gone and the notes still feel heavier than the board.",
          "A hidden pair is the hardest step on 18% of NYT Hard. Less common than the naked kind, common enough that skipping the count stalls a real puzzle. A triple is rarer. I do not go looking for one while a pair is still sitting in the row.",
        ],
      },
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
    sections: [
      {
        h: "None of the three cells lists every digit",
        p: [
          "I spent a long time waiting for three cells that each said 1, 2, and 6. They almost never do. A naked triple is three cells in one house that use only three digits between them. A cell may hold two of those digits, or all three. You add the cells up. Three digits in the union, three cells, and no fourth digit anywhere in the group.",
          "Row 9 on the board below is the ordinary version. Row 9, column 3 is only 1 and 2. Row 9, column 5 is only 2 and 6. Row 9, column 8 is only 1 and 6. Not one of them lists 1, 2, and 6 together. Together, they use exactly those digits.",
        ],
      },
      {
        h: "Three cells have to absorb three digits",
        p: [
          "Those cells will be filled with 1, 2, and 6, one each. Three seats, three digits, no outsider on any seat. Any other story would need a fourth digit, and none of the cells has one. So the rest of the house loses 1, 2, and 6, wherever those are still written.",
          "You may still not know which cell gets which digit. You are not placing inside the triple unless some later deletion collapses a cell. A [naked pair](/techniques/naked-pair/) is this with two cells and two digits. Four cells and four digits is a quad, and quads are Expert. I mention that so the pattern has a top end. I do not hunt quads from a Hard.",
        ],
      },
      {
        demo: true,
        h: "Row 9, spread out",
        intro:
          "The highlighted cells do not match each other. That is normal. Step through and watch the 6 leave the other cells in the row.",
      },
      {
        h: "Only the 6 has somewhere to leave",
        p: [
          "Row 9, column 4 is 5 and row 9, column 6 is 4. The open cells are row 9, column 1 with 3, 6, 7, and 8, row 9, column 2 with 6, 7, and 9, row 9, column 3 with 1 and 2, row 9, column 5 with 2 and 6, row 9, column 7 with 3 and 6, row 9, column 8 with 1 and 6, and row 9, column 9 with 3, 8, and 9.",
          "The triple is row 9, column 3, row 9, column 5, and row 9, column 8. Their notes are 1 and 2, then 2 and 6, then 1 and 6. The union is 1, 2, and 6. Outside the triple, 1 and 2 are not written on anyone, so only 6 moves. Row 9, column 1 loses 6 and keeps 3, 7, and 8. Row 9, column 2 loses 6 and keeps 7 and 9. Row 9, column 7 was 3 and 6, loses the 6, and keeps 3. The step places 3 in row 9, column 7.",
          "A triple can look like a lot of machinery and then delete one candidate. Take it. The 3 in row 9, column 7 is why the pattern was worth seeing.",
        ],
      },
      {
        h: "The drawing in the book is the rare one",
        p: [
          "The picture most guides draw is three identical cells, each holding 1, 2, and 6. That arrangement is legal. It is also the one I almost never meet. The working ones are mixed: a pair of the digits here, a different pair there, sometimes one cell with all three. A fourth digit on any of the three cells breaks it.",
          "The other miss is deleting inside the triple. Row 9, column 3 keeps 1 and 2. The 6s come off row 9, column 1, row 9, column 2, and row 9, column 7. A [hidden triple](/techniques/hidden-triple/) cleans the other side of the line. Extras come off the pattern cells, and the rest of the house is left where it was.",
        ],
      },
      {
        h: "I still look for pairs first",
        p: [
          "A naked triple is Hard, in the same grade as pairs. Expert is where quads, fish, and wings start. Triples, naked or hidden, are the hardest step on 6% of NYT Hard, and that archive never needs anything past them. Worth knowing. A poor thing to scan for first.",
          "Singles, then pointing and claiming, then both kinds of pair. If the house is still stuck and three cells add up to three digits, take the triple. On this row a lone pair was not enough. The cell with 1 and 2 needed the other two before 6 had a reason to leave row 9, column 7.",
        ],
      },
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
    sections: [
      {
        h: "Column 1 looked like leftovers",
        p: [
          "A hidden triple is three digits that, inside one house, fit in only three cells. The cells are usually covered in other candidates. Those extras are wrong. The three digits have to occupy the three cells, so anything else written there goes.",
          "It is the hidden-pair count with one more digit. I nearly moved on from column 1 below. It looked like a junk drawer. Counting 3, then 5, then 9 showed they all lived in the same three cells.",
        ],
      },
      {
        h: "A digit can skip one of the cells",
        p: [
          "The three digits do not each have to appear in all three cells. One of them can be missing from a cell. The rule is narrower than that: inside this house, none of the three digits appears outside those cells. The cells are reserved. Their other candidates come off.",
          "What remains reads as a naked triple. Sometimes that triple then deletes digits from the rest of the house. Sometimes the rest of the house was already clean, and all you did was fix the notes. I used to demand a placement. The notes were the placement's raw material, one step later.",
        ],
      },
      {
        demo: true,
        h: "3, 5, and 9 in column 1",
        intro:
          "The highlighted cells are the only homes in this column for 3, 5, and 9. Step through. Extra marks leave those cells, and no digit is placed yet.",
      },
      {
        h: "Walking down the column",
        p: [
          "Row 2, column 1 is 1. Row 3, column 1 is 2. The open cells are row 1, column 1 with 5 and 9, row 4, column 1 with 4 and 6, row 5, column 1 with 4, 7, and 8, row 6, column 1 with 6, 7, and 8, row 7, column 1 with 3, 4, 5, and 8, row 8, column 1 with 6 and 8, and row 9, column 1 with 3, 5, 8, and 9.",
          "A 3 can sit in row 7, column 1 and row 9, column 1. A 5 can sit in row 1, column 1, row 7, column 1, and row 9, column 1. A 9 can sit in row 1, column 1 and row 9, column 1. All three digits stay inside row 1, column 1, row 7, column 1, and row 9, column 1. The 9 is not even a candidate on row 7, column 1. It does not need to be.",
          "The extras leave. Row 7, column 1 loses 4 and 8, and keeps 3 and 5. Row 9, column 1 loses 8, and keeps 3, 5, and 9. Row 1, column 1 was already 5 and 9, so it gives nothing up. No new digit is written in. The column is just telling the truth.",
        ],
      },
      {
        h: "Naked triples clean the other side",
        p: [
          "A [naked triple](/techniques/naked-triple/) deletes the pattern digits from the rest of the house. A hidden triple deletes every digit that is not part of the pattern, and it deletes those from the pattern cells. Here, 4 and 8 leave row 7, column 1, and 8 leaves row 9, column 1. I do not go wipe 3, 5, and 9 off row 4, column 1 or row 6, column 1. Those cells never held them.",
          "A fourth home for any of the three digits breaks the triple. If row 5, column 1 had kept a 5, this column would not have one. Check the filled cells and the open ones before erasing. A [hidden pair](/techniques/hidden-pair/) is the same count stopped at two. Four digits locked into four cells is a quad, which this site grades as Expert. Stay with three while you are on a Hard.",
        ],
      },
      {
        h: "Uncommon, and still the same grade",
        p: [
          "Hidden triples sit with naked triples and both pairs. That whole band is Hard. Expert starts when the puzzle asks for a quad, an X-wing, an XY-wing, or a swordfish.",
          "Triples of either kind are the hardest step on 6% of NYT Hard. No puzzle in that archive needs a quad, a fish, or a chain. I learned the triple so a Hard would stop being a wall, and I still run pairs and [pointing](/techniques/pointing/) before I count three digits down a column. Most columns do not have one. This one did.",
        ],
      },
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
    when: "Quads are an Expert technique, with X-wings, XY-wings, and swordfish. A puzzle whose hardest step is a quad is Expert, not Hard.",
    nyt: "Across all 1,483 NYT puzzles in the archive, the solver never needs a quad. Hard stops at triples.",
    sections: [
      {
        h: "Four cells is most of a house",
        p: [
          "A quad is the subset idea at four, and four cells is a lot of a row. That is why I miss them. A naked quad is four cells in one house whose candidates, taken together, are exactly four digits. Those digits leave every other cell in the house. A hidden quad is four digits that fit in only four cells, so every other candidate on those four cells is removed.",
          "The board below is the naked kind, in box 1. The whole elimination is a single digit. Quads often pay that little. I have talked myself out of them for exactly that reason, and then stayed stuck.",
        ],
      },
      {
        h: "They do not each hold all four digits",
        p: [
          "You are not looking for four cells that each list 1, 2, 4, and 5. You are looking at the union. One cell can hold two of the digits. Another can hold all four. A fifth digit on any of them, and it is not a quad.",
          "A hidden quad is the same shape read from the digits. Four digits, four cells, and those digits appear nowhere else in the house. You then strip the extras off the four cells. This example does not need that reading. The four cells are already down to the four digits.",
        ],
      },
      {
        demo: true,
        h: "Box 1 loses its extra 1s",
        intro:
          "Box 1 is the top left. Four cells hold 1, 2, 4, and 5 between them. Step through. The only digit that leaves the rest of the box is 1.",
      },
      {
        h: "The four cells, and the four that give up a 1",
        p: [
          "Row 3, column 2 is filled with 9. Four open cells make the quad. Row 1, column 3 can be 1, 2, or 5. Row 2, column 2 can be 1 or 4. Row 2, column 3 can be 1, 2, 4, or 5. Row 3, column 3 can be 1, 2, or 4. Together that is 1, 2, 4, and 5. Four cells, four digits.",
          "The other open cells still list a 1. Row 1, column 1 can be 1, 3, 7, or 8. Row 1, column 2 can be 1, 3, or 7. Row 2, column 1 can be 1, 6, or 8. Row 3, column 1 can be 1, 6, or 7. Each loses the 1. None of them held a 2, a 4, or a 5, so nothing else moves, and nothing is placed. Four notes get cleaner. The box does not get a new digit.",
        ],
      },
      {
        h: "Waiting for a bigger result",
        p: [
          "I want the quad to solve a cell. This one will not. Leave the 1s in place and the next single stays hidden, and then it is tempting to go hunt an X-wing that is not the obstacle. Delete the small thing.",
          "The other miss is insisting every pattern cell show all four digits. Row 2, column 2 only has 1 and 4, and it still belongs. A [naked triple](/techniques/naked-triple/) is this union with three cells. If that page makes sense, a quad is the same sentence with one more cell. It is easier to overlook because the group is so much of the house.",
        ],
      },
      {
        h: "Expert, and newspapers skip it",
        p: [
          "A puzzle whose hardest step is a quad is Expert here, not Hard. Hard stops at triples. Across all 1,483 NYT puzzles in the archive, the solver never needs a quad. The site will still hand you one. It is the last subset before the fish.",
          "I reach for it after pairs and triples have come up empty, in a house full of notes and short on placements. Four cells using four digits is the tell. A house that is almost full is singles, not a quad.",
        ],
      },
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
    sections: [
      {
        h: "One digit, four corners",
        p: [
          "An X-wing is one digit locked into a rectangle. In the usual drawing, two rows have that digit in only two columns, the same two columns. The digit sits on one diagonal or the other. Either way both columns are spent, so the digit comes off every other cell in those columns.",
          "Turn the picture the other way and you get the board below. Two columns each hold the digit in the same two rows, and the rest of those rows loses it. [Pointing](/techniques/pointing/) and [claiming](/techniques/claiming/) are this lock inside a single box. An X-wing is the lock spread across two lines that do not share a box.",
        ],
      },
      {
        demo: true,
        h: "Columns 1 and 9, the digit 8",
        intro:
          "Each of those columns has an 8 in row 6 and row 9, and nowhere else. Step through. The 8s that leave are in those rows, off the four corners.",
      },
      {
        h: "The corners are allowed to be messy",
        p: [
          "Column 1 can still be 8 in row 6, column 1 and in row 9, column 1. Nowhere else in the column. Column 9 can still be 8 in row 6, column 9 and in row 9, column 9. Same two rows. That is the rectangle.",
          "The corners are not bare pairs. Row 6, column 1 can be 6, 7, or 8. Row 9, column 1 can be 3, 6, 7, or 8. Row 6, column 9 can be 3, 7, or 8. Row 9, column 9 can be 3, 8, or 9. Follow the 8 and ignore the other candidates. An X-wing does not need the cells to be naked.",
          "Try one diagonal. Put the 8 in row 6, column 1. Row 6 is then done with 8s, so row 6, column 9 is not 8, and column 9's 8 has to be row 9, column 9. The other diagonal is row 6, column 9 with row 9, column 1. Either diagonal covers both columns inside those two rows. That is why an 8 in row 6, column 7 is impossible on both stories, and the same for the extra 8s along row 9.",
          "So 8 leaves the rest of row 6 and row 9. Row 6, column 7 loses 8. Row 9, column 2 loses 8. Row 9, column 7 loses 8. Row 9, column 8 loses 8. Nothing is placed. Four notes, cleaned. That is a finished X-wing.",
        ],
      },
      {
        h: "A short scan",
        ol: [
          "Pick a digit that is already scarce.",
          "Find a row or a column where that digit has exactly two homes.",
          "Find a parallel line whose two homes hit the same two crossing lines.",
          "Delete the digit from those crossing lines, outside the two base lines.",
        ],
      },
      {
        p: [
          "Start from columns and you clear rows. Start from rows and you clear columns. I still clear the wrong side sometimes. Here the base is column 1 and column 9, so the deletions sit in row 6 and row 9. Taking an 8 off some other cell of column 1 would be deleting the rectangle you just found.",
        ],
      },
      {
        h: "Smaller locks come first",
        p: [
          "Two 8s in one box, clearing the rest of a line, are pointing or claiming. Take that before you build a rectangle. An X-wing is what you have when each line still has two homes and no single box owns both of them.",
          "A swordfish is the same fish on three lines. The solver ranks an [XY-wing](/techniques/xy-wing/) between this and the swordfish, so the rectangle does not lead straight to three rows. All 1,483 archived NYT puzzles stop at triples. They never need an X-wing. On this site it is Expert. Not Easy and Hard are not allowed to require one.",
        ],
      },
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
    when: "Swordfish is Expert. The solver ranks it after the XY-wing. Mental is coloring and XY-chains.",
    nyt: "No puzzle in the NYT archive needs a swordfish. Expert is where this site asks for fish at all.",
    sections: [
      {
        h: "The rectangle has holes",
        p: [
          "A swordfish is an X-wing on three lines. A digit is limited to the same three columns across three rows, or the same three rows across three columns. On this board it is rows. Rows 1, 6, and 7 keep every 7 they have inside columns 4, 7, and 9.",
          "The grid is not full. Row 6 has no 7 in column 4. Row 7 has no 7 in column 7. Each of those rows uses two or three of the columns, and together they use exactly three. That still locks the digit. I used to wait for a neat block of 7s, and I missed every swordfish that showed up.",
        ],
      },
      {
        h: "Why a missing corner still counts",
        p: [
          "The 7 in row 1 has to be in column 4, 7, or 9. The 7 in row 6 has to be in column 7 or 9. The 7 in row 7 has to be in column 4 or 9. None of those rows can put a 7 anywhere else. Place them however you like and columns 4, 7, and 9 are the only seats those rows have. A 7 in one of those columns, outside the three rows, would steal a seat the rows still need.",
          "Run it from columns and you clear three rows instead. Same picture on its side. I learned the row version here, then went looking for the column version on purpose so I would not only see the one I had memorized.",
        ],
      },
      {
        demo: true,
        h: "Rows 1, 6, and 7",
        intro:
          "Two of the rows are missing a column, and the pattern still holds. Step through. One 7 leaves column 7 and one 7 leaves column 9, both outside the three rows.",
      },
      {
        h: "The 7s that are actually there",
        p: [
          "Row 1 can be 7 in row 1, column 4 (candidates 2, 3, and 7), row 1, column 7 (3 and 7), and row 1, column 9 (2, 3, 7, and 8). Row 6 can be 7 in row 6, column 7 (1 and 7) and row 6, column 9 (1 and 7). Row 7 can be 7 in row 7, column 4 (3 and 7) and row 7, column 9 (3 and 7).",
          "The columns in play are 4, 7, and 9. Outside the three rows, row 8, column 7 still lists 1, 3, and 7, and the 7 leaves. Row 3, column 9 lists 2, 3, and 7, and the 7 leaves. Column 4 had no stray 7, so it deletes nothing. Nothing is placed. Two candidates, on a pattern that looked unfinished. That is a normal swordfish.",
        ],
      },
      {
        h: "A fourth column breaks it",
        p: [
          "Requiring every base row to hold the digit in every cover column will make you reject this board. Row 6, column 4 is not a 7. Row 7, column 7 is not a 7. It is still a swordfish. What you cannot allow is a fourth column. One extra 7 in row 6, somewhere else, and the three rows no longer cover exactly three columns.",
          "An [X-wing](/techniques/x-wing/) is the two-line version, and it is easier to see. I look for rectangles before I look for three rows. A lot of near-swordfish are an X-wing I did not finish, or a pointing pair in one box. Those delete the same kind of candidate with less to track.",
        ],
      },
      {
        h: "The wing comes first, on this site",
        p: [
          "Swordfish is Expert. The solver ranks it after the XY-wing and before coloring. On this site the next page is the [unique rectangle](/techniques/unique-rectangle/). Calling swordfish the step right after an X-wing skips the wings, and on the puzzles this site generates a wing shows up more often. I still think of swordfish as the bigger fish. I do not reach for it first.",
          "No puzzle in the NYT archive needs one. Expert is where this site asks for fish at all. If three rows of one digit are in the way and there is no X-wing, count the columns. Two or three per row, three columns in total, and you have it.",
        ],
      },
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
    related: ["xyz-wing", "w-wing", "xy-chain", "naked-pair"],
    when: "XY-wings are Expert. A puzzle that needs one is past pairs, triples, and quads.",
    nyt: "XY-wings do not appear in the 1,483 NYT puzzles. That set never goes beyond triples.",
    sections: [
      {
        h: "Three cells, two digits each",
        p: [
          "An XY-wing is three cells with exactly two candidates each. One of them, the pivot, can see the other two. Those are the wings. The wings do not have to see each other. On this board, they don't.",
          "The pivot is row 7, column 5, and it can be 6 or 9. One wing is row 4, column 5, up the same column, and it can be 8 or 9. The other wing is row 8, column 6, in the same box as the pivot, and it can be 6 or 8. The pivot shares 9 with the upper wing and 6 with the lower one. The two wings share 8.",
        ],
      },
      {
        h: "Whichever way the pivot goes, a wing is 8",
        p: [
          "If the pivot is 9, row 4, column 5 cannot be 9, so that wing is 8. If the pivot is 6, row 8, column 6 cannot be 6, so that wing is 8. The pivot has no third candidate. One wing or the other is 8. A cell that sees both wings cannot be 8, because it would see whichever wing the pivot forced.",
          "You never learn which wing it was. The 8 is simply banned from the overlap. The pivot stays 6 or 9.",
        ],
      },
      {
        demo: true,
        h: "The cell that sees the other two",
        intro:
          "Row 7, column 5 is the pivot. It sees both highlighted wings, and the wings do not see each other. Step through. Every cell that sees both wings loses 8, and one of those cells becomes 9.",
      },
      {
        h: "Two different cells pay the price",
        p: [
          "Row 4, column 6 can be 8 or 9. It sees row 4, column 5 along the row, and it sees row 8, column 6 down column 6. It loses 8 and keeps 9. The step places 9 in row 4, column 6.",
          "Row 8, column 5 can be 4, 6, or 8. It sees row 4, column 5 up the column, and it sees row 8, column 6 along the row. It loses 8 and keeps 4 and 6. Same wing, and this cell does not get solved.",
          "The pivot and the lower wing share box 8. The upper wing is in box 5. No single house holds all three, so this is not a pair and not a triple. Searching one row for it will miss the pattern.",
        ],
      },
      {
        h: "I used to require the wings to touch",
        p: [
          "Row 4, column 5 and row 8, column 6 are different rows, different columns, and different boxes. They do not see each other. I used to throw the pattern out over that. The pivot is the cell that has to see both wings. The wings only have to share the third digit, here an 8.",
          "A cell with three candidates is not a pivot either. Row 8, column 5 holds 4, 6, and 8, and it sees both wings, and it is the cell that gets cleaned. It is not in the wing. Every member has two candidates, exactly. If two cells in one house are a [naked pair](/techniques/naked-pair/), take the pair. Linking cells across boxes is what you do after that.",
        ],
      },
      {
        h: "Shorter than the chain",
        p: [
          "XY-wings are Expert. A puzzle that needs one is past pairs, triples, and quads. None of the 1,483 NYT puzzles has one. That set stops at triples. On this site the wing sits between the X-wing and the swordfish. People who learned fish as one ladder find that order odd. It is the order the solver uses.",
          "An [XY-chain](/techniques/xy-chain/) is the same argument with more cells. When the three bivalue cells are already there, do the wing. I start looking once singles, locked candidates, and pairs are done, and a two-digit cell is touching two other two-digit cells.",
        ],
      },
    ],
  },
  {
    slug: "skyscraper",
    name: "Skyscraper",
    description:
      "Two rows or columns of one digit, joined at one end. Skyscrapers on Expert puzzles.",
    level: "Expert",
    play: "expert",
    order: 72,
    related: ["x-wing", "two-string-kite"],
    when: "Skyscrapers are Expert. They sit with the fish and the wings, and a puzzle that needs one is not Mental.",
    nyt: "The 1,483 archived NYT puzzles never need a skyscraper. Their hardest steps stop at triples.",
    sections: [
      {
        h: "The fourth corner slid over",
        p: [
          "A skyscraper is two strong links on one digit that share one end and miss the other. On this board the digit is 5. Row 3 holds a 5 in exactly two cells, and row 8 holds a 5 in exactly two cells. Both rows use column 3. The other two cells, the roof, sit in column 7 and column 9. They do not line up.",
          "An [X-wing](/techniques/x-wing/) would have wanted those free ends in the same column. They refused. The rectangle is still there if you let one corner wander, and the digit still has to live on that roof.",
        ],
      },
      {
        h: "Why one roof cell is 5",
        p: [
          "Column 3 can take the 5 only once. Row 3, column 3 and row 8, column 3 cannot both be 5, so at least one roof cell is the digit. If row 3, column 3 is not 5, then row 3, column 7 is 5. If row 8, column 3 is not 5, then row 8, column 9 is 5. The two base cells cannot fail together. One of the roofs has the 5, and a cell that sees both roofs sees it.",
          "Turn the picture onto columns and the roof runs sideways. Two columns share a row, and the free ends sit in different rows. Same argument. I still find the row version first, and the column version only after I have talked myself out of a rectangle.",
        ],
      },
      {
        h: "What I actually scan",
        ol: [
          "Pick a digit that is down to two cells in a row, or in a column.",
          "Find a parallel line with two cells of that digit, sharing exactly one crossing line.",
          "The other two cells are the roof. If they share a crossing line as well, stop. That is an X-wing, and it clears a whole line.",
          "Any other cell that sees both roof cells loses the digit. The four pattern cells keep it.",
        ],
      },
      {
        demo: true,
        h: "Rows 3 and 8, the digit 5",
        intro:
          "Each of those rows has two 5s, and column 3 is the end that lines up. Step through. The 5 leaves two cells that see both roofs, and one of those cells becomes 1.",
      },
      {
        h: "The four cells, then the two that pay",
        p: [
          "Row 3 is nearly placed. Row 3, column 1 is 3. Row 3, column 2 is 9. Row 3, column 4 is 2, row 3, column 5 is 4, row 3, column 8 is 6, and row 3, column 9 is 8. Three cells are still open. Row 3, column 3 can be 5 or 7. Row 3, column 6 can be 1 or 7, and it has no 5. Row 3, column 7 can be 1 or 5. Two homes: column 3 and column 7.",
          "Row 8, column 1 is 1. Row 8, column 4 is 4 and row 8, column 7 is 9. The other open cells are row 8, column 2 (2, 7, or 8), row 8, column 5 (3 or 6), row 8, column 6 (3 or 6), and row 8, column 8 (2 or 8). None of them lists a 5. The 5s are row 8, column 3 (2, 5, or 7) and row 8, column 9 (2, 5, or 7).",
          "The base is column 3. The roof is row 3, column 7 and row 8, column 9. Row 2, column 9 can be 1, 3, or 5. It shares box 3 with row 3, column 7, and it shares column 9 with row 8, column 9. The 5 leaves. 1 and 3 stay, and the cell is not solved.",
          "Row 7, column 7 can be 1 or 5. It shares column 7 with row 3, column 7, and it shares box 9 with row 8, column 9. The 5 leaves, and 1 is the only mark left. The step places 1 in row 7, column 7.",
        ],
      },
      {
        h: "One roof is a near miss",
        p: [
          "The look-alike is the X-wing you almost had. Both free ends in one column, and you clear that column. Here column 7 and column 9 are different, so the deletion is not a whole line. Row 7, column 9 still lists 1, 4, and 5. It sees row 8, column 9, and it does not see row 3, column 7. One roof is not enough. The 5 stays.",
          "The other miss is cleaning the base. Row 2, column 3 still lists 2, 5, and 6. It sits in the shared column, beside the pattern, and it does not see both roofs. I have deleted that 5 because the column looked used. The column is why the roofs work. The digit leaves the cells that see the roof, and the base cells keep their candidates.",
        ],
      },
      {
        h: "Just after the rectangle",
        p: [
          "Skyscrapers are Expert. On this site they sit after the X-wing and before the [two-string kite](/techniques/two-string-kite/). A puzzle that needs one is not Mental. The 1,483 archived NYT puzzles never need a skyscraper. Their hardest steps stop at triples.",
          "I look for the rectangle first. When the fourth corner has slid into the next column, and each line really has only two cells, this is the step. A pointing pair inside one box is still cheaper when it is on the board. I take that before I go hunting roofs.",
        ],
      },
    ],
  },
  {
    slug: "two-string-kite",
    name: "Two-string kite",
    description:
      "A row and a column each hold one digit twice, tied together in a box. Two-string kites on Expert.",
    level: "Expert",
    play: "expert",
    order: 74,
    related: ["skyscraper", "x-wing"],
    when: "Two-string kites are Expert, with skyscrapers and wings. Mental is still reserved for coloring and XY-chains.",
    nyt: "No puzzle in the NYT archive needs a two-string kite. That set never goes beyond triples.",
    sections: [
      {
        h: "A row and a column, tied in one box",
        p: [
          "A two-string kite is one digit with two strong links that are not parallel. A row has the digit in exactly two cells. A column has it in exactly two other cells. One cell from the row and one from the column sit in the same box, and that box is the knot. The other two cells are the ends. One of those ends is the digit. A cell that sees both ends loses it.",
          "On this board the digit is 8. Row 5 holds it in row 5, column 5 and row 5, column 7. Column 8 holds it in row 2, column 8 and row 6, column 8. Row 5, column 7 and row 6, column 8 are both in box 6. The ends are row 5, column 5 and row 2, column 8. The name is a lot of string for two lines and a box. The picture is simpler than the name.",
        ],
      },
      {
        h: "The houses, before the story",
        p: [
          "Row 5 is mostly filled. Row 5, column 1 is 3, row 5, column 3 is 4, row 5, column 4 is 7, row 5, column 8 is 6, and row 5, column 9 is 5. Row 5, column 2 can be 1 or 9. Row 5, column 6 can be 1 or 2. Neither lists an 8. The two homes are row 5, column 5, which can be 2, 8, or 9, and row 5, column 7, which can be 2 or 8.",
          "Column 8 is the other string. Row 1, column 8 is 3. Row 4, column 8 is 4, row 5, column 8 is 6, and row 8, column 8 is 1. Row 3, column 8 can be 2 or 7. Row 7, column 8 and row 9, column 8 can each be 5 or 9. The only 8s left in the column are row 2, column 8 (2, 7, or 8) and row 6, column 8 (2 or 8).",
        ],
      },
      {
        h: "Why one end has to be 8",
        p: [
          "A box holds 8 once, so the two links cannot both put their 8 in box 6. If row 5, column 7 is 8, then row 6, column 8 is not, and column 8's 8 is row 2, column 8. If row 6, column 8 is 8, then row 5, column 7 is not, and row 5's 8 is row 5, column 5. One of the ends is 8. You never learn which.",
          "Row 2, column 5 can be 2, 4, 6, 7, or 8. It shares row 2 with row 2, column 8, and it shares column 5 with row 5, column 5. Both ends. The 8 leaves. 2, 4, 6, and 7 stay. The step places nothing. A kite that only cleans one note is still a kite. I used to wait for a placement and miss the move.",
        ],
      },
      {
        demo: true,
        h: "Row 5 meets column 8",
        intro:
          "The two 8s in the row and the two 8s in the column meet in box 6. Step through. One 8 leaves the cell that sees both ends.",
      },
      {
        h: "Parallel lines are a different fish",
        p: [
          "A [skyscraper](/techniques/skyscraper/) uses two rows, or two columns. This uses one of each. If I catch myself checking whether the free ends share a column, I am still on the fish. The tie here is box 6, and the lines cross.",
          "The deletion sits on the ends, not on the two cells that share the box. Row 5, column 7 and row 6, column 8 are the knot. They keep their 8s. Rubbing the 8 off either of them throws the link away.",
          "A cell has to see both ends. Row 2, column 7 can be 1, 2, or 8. It sees row 2, column 8 along the row, and it does not see row 5, column 5. The 8 stays. One end is the near miss I still make, on a cell that shares a row with one end and nothing with the other. If it misses the second end, it is not this move.",
        ],
      },
      {
        h: "Expert, between the skyscraper and the wing",
        p: [
          "Two-string kites are Expert. They sit after the skyscraper and before the [XY-wing](/techniques/xy-wing/). Mental is still reserved for coloring and XY-chains. No puzzle in the NYT archive needs a two-string kite. That set never goes beyond triples.",
          "I reach for it when one digit has a two-cell row and a two-cell column, and one cell from each falls in the same box. An [X-wing](/techniques/x-wing/) is the simpler fish when the two lines are parallel and the ends line up. I take that first, then the skyscraper, and the kite is what is left when the links refuse to be parallel.",
        ],
      },
    ],
  },
  {
    slug: "xyz-wing",
    name: "XYZ-wing",
    description:
      "An XY-wing whose pivot carries one extra digit. XYZ-wings on Expert puzzles.",
    level: "Expert",
    play: "expert",
    order: 82,
    related: ["xy-wing", "naked-triple"],
    when: "XYZ-wings are Expert. They are the next step after an XY-wing, and they stay short of coloring and XY-chains.",
    nyt: "XYZ-wings do not appear in the 1,483 NYT puzzles. Hard stops at triples.",
    sections: [
      {
        h: "The pivot kept a third digit",
        p: [
          "An XYZ-wing is three cells. The pivot has three candidates. Each wing has two, and each wing uses a different pair drawn from the pivot. Both wings see the pivot. They do not have to see each other.",
          "An [XY-wing](/techniques/xy-wing/) is that same shape with only two candidates on the pivot. Here the pivot is row 5, column 1, and it can be 1, 3, or 5. One wing is row 4, column 2, in the same box, and it can be 3 or 5. The other wing is row 8, column 1, down the column, and it can be 1 or 3. The wings share 3. The pivot can be 3 as well. That extra seat is the whole technique.",
        ],
      },
      {
        h: "Every story puts a 3 in the pattern",
        p: [
          "If the pivot is 1, row 8, column 1 cannot be 1, so that wing is 3. If the pivot is 5, row 4, column 2 cannot be 5, so that wing is 3. If the pivot is 3, the digit is already in row 5, column 1. The 3 lives in the pivot or in a wing. A cell that sees all three cannot be 3.",
          "On an XY-wing the pivot cannot hold the digit the wings share, so the victim only has to see the wings. Here the pivot is allowed to be 3. A cell that misses the pivot can still be 3, on the story where the pivot takes it. I learned that by deleting the 3 and then watching the pivot want it.",
        ],
      },
      {
        demo: true,
        h: "Three cells, and the middle one is busier",
        intro:
          "Row 5, column 1 is the pivot. It sees both wings, and the wings do not see each other. Step through. The 3 leaves the one cell that can see all three.",
      },
      {
        h: "Who sees whom on this board",
        p: [
          "Row 4, column 2 sits in box 4 with the pivot. Row 5, column 2 is 2 and row 5, column 3 is 9, so the link is the box. Row 8, column 1 shares column 1 with row 5, column 1. Row 6, column 1 is already 8 and row 7, column 1 is 9, which is why the second wing is down in row 8 rather than next door.",
          "Row 4, column 2 and row 8, column 1 are different rows, different columns, and different boxes. Box 4 and box 7. They do not see each other. The pivot is the cell that has to see both, and it does.",
          "Row 4, column 1 can be 1, 3, 4, or 5. It sees row 5, column 1 down column 1 and inside box 4. It sees row 4, column 2 along the row. It sees row 8, column 1 down the same column. All three. The 3 leaves. 1, 4, and 5 stay. Nothing is placed.",
        ],
      },
      {
        h: "The cell that only sees the wings",
        p: [
          "Row 8, column 2 can be 3 or 8. It sees row 8, column 1 along the row, and it sees row 4, column 2 down column 2. Both wings. It does not see row 5, column 1. The pivot can still be 3, so row 8, column 2 keeps the 3. That is the XY-wing deletion on the wrong pattern. I have crossed it off, and then put it back.",
          "A [naked triple](/techniques/naked-triple/) needs the three pattern cells in one house. These three are split. Row 8, column 1 is in box 7, and row 5, column 1 and row 4, column 2 are in box 4. The candidates together are 1, 3, and 5, which looks tidy on a list. The houses are what make it a wing.",
        ],
      },
      {
        h: "One step past the shorter wing",
        p: [
          "XYZ-wings are Expert. The next page is the [W-wing](/techniques/w-wing/), and the swordfish comes after that. They stay short of coloring and XY-chains. XYZ-wings do not appear in the 1,483 NYT puzzles. Hard stops at triples.",
          "I look for one when a two-digit cell is touching a three-digit cell, and a second two-digit cell takes the pair that is left. Two candidates on the pivot means the shorter wing, and that page is the one to use. Three candidates on the pivot means the victim has to see all three cells, pivot included.",
        ],
      },
    ],
  },
  {
    slug: "w-wing",
    name: "W-wing",
    description:
      "Two matching pairs joined by a strong link. W-wings on Expert puzzles.",
    level: "Expert",
    play: "expert",
    order: 84,
    related: ["xy-wing", "xyz-wing"],
    when: "W-wings are Expert. They sit with the other wings, after an XYZ-wing and before a swordfish.",
    nyt: "The 1,483 archived NYT puzzles never need a W-wing. Their hardest steps stop at triples.",
    sections: [
      {
        h: "Two cells that never meet",
        p: [
          "A W-wing is two cells with the same two candidates. They do not see each other. A strong link on one of those digits joins them: some house holds that digit in exactly two cells, and each wing sees a different end of that link. At least one wing is the other digit. A cell that sees both wings loses it.",
          "On this board the wings are row 2, column 2 and row 6, column 9. Both can be 4 or 5. Different rows, different columns, different boxes. Row 2, column 2 is in box 1. Row 6, column 9 is in box 6. Nothing in the pattern makes them look at each other. Draw the link between them and you get a lopsided W. I still have to count the cells before I trust the drawing.",
        ],
      },
      {
        h: "The link is a 5 with two homes",
        p: [
          "The shared digit that does the joining is 5, not 4. Row 5 holds 5 in exactly two cells: row 5, column 2 and row 5, column 9. Both can be 5 or 7. The rest of row 5 is filled, so the 5 has nowhere else in the row to go. One of those two cells is 5.",
          "Each wing sees one end and misses the other. Row 2, column 2 sees row 5, column 2 down column 2, and it does not see row 5, column 9. Row 6, column 9 sees row 5, column 9 up column 9, and it does not see row 5, column 2. That crossing is the wing. Column 2 is not the link. Its only 5s are the wing in row 2, column 2 and the link end in row 5, column 2. Row 2 still has more than two 5s. Row 2, column 3 lists 2, 4, 5, and 9, and row 2, column 7 lists 2, 3, 4, and 9.",
        ],
      },
      {
        h: "One of the wings is 4",
        p: [
          "If row 5, column 2 is 5, then row 2, column 2 cannot be 5, so that wing is 4. If row 5, column 9 is 5, then row 6, column 9 cannot be 5, so that wing is 4. The row cannot put its 5 in both ends. One story or the other, a wing is 4. You do not learn which wing. A cell that sees both of them cannot be 4.",
          "Row 5, column 2 and row 5, column 9 are also a naked pair, 5 and 7. The pair is idle. Every other cell in the row is already filled, so there is nothing for 5 or 7 to leave. The W-wing uses those two cells as a link, not as a cleanup.",
        ],
      },
      {
        demo: true,
        h: "The 4 that sees both wings",
        intro:
          "Row 2, column 2 and row 6, column 9 are the wings. Row 5 ties them with a 5. Step through. One 4 leaves, and that cell becomes 2.",
      },
      {
        h: "What the cells actually hold",
        p: [
          "Row 2, column 1 is 1. Row 2, column 4 is 6, row 2, column 5 is 8, and row 2, column 6 is 7. Row 2, column 2 can be 4 or 5. Row 6 is the other wing's row. Row 6, column 1 is 3, row 6, column 2 is 2, row 6, column 3 is 8, row 6, column 5 is 1, and row 6, column 6 is 6. Row 6, column 9 can be 4 or 5. Same two digits, and the cells do not see each other.",
          "Row 2, column 9 can be 2 or 4. It shares row 2 with row 2, column 2, and it shares column 9 with row 6, column 9. Both wings. The 4 leaves. 2 is all that remains, so the step places 2 in row 2, column 9.",
        ],
      },
      {
        h: "One wing is a near miss",
        p: [
          "Row 2, column 3 can be 2, 4, 5, or 9. It sees row 2, column 2, in the row and in box 1. It does not see row 6, column 9. The 4 stays. I have deleted that 4 because it sat next to a wing. One wing is not the pattern.",
          "An [XY-wing](/techniques/xy-wing/) needs a pivot that sees both wings and carries a different pair for each of them. Nothing here is that pivot. Row 5, column 2 sees only one wing, and its candidates are 5 and 7, not a pair drawn from 4 and 5. A [naked pair](/techniques/naked-pair/) would need the two wings in one house. They are not in one house. If they could see each other, this would be a pair and I would take the pair.",
        ],
      },
      {
        h: "Between the XYZ-wing and the fish",
        p: [
          "W-wings are Expert. They sit after the [XYZ-wing](/techniques/xyz-wing/) and before the [swordfish](/techniques/swordfish/). A puzzle that needs one is not Mental. The 1,483 archived NYT puzzles never need a W-wing. Their hardest steps stop at triples.",
          "I look for two matching two-digit cells that do not touch, then for a digit of theirs that has exactly two homes in a house, with each cell seeing one home. If the strong link is not there, the two cells are just two cells. The link is the whole trick.",
        ],
      },
    ],
  },
  {
    slug: "unique-rectangle",
    name: "Unique rectangle",
    description:
      "Three corners of a rectangle hold two digits, so those digits leave the fourth. Unique rectangles on Expert puzzles.",
    level: "Expert",
    play: "expert",
    order: 92,
    related: ["swordfish", "xy-wing"],
    when: "Unique rectangles are Expert. They come after the swordfish and before coloring.",
    nyt: "The 1,483 archived NYT puzzles never need a unique rectangle. Their hardest steps stop at triples.",
    sections: [
      {
        h: "Four corners and a swap",
        p: [
          "A unique rectangle, the kind on this page, is four cells in two rows, two columns, and two boxes. The digits in the corners are the same two. Type 1 is the version where three corners hold exactly those two digits, and the fourth holds those two plus something else. The two digits come off the fourth corner.",
          "On this board the digits are 5 and 8. The rectangle is row 1 and row 3, column 6 and column 7. That is two boxes: box 2 holds the column 6 corners, and box 3 holds the column 7 corners. Three corners are clean. Row 1, column 7 can be 5 or 8. Row 3, column 6 can be 5 or 8. Row 3, column 7 can be 5 or 8. The fourth corner is row 1, column 6, and it can be 5, 8, or 9.",
        ],
      },
      {
        h: "Why the fourth corner cannot be 5 or 8",
        p: [
          "Suppose row 1, column 6 were only 5 or 8, like the other three. Then the rectangle could flip. One solution puts 5 in row 1, column 6 and row 3, column 7, and 8 in row 1, column 7 and row 3, column 6. The other solution swaps them. Each of those two rows, two columns, and two boxes still holds one 5 and one 8. No other cell in the grid can tell the two arrangements apart. The puzzle would have two solutions.",
          "The row does not forbid a 5 in row 1, column 6. The column does not forbid an 8 there either. Both digits are still legal in the houses. What removes them is a fact the pencil marks do not show: this puzzle has one solution. The 5 and the 8 leave row 1, column 6. The 9 stays, and the step places 9 there.",
        ],
      },
      {
        h: "The assumption, said plainly",
        p: [
          "This is the move I trust least, and I still use it. It is a real deduction. It rests on the promise that the grid was built with a single solution. A newspaper puzzle, and every puzzle this site generates, comes with that promise. The solver checks it before it will take the rectangle. If the check finds a second solution, the rectangle is skipped and the two digits stay.",
          "If you typed a grid in by hand and never confirmed it has one solution, do not strip this corner. You might be deleting the digit that belongs to the other filling. I have done that on a mistyped puzzle and then spent the evening sure the logic was broken. The logic was fine. The puzzle was not a puzzle.",
        ],
      },
      {
        demo: true,
        h: "Three clean corners, one busy one",
        intro:
          "Row 1, column 6 is the corner with an extra 9. The other three corners are only 5 and 8. Step through. Both of those digits leave, and the cell becomes 9.",
      },
      {
        h: "The four cells on this board",
        p: [
          "Row 1, column 4 is 2 and row 1, column 8 is 7. Row 1, column 3 is 4. Row 1, column 9 is 3. The top edge of the rectangle is still open: row 1, column 6 can be 5, 8, or 9, and row 1, column 7 can be 5 or 8.",
          "Row 3 is almost full. Row 3, column 1 is 3, row 3, column 2 is 9, row 3, column 3 is 7, and row 3, column 5 is 4. Row 3, column 9 is 2. The two open corners are row 3, column 6 and row 3, column 7, each 5 or 8.",
          "Three corners, exactly 5 and 8. The fourth, row 1, column 6, adds a 9. The 5 leaves and the 8 leaves. The step places 9 in row 1, column 6. The three clean corners keep both digits. Clearing 5 off row 1, column 7 would throw away a corner the argument needs.",
        ],
      },
      {
        h: "Type 1, and the rectangles that are not it",
        p: [
          "Type 1 is this shape: three corners naked on the two digits, one corner with extras, and the extras are what remain. If two corners are busy, the swap is no longer free and this elimination is the wrong one. Other types move the deletion onto a different cell. This solver does not do those. Two busy corners, and I leave the rectangle alone.",
          "An [X-wing](/techniques/x-wing/) is a rectangle of one digit. These corners hold two digits, and the only cell that loses anything is the busy corner. A rectangle stuck inside one box is a different picture too. Here column 6 is in box 2 and column 7 is in box 3. The two boxes are required.",
        ],
      },
      {
        h: "After the swordfish",
        p: [
          "Unique rectangles are Expert. They come after the [swordfish](/techniques/swordfish/). The next page is [BUG+1](/techniques/bug-plus-one/). The 1,483 archived NYT puzzles never need one. Their hardest steps stop at triples. Expert is where this site will hand you the rectangle.",
          "I look for two rows and two columns whose four crossings use two boxes, then I count candidates. Three corners on the same two digits, and a fourth that still carries them, is Type 1. Then I remember why the digits leave. One solution was promised. That is the whole move.",
        ],
      },
    ],
  },
  {
    slug: "bug-plus-one",
    name: "BUG+1",
    description:
      "One cell has three candidates and every other empty cell has two. BUG+1 on Expert puzzles.",
    level: "Expert",
    play: "expert",
    order: 94,
    related: ["unique-rectangle", "coloring"],
    when: "BUG+1 is Expert. It comes after the unique rectangle and before coloring.",
    nyt: "The 1,483 archived NYT puzzles never need BUG+1. Their hardest steps stop at triples.",
    sections: [
      {
        h: "One extra candidate, and a grave around it",
        p: [
          "BUG+1 shows up when the notes are almost a grave. Every empty cell has two candidates, except one cell that has three. In each house, each digit is a candidate twice, or not at all, except one digit that appears three times. That digit sits in the busy cell.",
          "On this board the busy cell is row 8, column 4. It can be 2, 7, or 9. The other 21 empty cells hold two candidates each. Take the 9 off row 8, column 4 and what is left is a Bivalue Universal Grave: pairs everywhere, each digit twice in its houses. A grave can be filled two ways. The name is a lot of words for a grid that forgot to have one answer.",
        ],
      },
      {
        h: "Why 9 stays and 2 and 7 leave",
        p: [
          "The digit that appears three times is the one that belongs in the busy cell. Delete it and you are back in the grave, with two solutions. Keep it, and the other two candidates in that cell are what made the third seat. They leave.",
          "Row 8 holds 9 in three cells. Row 8, column 4 can be 2, 7, or 9. Row 8, column 5 can be 7 or 9. Row 8, column 6 can be 2 or 9. Column 4 holds 9 in row 2, column 4 (6 or 9), row 6, column 4 (8 or 9), and row 8, column 4. The box is rows 7 to 9 and columns 4 to 6. Its 9s are those same three from the row. Row 7 and row 9 have no 9 left in the box. 2 appears twice in the row, twice in the column, and twice in the box. So does 7. 9 is the one that showed up three times.",
        ],
      },
      {
        h: "One solution does the deleting",
        p: [
          "This is the same promise as a [unique rectangle](/techniques/unique-rectangle/), spread over the whole grid instead of four cells. It is a real deduction. It rests on the puzzle having one solution. A newspaper puzzle, and every puzzle this site generates, comes with that promise. The solver checks before it will take BUG+1. If the check finds a second solution, the 2 and the 7 stay in row 8, column 4.",
          "If you typed a grid in by hand and never confirmed it has one solution, do not strip this cell. You might be deleting a digit that belongs to the other filling. I have done that, then stared at a contradiction the logic did not cause. The grid was not a puzzle.",
        ],
      },
      {
        demo: true,
        h: "The cell that kept a third digit",
        intro:
          "Row 8, column 4 is the only cell with three candidates. Step through. 2 and 7 leave, and the cell becomes 9.",
      },
      {
        h: "The row is a triple that deletes nothing",
        p: [
          "Row 8, column 1 is 8. Row 8, column 2 is 5 and row 8, column 3 is 1. Row 8, column 7 is 3, row 8, column 8 is 6, and row 8, column 9 is 4. Three cells are still open, and they are the three already counted.",
          "Row 8, column 4, row 8, column 5, and row 8, column 6 use only 2, 7, and 9. That is a naked triple, and the rest of the row is filled, so the triple has nowhere to delete. It also cannot tell you which of the three cells is 9. BUG+1 can. 2 leaves row 8, column 4. 7 leaves with it. 9 is what remains, and the step places 9 in row 8, column 4.",
        ],
      },
      {
        h: "A crowded 9 is not the candidate to clear",
        p: [
          "Column 4, off the busy cell, is already pairs. Row 1, column 4 can be 5 or 7. Row 3, column 4 can be 2 or 4. Row 5, column 4 can be 5 or 6. Row 9, column 4 can be 4 or 8. Row 2, column 4 can be 6 or 9, and row 6, column 4 can be 8 or 9. Count the 9 and you get three. Count 2 or 7 and you get two, once the busy cell is included.",
          "The near miss is clearing 9 from row 8, column 5 because the row looks overfull. That cell is 7 or 9, and both marks stay. The extra 9 is the one in the busy cell, and it is the digit that remains. I have crossed that 9 off the pair and then had to put it back.",
        ],
      },
      {
        h: "After the unique rectangle",
        p: [
          "BUG+1 is Expert. It comes after the [unique rectangle](/techniques/unique-rectangle/). The next page is [simple coloring](/techniques/coloring/). The rectangle is four cells and a swap. This is the notes reduced to pairs, plus one digit that appears once too often. Both of them lean on one solution.",
          "The 1,483 archived NYT puzzles never need BUG+1. Their hardest steps stop at triples. I look for this when the pencil marks are pairs and one cell still has three. If a second cell also has three, it is not this pattern, and I leave the cell alone.",
        ],
      },
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
    sections: [
      {
        h: "One digit, tied in pairs",
        p: [
          "Pick a digit. Wherever it has exactly two homes in a house, those two cells are tied. One of them is the digit and the other is not. Follow the ties and alternate a color. Two colors cover the chain. Simple coloring is that chain, plus one of two bad endings.",
          "If two cells of the same color can see each other, that color is impossible, and every cell of that color loses the digit. The other ending does not break the chain at all. A cell outside it that sees both colors loses the digit, because one of the colors is real. The board below is that second ending. The chain is consistent. Row 3, column 4 is the problem.",
        ],
      },
      {
        ol: [
          "Choose one digit. Find a house where it has exactly two cells.",
          "Give one cell the first color and its partner the second.",
          "Every new link flips the color. A cell keeps its color if you reach it again.",
          "Stop if a color sees itself, or if some cell outside the chain sees both colors.",
        ],
      },
      {
        p: [
          "Three homes in a house is not a link. Both ends are not forced. I have built a chain off a box that still had three 5s, and the contradiction was me.",
        ],
      },
      {
        demo: true,
        h: "The 7s, first color then second",
        intro:
          "The highlighted cells are the chain. The board does not paint the two colors, so the alternation is written out under it. Step through. One 7 outside the chain leaves row 3, column 4. That cell keeps its other digits.",
      },
      {
        h: "Four cells, and one outsider",
        p: [
          "Call row 1, column 7 the first color. It can be 7 or 9. Column 7 has exactly two 7s, so row 9, column 7 (7 or 9) takes the second color. Box 3 also has exactly two 7s, row 1, column 7 and row 3, column 8 (4, 6, or 7), so row 3, column 8 takes the second color too. Row 9 has exactly two 7s. Row 9, column 7 is already the second color, so row 9, column 4 (7, 8, or 9) flips back to the first color.",
          "That is the whole chain. Four cells, three strong links: column 7, box 3, and row 9. Row 1 is not a link. It still has three homes for 7, in row 1, column 1, row 1, column 6, and row 1, column 7. Both ends of a link have to be forced.",
          "The two first-color cells do not see each other. Row 1, column 7 and row 9, column 4 share no row, column, or box. The two second-color cells do not either. Row 9, column 7 and row 3, column 8 are in different houses. There is no same-color crash on this board. The chain is fine. The trouble is a cell outside it.",
          "Row 3, column 4 can be 3, 5, 7, or 8. It sees row 3, column 8 along the row, the second color. It sees row 9, column 4 down column 4, the first color. One of those colors is the real 7, so row 3, column 4 cannot be 7. The 7 leaves. Three digits remain, so the step does not place a number.",
        ],
      },
      {
        h: "I flip a color and the rest is fiction",
        p: [
          "Four cells is short, and it is still easy to flip one link and delete the wrong color. If you cannot name a cell's color, mark it before you delete anything.",
          "Row 1, column 1 still lists 5 and 7. It sees the first color, in row 1, column 7, and it sees none of the second color. The 7 stays. Seeing one color proves nothing. The cell that sees both colors is the one that loses the digit. The chain stays. Coloring follows a single digit the whole way. An [XY-chain](/techniques/xy-chain/) changes digit at every step. If your link suddenly involves a 6, you have left coloring.",
        ],
      },
      {
        h: "This is the Mental grade",
        p: [
          "Simple coloring is Mental, along with the XY-chain. A Mental puzzle's hardest step is one of those two. The NYT archive never needs either. None of the 1,483 puzzles gets past triples.",
          "I reach for colors when one digit is full of two-cell links and the fish are not on the board. A pair or an X-wing, if it is there, is less work. I still have a ceiling on these. Some Mentals I see, and some I have to step through one link at a time.",
        ],
      },
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
    sections: [
      {
        h: "The wing, with another cell on the end",
        p: [
          "An XY-chain is a path of cells that each have two candidates. A cell shares one candidate with the next cell, and the two see each other, so they cannot both be that digit. The path starts on a digit and ends on the same digit. One of the two ends is that digit. Any other cell that sees both ends loses it.",
          "An [XY-wing](/techniques/xy-wing/) is the short path, a pivot and two wings. This board uses seven cells, and both ends carry a 7. I still drop a link at this length. Teddy is usually on the other end of the couch for it, a black Australian labradoodle with a white patch on his chest. He has never spotted a chain. On the first pass, neither have I.",
        ],
      },
      {
        demo: true,
        h: "Seven cells, both ends on 7",
        intro:
          "Read the highlighted cells from row 1, column 1 across to row 3, column 8. Step through. The 7 that leaves can see both ends. That cell keeps its other digits.",
      },
      {
        h: "Each link flips the digit",
        p: [
          "Row 1, column 1 can be 5 or 7. Row 6, column 1 can be 5 or 9, and it sees the first cell down column 1. They share 5. Row 5, column 2 can be 1 or 9, and it sees row 6, column 1 in box 4. They share 9. Row 5, column 6 can be 1 or 2, and it sees row 5, column 2 along the row. They share 1. Row 5, column 7 can be 2 or 8, and it sees row 5, column 6 along the row. They share 2.",
          "Row 6, column 8 can be 2 or 8, and it sees row 5, column 7 in box 6. The chain arrives on 8, so they share 8, and the other digit in row 6, column 8 is 2. Row 3, column 8 can be 2 or 7, and it sees row 6, column 8 down column 8. They share 2. Both ends, row 1, column 1 and row 3, column 8, carry a 7.",
          "Suppose row 1, column 1 is not 7. Then it is 5, so row 6, column 1 is 9, so row 5, column 2 is 1, so row 5, column 6 is 2, so row 5, column 7 is 8, so row 6, column 8 is 2, so row 3, column 8 is 7. If the start is not 7, the end is. If the start is 7, we never needed the end. One of the two ends is 7.",
          "Row 3, column 1 can be 6, 7, or 9. It sees row 1, column 1 down column 1, and row 3, column 8 along the row. Both ends. It loses 7 and keeps 6 and 9. The step does not place a digit.",
        ],
      },
      {
        h: "A pair that deletes nothing",
        p: [
          "Row 5, column 7 and row 6, column 8 are both 2 and 8. That is a naked pair in box 6, and as a pair it is idle. Nothing else in that box still holds 2 or 8, so there is no cell to strip. The chain uses the two cells anyway. A pattern with nothing to delete can still be a hinge.",
          "The ends do not see each other. Row 1, column 1 and row 3, column 8 share no row, column, or box. That is allowed. The cell you clear is the one that sees both ends. Require the ends to see each other and you will only find wings.",
        ],
      },
      {
        h: "Last move the solver has",
        p: [
          "XY-chains are Mental, with coloring. They are the hardest step this solver uses. The NYT archive never needs one. Medium stops at pointing. Hard stops at triples. If a shorter wing is sitting there, take the wing. Seven cells is the same logic with more places to slip.",
          "I look for a chain when the two-digit cells are scattered and nothing inside one house will move. Start on a cell that holds the digit you care about, walk the shared candidate to a cell that sees it, and flip to that cell's other digit. When you arrive back on the first digit, find a cell that sees both ends. Then go play one before the path gets longer than this.",
        ],
      },
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
