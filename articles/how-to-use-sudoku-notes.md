---
title: "How to Use Sudoku Notes"
slug: how-to-use-sudoku-notes
meta_description: "Notes are the digits a cell can still be. A real naked pair shows what to write, what a placement clears, and what this site leaves alone."
summary: "Full candidates versus a short list, on a real naked pair of 1 and 8. Then what SudokuSudoku actually does to your notes when you place, erase, or take a hint."
publishDate: 2026-10-28
---

<!-- REQUIRES: hints (strike-through on Show why, Apply updates notes), techniques (/techniques/ pages linked below), articles /articles/how-to-solve-a-hard-sudoku/, /articles/what-to-do-when-stuck/, /articles/sudoku-on-your-phone/ -->

# How to Use Sudoku Notes

![Three cells in row 7. Columns 2 and 8 show only 1 and 8. Column 1 shows 1, 4, and 8, so removing 1 and 8 leaves 4.](/articles/images/notes-pair.svg "520x280")

A note is a digit you have not ruled out yet. A note you don't trust is decoration.

I used to pencil a digit because the cell felt open, and then treat that pencil as a fact an hour later. The pair below is what cured it. Two cells that can only be 1 or 8, and a third cell that becomes 4 the moment you believe the notes and not the vibe.

This position is a real Hard from the site, stopped at 39 filled cells. The next move is a [naked pair](/techniques/naked-pair/). The rest of the solve, including how the board got here, is in [how to solve a Hard](/articles/how-to-solve-a-hard-sudoku/). Here I only care about the marks.

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

Rows and columns start at 1 in the top left.

## One grid of little digits

On paper, people keep notes two ways. Full notes means every digit the cell might still be, usually tiny, in a 3 by 3. A shorter style, sometimes called Snyder, only pencils a digit when it has two homes left in a unit, often tucked into a corner of the cell. Corners are a paper habit. They work if you are consistent and you erase.

This site has one layer. The button is labeled Candidate. Turning it on is what the screen reader calls Notes mode. Press N on a keyboard. On a phone the little N badge is hidden. The label is still Candidate.

Every candidate sits in its own spot. 1 is top left, 2 is top middle, 3 is top right, and so on through 9 at the bottom right. There is no second set of corner marks. If you want Snyder, do it on paper, or keep the same discipline inside this 3 by 3 and only write the digits you're actually tracking. The diagram at the top is that 3 by 3, three times. Faint digits are the ones that are not candidates. Dark ones are.

Select an empty cell first. The first tap only selects. A second tap on a digit's spot inside that cell toggles the note. With a mouse, resting on a spot fades the digit in before you click. Touch never does that fade. You can also turn Candidate on and tap the number pad. Candidate off means the pad places a full digit, which is a different action and a good way to ruin a cell you meant to mark.

## Read the pair off the notes

Row 7 already holds 2, 3, 6, and 7. Look at column 2 and column 8.

Row 7 column 2 can only be 1 or 8. Column 2 already holds 4 and 7, and the bottom-left box holds 5, 7, and 9. Add the row's digits and everything else is gone.

Row 7 column 8 is the same two digits, for a different set of reasons. Column 8 holds 5 and 9. The bottom-right box holds 4 and 6. Again, 1 and 8.

That's a naked pair. The two cells own 1 and 8. You don't know which cell gets which digit, and you don't need to. Every other cell in the row loses both.

Row 7 column 1 still carries 1, 4, and 8. The row eliminates 2, 3, 6, and 7. Column 1 holds 5, 6, and 7. The same bottom-left box holds 5, 7, and 9. Left: 1, 4, 8. Strike 1 and 8 because the pair owns them. The cell is 4.

Row 7 column 9 carries 5, 8, and 9. Strike the 8. It keeps 5 and 9, so you don't fill it.

If column 2 and column 8 aren't written as 1 and 8, this is two empty cells and you walk past it. The diagram is the whole technique. [Naked pair practice](/?practice=naked-pair) turns candidates on and fast-forwards to a pair, so you can stare at marks like these without building them yourself. It stays off your solve records.

## What a placement actually cleans up

Place the 4 in row 7 column 1 and the site does three things.

The cell's notes disappear, because the cell isn't empty anymore.

