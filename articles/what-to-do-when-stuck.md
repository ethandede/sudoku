---
title: "What to Do When You're Stuck on a Sudoku"
slug: what-to-do-when-stuck
meta_description: "Stuck with no singles left: check for a wrong digit, then the pointing, then the pair that fills a cell. A real Hard, in that order."
summary: "A 37-cell stall from a 24-clue Hard. No singles. The way through is a pointing that deletes a 7, then a 2 and 3 pair that places one."
publishDate: 2026-10-26
---

<!-- REQUIRES: hints (teaching hints, including the wrong-digit check), techniques (/techniques/ pages linked below), articles /articles/how-to-solve-a-hard-sudoku/, /articles/how-to-use-sudoku-notes/, /articles/why-being-stuck-is-good-for-you/ -->

# What to Do When You're Stuck on a Sudoku

![A stuck Hard Sudoku. The 7s in the middle-right box all sit in column 8, and the 7 in row 8 column 8 is the one that comes out.](/articles/images/stuck-sevens.svg "700x342")

The scan comes back empty and the next idea is usually a guess. Guessing is how one stuck cell turns into four red ones.

This is the checklist I actually use, on a board that is already stuck. It's a Hard from this site. It started with 24 clues. Singles carried it to 37 filled cells and then quit. One solution, at the start and at this position. Nothing below depends on a digit I haven't shown you.

`273185946.4.2....76........4.....6.18.9.1.5....6.5.4....4528.69.....3...56.7913.4`

```
+-------+-------+-------+
| 2 7 3 | 1 8 5 | 9 4 6 |
| . 4 . | 2 . . | . . 7 |
| 6 . . | . . . | . . . |
+-------+-------+-------+
| 4 . . | . . . | 6 . 1 |
| 8 . 9 | . 1 . | 5 . . |
| . . 6 | . 5 . | 4 . . |
+-------+-------+-------+
| . . 4 | 5 2 8 | . 6 9 |
| . . . | . . 3 | . . . |
| 5 6 . | 7 9 1 | 3 . 4 |
+-------+-------+-------+
```

Rows and columns start at 1 in the top left. The middle-right box is box 6.

## First, make sure the board is honest

If one entered digit is wrong, every pattern after it is fiction. I check that before I look for anything clever.

On this site, "Check guesses as you go" is on unless you turned it off. A wrong digit goes red and gets a slash through it, and the counter moves: Errors, out of 4. The fourth one ends the puzzle. The dialog is "Too many mistakes," and it lets you undo the last entry or start a new game. One undo takes back that last digit, mistakes and all. It does not rewind the whole grid.

The hint will not teach you a technique on top of a wrong digit, even if checking is off and nothing looks red. It says a digit on the board is wrong, so the next technique wouldn't be trustworthy. Show it, then clear it. After that you can ask again.

A wrong entry also throws away eliminations a hint had already made. Guess on top of a hint and that work is gone. Undo if you still have it. If you don't, you're rebuilding notes from the grid, which is slower and at least it's real.

[How to solve a Hard](/articles/how-to-solve-a-hard-sudoku/) is the forward path, the one where the singles haven't run out yet. This piece starts after they have.

## One more pass for singles

Stuck often means "I stopped seeing them," not "there aren't any."

A [naked single](/techniques/naked-single/) is a cell with one digit left. A [hidden single](/techniques/hidden-single/) is a digit with one legal cell left in a row, a column, or a box, even when that cell still lists other digits. Place one and scan again. The next single is often created by the one you just entered.

On this board a full pass finds neither. The last single before this position was a hidden 1 in row 5 column 5, the only 1 left in the center box. It's already filled in the grid above. Thirteen singles got the puzzle from 24 clues to 37 cells. The fourteenth move is not a single.

If your pass finds one, you aren't on this article anymore. Place it and go back to the Hard loop. The miss I make is stopping after the rows. A hidden single is often a digit's last seat in a box, and the cell still looks busy. Row 5 column 5 was that kind of busy right up until the 1 went in.

## The cheapest delete

No singles means you need a deletion that doesn't fill a cell yet. The cheapest one is a [pointing](/techniques/pointing/).

A digit's candidates inside one box all sit in the same row, or all in the same column. The digit is trapped in that line. It comes off the rest of the line, outside the box.

The diagram at the top is this move. Hint names it first, and the text is: the 7s in box 6 are all in column 8, so 7 can't go anywhere else in column 8.

You can see the lock without a full candidate chart. Box 6 is rows 4 to 6, columns 7 to 9. Five cells in it are empty: row 4 column 8, row 5 column 8, row 6 column 8, row 5 column 9, and row 6 column 9. Column 9 already has a 7 in row 2, so those two column-9 cells are out. Every 7 still possible in the box sits in column 8.

