---
title: "How to Solve a Hard Sudoku"
slug: how-to-solve-a-hard-sudoku
meta_description: "A real Hard from this site: 11 singles, a pointing that fills a cell, then a naked pair. The order that actually finishes it."
summary: "I solved a 25-clue Hard in grader order: singles until they stop, the pointing that places a digit, then the naked pair."
publishDate: 2026-10-24
---

<!-- REQUIRES: hints (teaching hints that name the move), techniques (/techniques/ pages linked below), articles /articles/what-to-do-when-stuck/, /articles/how-to-use-sudoku-notes/, /articles/what-makes-a-sudoku-hard/, /articles/nyt-medium-vs-hard/ -->

# How to Solve a Hard Sudoku

![A 25-clue Hard Sudoku. The middle-left box is shaded, and row 4 column 2 is the only cell left for a 7.](/articles/images/hard-first.svg "700x342")

I used to open a Hard Sudoku looking for the clever bit. The clever bit was usually a single I had walked past.

This puzzle is from the Hard set shipped with SudokuSudoku. The grader that rates puzzles on the site gives it 25 clues, one solution, two stalls, and a naked pair as its hardest move. Four steps are not singles. See those, and the rest of a Hard is the same loop.

Rows and columns start at 1 in the top left. Boxes count left to right, top to bottom. The middle-left box is box 4. The bottom-middle box is box 8. That's the numbering the hint uses, so it's the numbering I'll use here.

## Singles, until a full pass finds none

Two kinds of fill count as singles.

A [naked single](/techniques/naked-single/) is an empty cell with one digit left. Every other digit is already used in its row, its column, or its box.

A [hidden single](/techniques/hidden-single/) is a digit with one legal cell left in a row, a column, or a box. The cell can still list other digits. The digit has nowhere else to go, so it goes in, and those other digits come off.

A Hard still opens on these. Hunting for a pattern before the singles are gone is how I used to spend twenty minutes on a cell that was already decided.

Here is the start. A dot is an empty cell.

`.4...9..17...2......8......5..3....4......752..157.8....72.36....9..74....5.1....`

```
+-------+-------+-------+
| . 4 . | . . 9 | . . 1 |
| 7 . . | . 2 . | . . . |
| . . 8 | . . . | . . . |
+-------+-------+-------+
| 5 . . | 3 . . | . . 4 |
| . . . | . . . | 7 5 2 |
| . . 1 | 5 7 . | 8 . . |
+-------+-------+-------+
| . . 7 | 2 . 3 | 6 . . |
| . . 9 | . . 7 | 4 . . |
| . . 5 | . 1 . | . . . |
+-------+-------+-------+
```

The first move is a hidden single. It's a 7, and the diagram at the top of the page marks the cell.

Box 4 is rows 4, 5, and 6, and columns 1, 2, and 3. A 7 has to live in there. Other 7s have already taken most of the seats.

Column 1 has a 7 in row 2, so none of row 4, row 5, or row 6 in that column can be 7. Row 4 column 1 is a 5 anyway.

Row 5 has a 7 in column 7, so the whole of row 5 is out, including the three cells inside this box.

Row 6 has a 7 in column 5. That row is out too.

Column 3 has a 7 in row 7, so row 4 column 3 and row 5 column 3 are out. Row 6 column 3 is the given 1.

One cell is left: row 4, column 2. Look only at that cell and it could still be a 2, a 6, an 8, or a 9. The 7 doesn't have another home in the box. The 7 goes in.

[Hidden single practice](/?practice=hidden-single) loads a puzzle, fills every easier step, and stops where that move is the next one. It doesn't go on your solve records. Useful when you're drilling and not trying to post a time.

Ten more singles follow, and the later ones aren't visible yet. Place one, scan again. In order: a 4 in row 5 column 3 (only 4 left in that column), a 4 in row 6 column 6 (only 4 in the center box), a 2 in row 4 column 6 (only 2 in that box). Then naked singles, 6 in row 4 column 3, 3 in row 2 column 3, 2 in row 1 column 3, 6 in row 1 column 1. Row 4 still needs an 8 in column 5 (only 8 left in the row), a 1 in column 7 (only 1 left in that column), and a naked 9 in column 8.

