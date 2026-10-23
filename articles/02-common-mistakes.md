# Sudoku mistakes I still make

**Meta Description:** Sudoku mistakes I still make: skipping the box, a misread 6, notes left behind by a wrong digit, and a guess in a cell that still has two candidates.

**Keywords:** sudoku mistakes, notes, checking a placement

---

![A digit checked against its row, column, and box.](/articles/images/mistakes-three-checks.svg "640x360")

I still get a grid that goes dead. Nothing left fits. I sit there blaming the puzzle, then find a 6 I placed about twenty moves earlier. The 6 was never legal. I had checked the row and the column and felt done. The box already had a 6. I would like to say I only did this as a beginner. I still do it.

These are the ones I actually hit. Each of them makes a later cell look impossible, and the later cell is usually fine.

## Skipping the box

The rule is short. A digit can go in a cell when its row, its column, and its box do not already contain it. I wrote that up, with a 4×4 and a full Easy, in [how to play Sudoku](/articles/beginners-guide/). The mistake is dropping the third check when you are moving fast.

This board was generated here. 38 clues, one solution, and the grader never has to leave singles. You can follow the cell below on the starting grid. Nothing else has to be filled in first.

```
+-------+-------+-------+
| 8 2 . | . 9 6 | 3 . . |
| . . 1 | . . 7 | . . . |
| 9 . 3 | 1 4 2 | 5 . . |
+-------+-------+-------+
| 4 3 . | 7 . . | 2 . . |
| 7 . . | . 3 5 | 1 . . |
| . . . | 9 2 . | 8 . . |
+-------+-------+-------+
| . . . | 4 5 . | 6 . 3 |
| 3 1 . | . . 9 | 4 8 2 |
| . . 4 | . . 3 | 7 . 9 |
+-------+-------+-------+
```

Look at row 2, column 5. Empty. It is in the top-middle box, with row 1, column 6.

Row 2 already has 1 and 7. Column 5 already has 9 (row 1), 4 (row 3), 3 (row 5), 2 (row 6), and 5 (row 7). The box already has 9, 6, 7, 1, 4, and 2.

Put those together and eight digits are spoken for: 1, 2, 3, 4, 5, 6, 7, and 9. The cell is 8. One cell, one digit. That is a [naked single](/techniques/naked-single/).

Now the bad version, which is the one I play. Ask only whether 6 can go there. Row 2 has no 6. Column 5 has no 6. So 6 looks open. It is not open. Row 1, column 6 is a 6, and that given sits in the same box. Place the 6 and every later digit is being asked to survive a board that already broke.

The 8 was there the whole time. The box was the difference between a single and a mess.

On this site the selected cell highlights its row, its column, and its box. That highlight is on by default. I still walk past it. Saying the three checks is slower than trusting my eyes, and the eyes are the problem. [Practice a naked single](/?practice=naked-single) if you want a pile of these with the earlier steps filled in.

## Reading a 6 as something else

Same board, same given. Row 1, column 6 is a 6. Read it as an 8 and the story flips.

You now think the box already has an 8, so row 2, column 5 cannot be 8. You also think the box has no 6. The row has no 6 and the column has no 6, so 6 becomes the digit you place. The real single was 8. The misread handed you the trap from the last section and hid the answer at the same time.

6 and 8 do this to me. So do 1 and 7, on a small phone, late. The fix is dull. When a region feels tighter than the level should be, I go back to the givens in that box and read the ink, not the digit I expected. A given does not move. If my story needs a given to be a different number, the story is wrong.

The site will mark a conflict once two of the same digit share a house, if that highlight is on. It will not catch a given you misread before you have placed the duplicate. The misread feels like a hard puzzle. It is a reading error. I have burned a Hint on one of these and felt ridiculous when the hint pointed at a cell I had simply misread.

## Notes that stayed, or notes that left

![A cell whose remaining notes are 2, 5, and 8.](/articles/images/mistakes-notes.svg "640x360")

Pencil marks are how you remember a cell that is not a single yet. They are also a second grid you can lie to.

On paper I do both extremes. Some days every empty cell wears six tiny digits and I cannot see a single if it waves. Some days I keep it all in my head and then forget which cell was 3 or 7. What works for me is narrower. I write notes when a cell is down to two or three digits. I skip the cells that still have a crowd. Then I actually look at the pairs.