The digit 4 is deleted from notes in the same row, the same column, and the same box. A handwritten 4 in one of those peers goes away. That's the part people expect.

Nothing else is rebuilt. A 9 you penciled into row 7 column 5 stays, even if it stopped being legal three moves ago. The placement only knows about the digit you just entered. It does not scan the cell for other lies.

That's the gap. Updated notes and leftover notes live in the same grid. A pair hides inside the leftovers. When a stall won't move, I don't hunt for a new technique first. I check whether the notes I'm trusting were updated the last time I placed a digit. The checklist for that stall is [what to do when you're stuck](/articles/what-to-do-when-stuck/).

## Auto candidates, and the marks they will not touch

Auto Candidate Mode is the checkbox under the board. It applies to this puzzle. Settings has a separate box, "Start in auto-candidate mode," which turns it on for the puzzle you're in and leaves it on for the next one.

On, the site computes a legal list for each empty cell: any digit not already sitting in the row, column, or box, minus eliminations a hint has stored. Off, you only see what you wrote.

The two lists share a cell, one digit at a time. If you wrote a 1, the 1 shows as your note, even when 1 is no longer legal. Digits you never wrote still appear from the computer when they are legal. Auto will not erase the 1 you typed. It also will not hide the legal 4 and 8 beside it.

So a stale handwritten digit doesn't replace the cell. It sits in the cell next to honest ones, which is almost worse. The pair of 1 and 8 stops looking like a pair if column 2 also shows a handwritten 5 that the row eliminated already. Turn auto on and you'll still see that 5, in your handwriting, beside the real 1 and 8.

I use auto on Hard once the singles are done. Before that, full auto notes are noise, nine little digits in cells that are about to be singles. After the singles stop, the noise is the puzzle. [Pointing](/techniques/pointing/) and pairs are both "these are the only spots left," and you can't see "only" without a list.

Erase is not a gentle undo of one pencil mark. Erase clears the selected cell, digit or notes. It also forgets every elimination a hint had stored on the puzzle. Auto Candidate Mode can then put a digit back that a pointing had already removed. If you only wanted one note gone, tap that digit's spot again. Don't hit Erase unless you mean the cell, and you're willing to lose the hint's deletes.

A wrong digit is rougher. With "Check guesses as you go" on, which is the default, the entry goes red, the mistake counts, and the stored hint eliminations are wiped. Your handwritten notes still update as if the digit were real: that digit comes out of the peers. The notes now agree with a lie, and auto has forgotten the honest deletes. Undo if you have it. The stuck article is the longer version of "don't guess."

## Hints draw on the notes, then change them

Ask for a hint on this pair and the first screen only tells you where to look. Show why is the next button. That screen strikes the digits the move removes: 1 and 8 in row 7 column 1, and 8 in row 7 column 9. The strike is a drawing. Your note is still stored underneath.

Apply is what changes the notes. For this pair the button says Apply, not Place it, because the pair itself doesn't fill the cell. Apply takes 1 and 8 off those notes and remembers the elimination, so the next step and Auto Candidate Mode both see it. The following hint can place the 4. Place it, on that later hint, is the one that writes the digit.

There's a second button that applies every currently available step of the same technique, as one undo. On a board with a single pair it just plays that pair. I leave it until I can see the marks myself.

[Hidden singles](/techniques/hidden-single/) and [naked singles](/techniques/naked-single/) are still the fills. Notes don't replace them. A cell whose list has shrunk to one digit is a naked single, and you should place it instead of admiring the note. A digit that appears once in a unit is a hidden single even if its cell lists other digits. The extra digits are the notes you haven't cleaned. Placing the hidden single is how they come off.

On a phone the marks are small. The type starts around 11 pixels and grows with the cell, up to about 15. Tapping a spot inside a selected cell is fiddly, and Candidate mode matters more because a stray pad tap places a digit. [Sudoku on your phone](/articles/sudoku-on-your-phone/) is the layout, the install, and what still works offline. The notes themselves are the same 3 by 3.

Set row 7 up from the grid above, or open the pair practice, and find the 1s and 8s before you read the strike. If column 1 isn't left with 4, the notes aren't finished. Write less, and erase the ones a placement killed. The decoration can go.
