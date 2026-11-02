# How to play Sudoku

**Meta Description:** The rules of Sudoku, a 4 by 4 with one solution, and a real 9 by 9 with a naked single, a hidden single, and where to practice each.

**Keywords:** how to play sudoku, sudoku rules, naked single, hidden single, notes

---

![4 by 4 Sudoku grid. The empty cell in row 1, column 2 is marked.](/articles/images/beginner-4x4.svg "480x520")

A Sudoku is a grid of digits with some cells already filled. You fill the rest. There is no arithmetic. If the digits were colors, the puzzle would be the same puzzle.

I play a lot of these, mostly on my phone, and I still have a ceiling. The rules are not the part that gets me. Forgetting to look at one of the three houses is. So this is the rule, a tiny board where you can see it, and then a full board from the same generator this site uses.

## The rules

On a normal board there are nine rows, nine columns, and nine 3 by 3 boxes. Each of those must contain the digits 1 through 9 once.

![A 9 by 9 grid with one row, one column, and one box shaded.](/articles/images/beginner-lines.svg "640x360")

That is the whole rule. A digit can go in an empty cell only when its row, its column, and its box do not already contain it.

Rows and columns are counted from 1 at the top left. Boxes are counted the same way, left to right and top to bottom. The top left box is box 1. The top middle is box 2. The top right is box 3. I still point at them when I am tired, so "top right box" and "box 3" mean the same thing here.

A finished puzzle on this site has one solution. If two digits still fit in a cell, you are not done looking. You do not pick one and hope. Somewhere on the board, a house has already decided.

## A 4 by 4, so the rule is easy to see

A 4 by 4 uses the digits 1 through 4. The boxes are 2 by 2. Same rule, smaller board.

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

## The same check on a 9 by 9

Here is an Easy from this site's generator. 38 clues. One solution. Nothing in it is harder than a single, which is what Easy means here. Quick is narrower: a [naked single](/techniques/naked-single/), or a [hidden single](/techniques/hidden-single/) inside a box. Easy also allows a hidden single along a row or a column. Neither grade asks you for pairs.

```
+-------+-------+-------+
| . 1 2 | . . . | 4 . . |
| . 3 5 | 9 1 . | . . . |
| 9 6 . | 8 2 3 | . 1 . |
+-------+-------+-------+
| 1 7 . | . 8 . | . . . |
| . 5 . | 1 4 9 | 3 6 . |
| . . 9 | . 3 5 | 1 2 . |
+-------+-------+-------+
| . 9 . | . . . | . 3 2 |
| . . . | 5 9 . | 6 . . |
| . . 1 | . 6 8 | . 7 9 |
+-------+-------+-------+
```

Select a cell on the site and the row, the column, and the box light up. That highlight is the check. Read the digits sitting in the light before you type.

### Row 2, column 8 is an 8

Row 2, column 8 is empty. It sits in the top right box.

Row 2 already has 3, 5, 9, and 1. Column 8 already has 1 in row 3, 6 in row 5, 2 in row 6, 3 in row 7, and 7 in row 9. Put those together and the cell has lost 1, 2, 3, 5, 6, 7, and 9.

Two digits are still missing from that list: 4 and 8. This is the moment I used to type too fast. The 4 is not in the row, and it is not in the column. It is in the box. Row 1, column 7 is a 4, and that cell shares the top right box with row 2, column 8.

Eight digits are banned. The one left is 8. One cell, one digit. That is a naked single. The [naked single page](/techniques/naked-single/) walks another board the same way, and [practice](/?practice=naked-single) deals you one that stops on this move.

The hint on a fresh copy of this puzzle names that cell first. A few other naked singles are also sitting there if you would rather hunt. Row 5, column 3 is an 8 as well. Row 5 holds 5, 1, 4, 9, 3, and 6. Column 3 holds 2, 5, 9, and 1. The middle left box holds 1, 7, and 9. Same elimination, same kind of answer. I will not walk every one of them. Once you have done two, the rest are the same glance.

