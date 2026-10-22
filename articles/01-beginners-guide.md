# How to play Sudoku

**Meta Description:** The rules of Sudoku, a 4×4 puzzle with one solution, and the same checks you use on the full 9×9 board.

**Keywords:** how to play sudoku, sudoku rules, notes, singles

---

![4 by 4 Sudoku grid. The empty cell in row 1, column 2 is marked.](/articles/images/beginner-4x4.svg "480x520")

A Sudoku is a grid of digits with some cells already filled. You fill the rest. There is no arithmetic. If the digits were colors, the puzzle would be the same puzzle.

## The rules

On a normal board there are nine rows, nine columns, and nine 3×3 boxes. Each of those must contain the digits 1 through 9 once.

![A 9 by 9 grid with one row, one column, and one box shaded.](/articles/images/beginner-lines.svg "640x360")

That is the whole rule. A digit can go in an empty cell only when its row, its column, and its box do not already contain it. A finished puzzle on this site has one solution, so if more than one digit still fits, you are not done looking.

## A 4×4, so the rule is easy to see

A 4×4 uses the digits 1 through 4. The boxes are 2×2. Same rule, smaller board. Rows and columns are counted from 1 at the top left.

```
. . . .
4 2 . .
. 1 . .
. . . 2
```

Look at row 1, column 2. That cell is empty. It is the second cell in the top row, marked on the diagram.

The top-left box already has 4 and 2, so this cell cannot be 4 or 2. Column 2 already has 2 in row 2 and 1 in row 3, so it cannot be 1 or 2 either. The only digit left is 3. Row 1, column 2 is 3.

The rest of the grid completes the same way. This puzzle has one solution:

```
1 3 2 4
4 2 3 1
2 1 4 3
3 4 1 2
```

I checked that with the same kind of search the site uses: count the completions, and stop if a second one appears. This grid has one.

## On the 9×9

The move you just made is a naked single: one cell, one digit left. Easy puzzles on this site are strings of those, plus hidden singles, where a digit has only one home in a row, column, or box even though the cell still has other candidates.

When a cell has several digits that still fit, write them small. That is notes mode, or the N key. Auto-candidates fills those notes from the rules. The number pad also draws a box map: nine segments on each digit, one per box, filled in when that box already contains the digit. It is there so you can see which boxes are done without scanning the grid.

Hints name the technique, then show the cells, then show the placement. They sit between the board and the pad.

## Where to go next

The [technique library](/techniques/) starts at naked singles and goes through the steps the harder levels actually need. [Seven mistakes that create a contradiction later](/articles/common-mistakes/) is the list I wish I had kept next to the board. When you want a puzzle, [play one](/).