Row 4 finishes as 5 7 6, then 3 8 2, then 1 9 4. The grid has gone from 25 filled cells to 36.

Eleven singles. I wish the rest of the puzzle had gotten the memo.

## The singles stop, and three pointings are waiting

This is the stall. No cell has one candidate. No digit has one home left in its row, column, or box. Put a number in now because a cell "looks like" a 4 and you're guessing. There's a separate piece on [what to do when you're stuck](/articles/what-to-do-when-stuck/). While you're on this one: stop, and look for a digit to delete. Don't look for a digit to try.

`642..9..17.3.2......8......576382194..4...752..15748....72.36....9..74....5.1....`

```
+-------+-------+-------+
| 6 4 2 | . . 9 | . . 1 |
| 7 . 3 | . 2 . | . . . |
| . . 8 | . . . | . . . |
+-------+-------+-------+
| 5 7 6 | 3 8 2 | 1 9 4 |
| . . 4 | . . . | 7 5 2 |
| . . 1 | 5 7 4 | 8 . . |
+-------+-------+-------+
| . . 7 | 2 . 3 | 6 . . |
| . . 9 | . . 7 | 4 . . |
| . . 5 | . 1 . | . . . |
+-------+-------+-------+
```

A [pointing](/techniques/pointing/) is a digit whose candidates inside one box all sit in the same row, or all in the same column. The digit is trapped in that line. Every other cell of the line, outside the box, loses it.

A hint on this board names them in grader order. The 9s in the center box are both in row 5, so 9 comes off row 5 columns 1 and 2. Nothing fills. The 3s in the middle-right box are both in row 6, so 3 comes off row 6 columns 1 and 2. Still nothing fills.

The third pointing is the one that places a digit, so that's the one to learn here. The other two are real. On this puzzle they don't set up the 5s or the pair, so you can miss them and still finish. Take a quiet delete when you see it anyway. The next Hard can need it.

Bottom-middle box: rows 7 to 9, columns 4 to 6. The 5s left in that box both sit in column 5, and you can see why without a full candidate list.

Column 4 already has a 5 in row 6, so row 8 column 4 and row 9 column 4 are out.

Row 9 already has a 5 in column 3, so row 9 column 6 is out.

The empty cells left in the box are row 7 column 5 and row 8 column 5. Both are in column 5. So 5 is done everywhere else in that column.

Two cells outside the box feel it.

Row 1 column 5 can only be 3 or 5. Row 1 already holds 1, 2, 4, 6, and 9. Column 5 already holds 1, 2, 7, and 8. The top-middle box already holds 2 and 9. Everything but 3 and 5 is spoken for. Delete the 5, and the cell is 3. That's a naked single. Place it.

Row 3 column 5 is 3, 4, 5, or 6. Row 3 only holds an 8 so far, so it barely eliminates anything. Column 5 takes 1, 2, 7, and 8, and the box takes 2 and 9, which leaves those four. Delete the 5 and the cell still has 3, 4, and 6. Leave it empty. Sharing a column with a fresh 3 is not a reason to copy the 3 down.

![The 5s in the bottom-middle box sit in column 5, so row 1 column 5 loses its 5 and becomes 3.](/articles/images/hard-pointing.svg "700x342")

Place the 3 in row 1 column 5. Two more singles fall in behind it. They were not singles on the stall, so don't go looking for them before the pointing. Row 1 column 7 is 5. Row 2 column 7 is 9. Once the 3 is written, each of those cells has one digit left. Check them the ordinary way: every other digit is already used in the row, the column, or the box.

[Pointing practice](/?practice=pointing) fills the easier steps for you and turns candidates on, so the lock is the thing on the screen.

[Claiming](/techniques/claiming/) is the reverse. A digit's only candidates in a row or column sit inside one box, so it comes out of the rest of that box. This Hard never needs a claim. If a pointing pass comes up empty, look for one before you look for a pair.

## The naked pair in row 7

Those three fills put the grid at 39 digits. Scan for singles again before you reach for anything else. There aren't any. The next move is a [naked pair](/techniques/naked-pair/).

`642.395.17.3.2.9....8......576382194..4...752..15748....72.36....9..74....5.1....`

```
+-------+-------+-------+
| 6 4 2 | . 3 9 | 5 . 1 |
| 7 . 3 | . 2 . | 9 . . |
| . . 8 | . . . | . . . |
+-------+-------+-------+
| 5 7 6 | 3 8 2 | 1 9 4 |
| . . 4 | . . . | 7 5 2 |
| . . 1 | 5 7 4 | 8 . . |
+-------+-------+-------+
| . . 7 | 2 . 3 | 6 . . |
| . . 9 | . . 7 | 4 . . |
| . . 5 | . 1 . | . . . |
+-------+-------+-------+
```

Row 7 column 2 can only be 1 or 8. The row already holds 2, 3, 6, and 7. Column 2 holds 4 and 7. The bottom-left box holds 5, 7, and 9. That leaves 1 and 8.

Row 7 column 8 is the same two digits. Same row. Column 8 holds 5 and 9, and the bottom-right box holds 4 and 6.

One cell is the 1, the other is the 8, and the pair never tells you which. Both digits are spent for the rest of the row.

Row 7 column 1 still carries 1, 4, and 8. Strike 1 and 8. The cell is 4. Row 7 column 9 carries 5, 8, and 9. Strike 8, and it keeps 5 and 9, so it stays empty.

![Row 7 columns 2 and 8 are a naked pair on 1 and 8, so row 7 column 1 is left with 4.](/articles/images/hard-pair.svg "700x342")

Write the 4 in row 7 column 1. Box 8 now has one home left for 4, and it's row 9 column 4. Hidden single. The hint says it in one line: 4 fits in only one cell of box 8.

After that 4, the grader stays on singles. No second pair, no wing, no chain. The finished grid matches the solution stored with the puzzle, and the start, the stall, and this 39-cell board each have one solution.

If row 7 columns 2 and 8 aren't written down as 1 and 8, the pair is two blank cells and you'll walk past it. [How to use Sudoku notes](/articles/how-to-use-sudoku-notes/) stays on this same pair, including which marks this site clears when you place a digit and which old marks it leaves alone. [Naked pair practice](/?practice=naked-pair) is the short version: candidates on, easier moves already filled, pair next.

A [hidden pair](/techniques/hidden-pair/) is the other shape. Two digits appear in only two cells of a unit, and those cells may list extra digits besides. The extra digits come off the two cells, because those cells have to be the pair. This Hard doesn't ask for one.

## What I actually do on a Hard

[Start a Hard](/?difficulty=hard) and run this loop. Same order the grader uses.

1. Pass the whole grid for naked singles and hidden singles. Place one, then pass again. End the pass only when a complete scan adds nothing.
2. Look for a pointing, then a claiming. Apply the delete even when no cell fills. Go back to step 1. The new single usually shows up a move later, in a cell you weren't staring at.
3. Look for a naked pair, then a hidden pair. A triple is the same logic with three cells, and Hard on this site is allowed to require one. Place whatever falls out. Back to step 1.

The generator aims Hard at a pair or a triple as the hardest technique, with at least four non-single steps, and a clue count from 22 to 27. This one sits in that band: 25 clues, two stalls, four non-single steps, hardest move a naked pair. An [X-wing](/techniques/x-wing/) belongs to Expert here. When a Hard seems to need one, I've missed a cheaper delete. Another pass, not a fancier shape.

Clue count is a weak signal. A busy grid can stall harder than a sparse one. The counts are in [what actually makes a Sudoku hard](/articles/what-makes-a-sudoku-hard/). The newspaper version of that surprise is [why NYT Medium sometimes feels harder than Hard](/articles/nyt-medium-vs-hard/). Those labels are not the levels on this site.

The easy mistake on this board is copying the 3. Row 1 column 5 became 3 because nothing else fit. Row 3 column 5 lost a 5 and kept 3, 4, and 6. Same column, same pointing, one fill.

The other one is a stale 5 left in box 8. The pointing hides, or it grows a second home and stops looking like a pointing. Update marks when you place a digit, or turn on Auto Candidate Mode and let the grid compute them. The notes article covers the handwritten marks this site will not erase.

Each shape has a page under [techniques](/techniques/), with one step on a real board.

Set the stall up and find the 5s before you look anything up. If row 1 column 5 isn't a 3, the pointing hasn't landed. Then go play a Hard. The singles will run out. That's the puzzle getting started.