### A 5 that is hiding in the top middle box

A hidden single is a different question. The cell can still have more than one digit written in it. You place one of them because the house has only one home for it.

Look at the top middle box, rows 1 to 3 and columns 4 to 6. Five cells are filled: 9, 1, 8, 2, and 3. Four are empty: row 1 column 4, row 1 column 5, row 1 column 6, and row 2 column 6.

Where can a 5 go in that box?

Row 2 already has a 5 in column 3, so row 2 column 6 is out. Column 6 already has a 5 in row 6, so row 1 column 6 is out too. Column 4 already has a 5 in row 8, so row 1 column 4 is out. The only cell left in the box is row 1, column 5.

That cell is not down to a single mark. It can still be 5 or 7. No 7 is in row 1, column 5, or the box, so the 7 has not been ruled out of the cell yet. The 5 has. The box has one home for it, so row 1, column 5 is 5, and the 7 comes off.

The cell can look crowded and still be finished. That is the whole trick, and I mix it up with a naked single when I am rushing. A naked single is a quiet cell. A hidden single can look crowded. The [hidden single page](/techniques/hidden-single/) shows one in a box with the extra marks still on the cell. [Practice](/?practice=hidden-single) stops on that move instead of making you find it in a full Easy.

You can place this 5 before you ever look at row 2, column 8. Both are legal on the opening grid. The solver takes the naked single first, because a cell with one candidate is the cheapest move it has. Either order finishes the puzzle. There is still only one solution.

## What I actually look at

I do not scan the whole grid hoping a cell waves at me. I pick a digit that already appears a lot, and I finish the boxes before I fall for a different number.

On this board the 5 is a good one to start with. It is already in row 2, row 5, row 6, and row 8. Four copies placed, five to go, and one of those five is the hidden single above. A digit you have only seen once means eight homes to check. Skip it until the board is fuller.

Then I look for naked singles in the boxes that are already crowded. Six or seven digits in a box is where they sit. An empty-looking box can wait.

After each digit I place, I look again at the cells that saw it. One number often knocks the next cell down to a single. If I am clicking around on the site, the peer highlight does that scan for me. The number pad does another version of it. Each digit draws a box map, nine segments, one per box, filled in when that box already contains the digit. The map is there so you can see which boxes are done without hunting.

[How these levels are graded](/how-difficulty-works/) is the long version of what you just did. The grade is the hardest move the puzzle forces. This one never leaves singles. That is why it is an Easy.

## Notes, and the button that says Candidate

When a cell has several digits that still fit, write them small. Press N, or tap Candidate. The other side of that switch is Normal. In Normal, the keys 1 to 9 fill the selected cell. In Candidate, the same keys toggle a note. I have typed a whole "placement" that was a pencil mark, then wondered why the puzzle did not move. The button is right there. I still miss it.

Notes are yours. The site does not invent them unless you ask.

Auto Candidate Mode is the ask. It draws every legal digit on every empty cell, from the digits on the board right now. Those marks are computed. They are not saved as your notes. Turn the switch off and they leave. Notes you typed stay. If both are on, a note you typed draws on top of the auto mark for that digit. Clicking a digit spot toggles your note. It does not rub out an auto mark. The auto mark comes back for any digit the board still allows.

Two things the app does to notes that are easy to miss.

When you place a digit, that digit is deleted from the notes in the same row, the same column, and the same box. You do not have to erase those by hand. A correct 8 in row 2, column 8 pulls every noted 8 out of those three houses.

Erase does not put them back. Erase clears the selected cell. If the cell held a digit, the digit goes. If it held notes, the notes go. The peer notes that were removed when you placed stay removed. Undo is the control that restores them, because Undo puts the whole board back, notes included. The [mistakes piece](/articles/common-mistakes/) is the long version, including what the error counter actually counts. Short version: Erase and Undo are not the same button.