Those three cells are not "the answer is 7." Row 4 column 8 still has 2, 3, 7, 8, and 9. Row 5 column 8 has 2, 3, and 7. Row 6 column 8 has 2, 3, 7, 8, and 9. The 7 is only confined to the column. Writing 7 into one of them now is a guess.

Outside the box, one cell still listed a 7: row 8 column 8, which had 1, 2, 5, 7, and 8. The 7 comes off. The cell keeps 1, 2, 5, and 8. Nothing fills. That's the whole move. If you were hoping the stall would crack open, it doesn't, not from this delete.

[Pointing practice](/?practice=pointing) fills the easier steps and leaves you on a pointing, with candidates on. Cleaner than reconstructing this one from a half-erased note.

A [claiming](/techniques/claiming/) is the reverse shape, a digit trapped in one box along a row or column. This stall doesn't need one. If you can't find a pointing, look for a claim before you reach for a pair.

## The pair that actually places a digit

The pointing didn't touch row 5. On this same board, two cells in that row are a [naked pair](/techniques/naked-pair/). The grader names the pointing first because pointing is the easier move, not because the pair is waiting on that 7 to disappear.

Row 5 column 2 can only be 2 or 3. The row already holds 1, 5, 8, and 9. Column 2 holds 4, 6, and 7. The middle-left box holds 4, 6, 8, and 9. Together that's everything but 2 and 3.

Row 5 column 9 is the same two digits. Same row. Column 9 holds 1, 4, 6, 7, and 9. The middle-right box holds 1, 4, 5, and 6. Again, 2 and 3.

Two cells, same two digits. The row has spent both, wherever they end up. You still don't know which cell is the 2.

What comes off the rest of the row:

- Row 5 column 4 loses a 3. It doesn't become a single.
- Row 5 column 6 loses a 2. Same.
- Row 5 column 8 was 2, 3, or 7. It loses 2 and 3. The cell is 7.

![Row 5 columns 2 and 9 can only be 2 or 3, so row 5 column 8 loses both and becomes 7.](/articles/images/stuck-pair.svg "700x342")

Place the 7. That's a naked single the pair created. It was not a single before the pair, and the pointing didn't make it one either.

If those two cells aren't marked 2 and 3, you will not see this. [How to use Sudoku notes](/articles/how-to-use-sudoku-notes/) is the practical version: what to write, what a placement clears, and what an old pencil mark will keep lying about. [Naked pair practice](/?practice=naked-pair) turns candidates on and skips ahead to a pair, which is the least annoying way to learn the shape.

## Then you're stuck again, a little further on

Placing the 7 ends this stall. It does not finish the puzzle. At 38 filled cells the grader still wants another naked pair, then two [hidden pairs](/techniques/hidden-pair/), before singles take over for good. One of those hidden pairs is what finally puts a 5 in row 4 column 2. I'm not going to teach that one here. The checklist doesn't change. Singles, then the cheapest delete, then a pair.

A hidden pair is worth knowing the shape of, since this puzzle asks for it next. Two digits appear in only two cells of a unit. Those cells may list extra digits. The extras come off the two cells. You are not deleting the pair digits from the rest of the unit. They were already absent there, which is what made the pair hidden.

If a Hard seems to need an X-wing while you're in this loop, I've usually missed a pair. On this site an X-wing is Expert work. Another pass beats a fancier pattern. The full order, on a puzzle that really does settle into singles after one pair, is the [Hard walkthrough](/articles/how-to-solve-a-hard-sudoku/).

## When you still want a hint

Ask. The sheet names the technique and, on the first tap, only tells you where to look. The button says Show why. The next screen is the reason, and the button becomes Place it when a cell fills, or Apply when the move only deletes. A second button applies every step of that same technique available right now, and stores the batch as one undo. Leave it until you can see one of them yourself. The learn link goes to that technique's page.

Use the first stage, look again, and open the rest only if the cell still won't move. Filling it from the sheet tells you what the digit was. Finding it is the pattern.

If the sheet says "Check the board" instead of a technique name, you skipped step one. There's a wrong digit. Clear it before you read anything else.

There's a separate article on [why being stuck is good for you](/articles/why-being-stuck-is-good-for-you/). That one is about the pause, and why struggling a little before the hint is how the pattern sticks. This one is what to do with your pencil while you're in it.

Four questions, in order. Is every digit I placed still one I could justify? Did a full singles pass come up empty? Is a digit trapped in one line of a box, or one box of a line? Do two cells in a unit own the same two digits? A yes on the third or fourth question is a move. If the board is clean, the singles are gone, and you still can't find a trap or a pair, you missed something in that list. That's when the first stage of the hint earns its keep.

Set this grid up before you peek at the pair. The 7 in row 5 column 8 is the reward, not the method. If it's written in and you never found the 2s and 3s, you guessed, including the times the guess was right. [Start a Hard](/?difficulty=hard) when you want the same stall to show up unannounced.