The N key toggles notes. In that mode, keys 1 through 9 add or remove a candidate in the selected cell. Auto Candidate Mode, under the pad, fills every empty cell from the rules. It is off until you turn it on. Those notes are computed, so they follow the board. They cannot go stale on their own. Handwritten notes can, and a wrong placement makes a special mess of them.

Here is the part that bit me on this site. When you place a digit, the game removes it from your notes in that row, column, and box. It does this even when the digit is wrong. The notes are now consistent with a bad board. A candidate that was legal is gone, because the wrong digit "used it up." If you keep solving from those notes, they will argue for the mistake.

Erase is not the repair. Erase clears the cell. The mistake count stays, and the notes that were stripped stay stripped. Undo puts the entry back, puts the notes back, and rolls the mistake count back with that entry. If you erased first, one Undo restores the wrong digit. Undo again to take the placement itself off. I lost a puzzle by erasing, nodding at the clean cell, and trusting notes that still believed the error.

If Check guesses as you go is on, a wrong entry also counts. That setting is on by default, and the counter shows it. Four wrong entries and the puzzle stops. The screen says too many mistakes. Undo from that screen still rolls one back. You can turn the check off. Then there is no limit, which sounds friendly until a wrong digit sits there unmarked and the notes rearrange around it. I leave the check on.

## Guessing while a single is still there

A guess is a digit you place in a cell that still has two or more legal candidates, because you are tired of looking.

On the board above, row 2, column 1 can be 5 or 6. Both fit that row, that column, and that box on the starting grid. The 6 at row 1, column 6 is a different box, so it does not block this cell. The solution is 5. Place a 6 and the puzzle no longer has a solution. You will not feel that at the cell. You will feel it later, when some other cell has nowhere to go.

That is the annoying shape. The guess was legal where you put it. The digits after it can all be legal given the guess. The contradiction is downstream. Unwinding twenty placements by hand is a bad afternoon. Undo is faster, if I notice before I have stacked a lot of them.

Before I guess, I want a pass that could have found a single. One digit at a time, 1 through 9. For each digit, every row, every column, every box. A [hidden single](/techniques/hidden-single/) is a digit with one home in a house, even when that cell still shows another candidate. Naked singles are the cells with one candidate left. If either one exists, the guess can wait. [Practice a hidden single](/?practice=hidden-single) if that pass is the part that slips.

If the pass is actually empty, you are off singles. Easy on this site stops at singles. [Not Easy](/?difficulty=not-easy) is where pointing or claiming shows up. Hard asks for a pair or a triple. Guessing there still does not teach the move. The hint names the technique, shows the cells, then shows the placement. I would rather take the name and open the page than bury a guess under a finished-looking grid. The names live in the [technique library](/techniques/). How those names become a level is [how difficulty works](/how-difficulty-works/).

## A grid that has already broken

Sometimes the mistake is not the cell in front of you. It is that you are still playing.

Two signs. The same digit twice in a row, a column, or a box. Or a cell whose candidates are gone, while the cell is still empty. Both mean an earlier placement cannot stay. A new technique will not rescue it. I have invented some very creative logic to avoid walking backwards. None of it was logic.

Stop. Check the last few digits you were sure about, then the ones you were not. On this site, Undo is the walk back. If the counter already moved, that entry was wrong at the time, even if Erase has since cleaned the ink.

Then I look at the givens in the box where it broke. Misreads hide there. So do skipped boxes. The [beginner's board](/articles/beginners-guide/) has the same shape as the 6 in this article: a 5 that looks fine in a row and a column, and is already sitting in the box.

## What I do on the next one

I pick a cell. I check the row, the column, and the box, in that order, out loud if the room is empty. If more than one digit fits, I note them or I leave the cell. I do not spend it.

When I am stuck I run one digit across the whole grid before I change digits. If that finds nothing, I take a hint and I read the name of the move before I let it place anything. Then I play another puzzle and try to spot that move myself.

[An Easy](/?difficulty=easy) is the right place to practice the box check. The board in this article is one of those. The contradiction you find twenty moves later is almost always one of the mistakes above, sitting there, looking like a hard puzzle.