Backspace or Delete erases the selected cell. You cannot erase a given, and you cannot type over one. If the pad seems dead, you are probably on a printed digit. Arrow keys move. They stop at the edge of the board.

A given is a clue. Your digits look different from givens. Trust that, and trust the board over a note when they disagree. A stale note will invent a naked single the grid does not have.

## When the singles stop

Easy puzzles end once the singles run out. A Not Easy does not. The next grade locks a digit inside a box to one row or one column, which is [pointing](/techniques/pointing/), or does the reverse, which is [claiming](/techniques/claiming/). Pointing is the one on the board below. A digit inside one box is stuck on a single line, so it comes off the rest of that line.

This board is a different puzzle. I generated a Not Easy and let the solver place every easier step, then stopped where pointing is the next move. Still one solution. Every digit matches that solution.

```
+-------+-------+-------+
| . 5 9 | 2 1 7 | . . 3 |
| 2 3 . | . . 9 | . 1 . |
| 7 1 4 | . . . | . . 2 |
+-------+-------+-------+
| . . 3 | 1 7 . | . . 4 |
| 5 . . | . . . | . . 1 |
| . 6 1 | . . 2 | . 3 . |
+-------+-------+-------+
| . . 5 | 7 2 1 | 3 . . |
| 1 . . | 3 5 4 | 2 8 . |
| 3 . 2 | . . . | 1 . . |
+-------+-------+-------+
```

Look at the top middle box. Row 1 of it is full: 2, 1, 7. Row 2, column 6 is 9. The empty cells in the box are row 2 columns 4 and 5, and row 3 columns 4, 5, and 6.

Row 3 already has a 4 in column 3. So none of those three empty cells in row 3 can be 4. Inside the box, a 4 can only sit in row 2, column 4 or row 2, column 5. Both of those homes are in row 2.

That is pointing. The 4s of the box are trapped in one row, so the rest of row 2 loses 4. The cell that actually had 4 as a candidate is row 2, column 7. It was carrying 4, 5, 6, 7, and 8. The 4 comes off. Nothing gets placed yet. You only cross a candidate out.

I would not start with this move. If a single is on the board, a pointing is me showing off. When the singles really are gone, [practice pointing](/?practice=pointing) stops you on one, with the earlier steps already filled. Practice does not go on your streak, your times, or your badges. It is a drill.

The move after that, when you want it, is a [naked pair](/techniques/naked-pair/). Two cells in a house that share the same two digits, so those digits come out of the other cells in the house. Hard puzzles on this site need pairs or triples. You do not need them to finish an Easy.

## Hints, if you want the name of the move

The hint sits between the board and the pad. It has three beats. First it tells you where to look, and it names the technique. Then it shows the cells. Then it places the digit, or crosses out the candidates.

There is a link to the technique page on that sheet, and a Fill control for every copy of that move that is available right now. Fill is one Undo for the whole batch. Handy, and also a good way to skip the only part you were about to learn. I use it when I already know the move and the puzzle has six of them. I do not use it the first time I see the name.

If a digit on the board is wrong, the hint will not teach you a technique. It says the next technique would not be trustworthy, then it offers to show the bad cell and clear it. Fix that before you ask what the next clever move is. More on that in the [mistakes article](/articles/common-mistakes/).

## Where to go next

[Play an Easy](/?difficulty=easy). Or skip the menu and [just play](/). If you want the naked single on its own, [practice it](/?practice=naked-single). The hidden single drill is the same idea, [here](/?practice=hidden-single).

The [technique library](/techniques/) starts at naked singles and goes up through the moves the harder levels actually use. When a puzzle falls apart twenty entries later, it is usually one of the things in [seven mistakes](/articles/common-mistakes/). I wish I had kept that list next to the board.

Give the Easy a shot. The 8 in row 2 is sitting there.
