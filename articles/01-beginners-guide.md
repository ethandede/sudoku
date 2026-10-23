# How to play Sudoku

**Meta Description:** The rules of Sudoku, a 4×4 with one solution, and a 38-clue Easy board with a naked single and a hidden single you can check by hand.

**Keywords:** how to play sudoku, sudoku rules, notes, singles

---

![4 by 4 Sudoku grid. The empty cell in row 1, column 2 is marked.](/articles/images/beginner-4x4.svg "480x520")

I still place a digit, feel fine about it, and find out later the box already had it. The row was clear. The column was clear. I never looked at the box. That is the whole game, once you can see the three houses.

A Sudoku is a grid of digits with some cells already filled. You fill the rest. There is no arithmetic. If the digits were colors, the puzzle would be the same puzzle.

## The rules

On a normal board there are nine rows, nine columns, and nine 3×3 boxes. Each of those must contain the digits 1 through 9 once.

![A 9 by 9 grid with one row, one column, and one box shaded.](/articles/images/beginner-lines.svg "640x360")

That is the whole rule. A digit can go in an empty cell only when its row, its column, and its box do not already contain it. A finished puzzle on this site has one solution, so if more than one digit still fits, you are not done looking.

The filled cells at the start are givens. You do not change a given. Everything you write has to live with those, and with every digit you have already placed. Rows and columns on this page are counted from 1 at the top left. The top-left box is the first box. The top-middle box is the next one. They run left to right, then down.

A cell "sees" the other cells in its row, its column, and its box. If any of those already holds a 5, this cell cannot be 5. That is the check. I say it in my head when I am tired. Row, column, box. I have lost more Easies to a skipped box than I want to put in a byline.

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

The move you just made is a naked single. One cell, one digit left. On the 4×4 it is easy to see because there are only four digits to cross off. The 9×9 is the same check with more cells in the way.

## The same move on a 9×9

Easy puzzles here are built out of singles. This one was generated on the site. It has 38 clues. Easy is allowed 36 to 38, and 38 is the count the generator aims at. It is also the clue count on the New York Times Easy puzzles this site was compared against. Details, and the other levels, are on [how difficulty works](/how-difficulty-works/).

The grid has one solution. I counted completions and stopped at a second one. There was no second one.

```
+-------+-------+-------+
| . 1 3 | . . . | 8 7 2 |
| . 9 . | 3 . 5 | . . 4 |
| 2 4 . | 8 . . | . 9 5 |
+-------+-------+-------+
| . . . | 7 6 4 | 2 3 . |
| . . . | 9 . 8 | 1 . 6 |
| . . 9 | . . . | . 5 8 |
+-------+-------+-------+
| . 2 . | . 8 7 | 9 . . |
| . 3 . | . . . | 4 . . |
| 9 . 7 | 4 . 6 | 5 . 1 |
+-------+-------+-------+
```

Start at row 1, column 4. Empty. It sits in the top-middle box.

Row 1 already has 1, 3, 8, 7, and 2. Column 4 already has 3 (row 2), 8 (row 3), 7 (row 4), 9 (row 5), and 4 (row 9). The box already has 3, 5, and 8. The 5 in that box is row 2, column 6.

Cross those off and one digit is left. Row 1, column 4 is 6.

Here is the miss. The 5 is not in row 1, and it is not in column 4. If you only scan those two, 5 looks legal in that cell. It is not legal. Row 2, column 6 is a 5, and that cell shares the box. Skip the box and you spend the cell on a 5. The 6 never gets a chance.

That placement is a [naked single](/techniques/naked-single/). [Practice a naked single](/?practice=naked-single) deals a puzzle, fills the easier steps, and stops on that move.

You can see this one on the starting grid. You do not have to solve the rest of the board first.

## A hidden single, on the same grid

A hidden single is the other kind. A digit has only one home in a row, a column, or a box, even when that cell still allows something else.

Look at row 1 again, still on the starting grid. It needs a 4. The empty cells in that row are columns 1, 4, 5, and 6.

Column 1 cannot take a 4. The top-left box already has a 4 at row 3, column 2, and row 1, column 1 is in that box. Column 4 cannot take a 4, because row 9 of column 4 is already 4. Column 6 cannot take a 4, because row 4 of column 6 is already 4.

Column 5 can. The 4 goes in row 1, column 5.

That cell is not a naked single. It still allows a 9 as well as a 4. If you only hunt for cells with one candidate, you walk past it. The 4 has nowhere else in the row, so the cell is 4, and the 9 has to live somewhere else in the puzzle.

Same digit, two more times, if you want to see why it is locked. Column 5's only home for a 4 is that same cell. The top-middle box's only home for a 4 is that same cell. One pattern, three houses. You only need one of them.

That is a [hidden single](/techniques/hidden-single/). [Practice a hidden single](/?practice=hidden-single) stops on one of those, after the easier steps are filled.

Row 1, column 6 is another naked single, a 9, if you want a second easy one before you leave the top band. Column 6 already blocks 4, 5, and 6. The box blocks 5. Row 1 blocks 1, 2, 3, 7, and 8. The 9 is what remains. I am not walking the rest of the grid in this article. It does finish.

One honest note about this particular board. If you take the naked singles in order, they are enough. The grader's hardest move here is a naked single. Easy is still allowed to ask for a hidden single in a row or column, and the next one might. The pattern above is on the starting grid either way. Spot it now, while the board is quiet.

## Notes, when a cell still has a few digits

When a cell has several digits that still fit, write them small. That is notes mode. The N key toggles it. Keys 1 through 9 enter a digit in normal mode. In notes mode the same keys toggle a candidate in the selected cell. Arrows move. Backspace erases.

I don't fill every empty cell with all nine digits. A cell with five candidates is noise. A cell with two or three is worth writing down, because that is where the next single shows up.

Auto Candidate Mode is the checkbox under the number pad. It lists every legal candidate in every empty cell. It is off until you turn it on. I turn it on when a puzzle stops being obvious. Those notes are computed from the board, so a placement updates them. Notes you typed yourself are different. A correct placement does remove that digit from your notes in the same row, column, and box. It cannot repair a note you never wrote.

The number pad also draws a box map. Nine segments on each digit, one per box, filled in when that box already contains the digit. It is there so you can see which boxes are done without scanning the grid. That setting is on by default. So is the highlight on the row, column, and box of the cell you have selected. Use the highlight. It is the box check, drawn for you. It still will not place the digit.

Hints name the technique, then show the cells, then show the placement. They sit between the board and the pad. On an Easy I try not to take one. If I do, it is usually a hidden single I walked past. I read the name, find the cells, and look for the next one myself.

## When nothing looks like a single

Pick one digit. I start at 1 when I am stuck, which is more often than the byline suggests. Scan every row for a home, then every column, then every box. Then do 2. A hidden single is usually in that pass. I missed it because I was staring at one cell and hoping.

If a full pass really finds nothing, the puzzle has left singles. On this site that is the line out of Easy. [Not Easy](/?difficulty=not-easy) requires pointing or claiming. Hard requires a pair or a triple. Quick stays on the easiest singles, with more givens. The windows are short, and they are written out on [how difficulty works](/how-difficulty-works/). The [technique library](/techniques/) has a page for each move, with a board.

You do not need those pages to finish the puzzle above. You do need to stop guessing while a single is still on the board. A guess in a cell with two candidates can sit there for a long time. Later digits that respect the guess all look legal. The contradiction shows up after you have built on it, and then the grid looks impossible. The early digit was the problem.

Undo puts the last entry back, notes included. Erase only clears the cell you are on. If Check guesses as you go is on, and it is on by default, a wrong entry counts toward a limit of 4. Four of them and the puzzle stops. Undo rolls that count back with the entry. Erase does not. You can turn the check off in settings. Then there is no limit, and a wrong digit just sits there until the grid breaks. I leave the check on. I would rather know at the cell.

The daily is a Not Easy, not an Easy. The seed is the UTC date, so everyone gets the same grid that day. If you want the kind of board this article just walked, [play an Easy](/?difficulty=easy).

## Where to go next

The [technique library](/techniques/) starts at naked singles and goes through the steps the harder levels actually need. [Sudoku mistakes I still make](/articles/common-mistakes/) is the skipped box, the bad note, and the guess, on another real board. When you want the puzzle instead of the explanation, the Easy link above is the one.
