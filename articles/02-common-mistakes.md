# 7 Common Sudoku Mistakes (And How to Fix Them)

**Meta Description:** Sudoku mistakes I still make on this site: skipping the box, hitting Erase instead of Undo, and a wrong digit that blocks the hint.

**Keywords:** sudoku mistakes, undo, erase, notes, error counter

---

![A digit checked against its row, column, and box.](/articles/images/mistakes-three-checks.svg "640x360")

I had a Not Easy the other night that died with about twenty cells left. Nothing fit. The culprit was a 6 I had typed because the row and the column were clear. The box was not. Every digit after that was built on the 6.

The annoying part is that the site had already told me. I erased the cell, felt done, and kept going. The error counter did not move. This is the list I actually use now. It matches the buttons on SudokuSudoku.

## 1. Skipping the box

This is the one. You find an empty cell, the digit is not in the row, it is not in the column, and you type it. The box already had it.

Here is an Easy, 38 clues, one solution. Same generator the site uses.

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

Row 2, column 8 is empty. Row 2 has 3, 5, 9, and 1. Column 8 has 1, 6, 2, 3, and 7. From the row and the column alone, 4 and 8 both still look open.

The 4 is in row 1, column 7. Same box, the top right one. It never touches row 2 or column 8, so a scan that only walks the line will not see it. The cell is 8. A 4 there is wrong on the first check, not twenty moves later. I have still typed the 4.

On the site, click the cell first. Row, column, and box all light up, unless you turned those highlights off in Settings. Read the lit cells. Then look at the number pad. Each digit has a box map, nine little segments, one per box. The segment is filled when that box already contains the digit. If you are about to place a 4 and the top right segment is already on, stop.

The full walk of this cell, and of a hidden 5 in the top middle box, is in [how to play](/articles/beginners-guide/). The move itself is a [naked single](/techniques/naked-single/).

## 2. Erase is not Undo

The counter under the timer says Errors, and it stops at 4. Settings calls it the mistake counter. With "Check guesses as you go" on, which is the default, a wrong digit adds 1. The fourth one opens a box: too many mistakes. Four wrong entries close the puzzle. You can undo the last entry, or start a new game.

Undo puts the board back. Notes, the slash on the bad cell, and the error count all come from the snapshot taken before that entry. If the 4 in row 2, column 8 was the entry you just typed, Undo removes the 4 and the count drops by 1. That is the fix.

Erase is a different button. Backspace and Delete do the same thing as Erase. They clear the selected cell. The digit goes away, the notes in that cell go away, and the slash through the digit goes away. The counter stays. Peer notes that were deleted when you placed the digit stay deleted too. Placing a number always pulls that digit out of the notes in its row, column, and box. Erase does not write those notes back. Only Undo has them.

So the habit I had, type, wince, Erase, carry on, leaves the count one higher than the board looks. Do that three more times and the puzzle closes on an entry you were sure you had fixed.

While the "too many mistakes" box is up, Erase does nothing. The puzzle is stopped. Undo on that box takes back the last entry, the one that reached 4, and the count returns to 3. Earlier mistakes are separate. If you already cleared those cells with Erase, the cells are empty and the count still includes them. If you left them, they are still slashed. The next wrong entry closes the puzzle again.

Undo walks backward one action at a time. Correct digits you placed after the mistake come off the board with it. You cannot reach in and pull one 6 from fifteen moves ago. If the bad cell is old and the work since then is good, Erase the cell, accept that the count stays, and do not place anything else until the hint is willing to teach again. More on that below. If you want the count at 0 and you do not care about the entries since the first mistake, keep hitting Undo until you are past it. Reset Puzzle, under More, clears the board to the givens and sets Errors back to 0. That is the clean start. It also throws away every correct digit.

One more split in Settings. "Show mistake counter" only hides the number. The limit stays on. The puzzle still closes at 4, and you may not have been watching the number climb. The limit is "Check guesses as you go." Turn that off and there is no limit, and the counter stays at 0 because wrong entries are not counted. The settings note under the checkboxes says the same thing. I wish I had read it before I hid the counter and then wondered why the puzzle closed.

## 3. You were in Candidate mode

The switch says Normal and Candidate. N toggles it. In Normal, 1 to 9 writes a digit. In Candidate, 1 to 9 toggles a note in the selected empty cell. Same keys. Completely different result.

I do this when I am placing a run of singles and then want one note, and I forget to switch back. The cell stays empty. The puzzle looks stuck. It is not stuck. There is a small digit in the cell and no real entry. Look at the switch before you blame the grid.

The other direction is the same mess. You meant to note a 4 and an 8, the switch was on Normal, and you just placed a 4. If checking is on, that may already be an error. Undo. Do not Erase and retype, or the count keeps the error even after the cell looks empty.

You can also toggle a note by clicking the digit spot inside a cell, once the cell is already selected. The first tap only selects. A faint digit shows up if you rest the pointer on a spot. Touch screens do not do the faint digit. Either way, that click writes a note, not a placement, no matter which mode the switch is in. I have "placed" a number with a stray tap and then gone looking for it in the wrong house.

Givens ignore all of this. Notes will not stick to a clue or to a filled cell. If a tap does nothing, check you are on an empty cell that you are allowed to edit.

## 4. Notes that outlive the board

![A cell whose remaining notes are 2, 5, and 8.](/articles/images/mistakes-notes.svg "640x360")

A note is a claim about the board at the moment you wrote it. The board changes. The claim often does not.

Auto Candidate Mode is the version that keeps up. It recomputes every empty cell from the digits actually placed, plus any candidates a hint has already eliminated. Turn it on and the marks appear. Turn it off and they vanish. They are not your notes. "Start in auto-candidate mode" in Settings is the same switch, applied when a puzzle opens.

Your own notes are the other set. You type them in Candidate mode. The app does help a bit: when you place a digit, it deletes that digit from notes in the three houses. It does not delete the other digits you forgot to rule out. It does not know that your 2 was a guess. And if you Erase the placement, the peer notes stay gone. The auto marks, if the mode is on, come back for whatever the board currently allows. Your handwritten 2 does not get a second chance unless Undo rewinds the placement.

If both are on, a note you typed draws over the auto mark for that digit. Turning a note off does not hide the auto mark. The auto mark returns as long as the board still allows the digit. People try to "clean up" auto candidates cell by cell. You cannot. Turn the mode off if you want a quiet grid, or leave it on and stop fighting it.

The dangerous case is a wrong digit with auto candidates left on. The marks are computed from the board you see, and the board you see includes the mistake. Every peer of that wrong 4 loses 4 as a candidate. Cells that needed 4 go looking elsewhere. The pencil marks get neat, and they are lying. I trust them anyway, because they look like the app's work. They are the app's work, done on a bad digit.

With checking on, that cell is slashed, and a slashed digit does not light its segment on the box map. It does still count as placed for the little "how many are left" number on the pad. You can watch the 4 button tick down while the map refuses to fill the box. That disagreement is a tell. Trust the slash, and trust the box map. The count on the button still includes the wrong digit, and the auto marks around the cell were computed from it.

A stale note will also fake a naked single. One candidate left in the cell, except you never rubbed out a digit the column already contains. Count what is on the board. Then place it. If the notes and the grid disagree, the grid wins.

## 5. A wrong digit blocks the hint

The hint will not name a technique while any entered digit disagrees with the solution. The sheet says a digit on the board is wrong, so the next technique would not be trustworthy. Next it shows the cell. Then it clears it.

Clearing the cell this way empties it and takes the slash off. Errors stays where it is. If checking is on, the point was spent when you typed the digit. Undo puts that point back when the bad entry was your last action. Once you have played past it, let the hint clear the cell and leave the count alone.

Until that cell is empty, do not ask the hint what the next clever move is. It will keep pointing at the bad digit. Also do not keep placing around it. Auto candidates are poisoned, and so is any chain you try to see by eye. I have burned ten minutes on a pair that only existed because of a wrong 6 two boxes away.

More, then Check Puzzle, marks every wrong digit you have entered and tells you the count. Check Cell does it for the selected cell. Neither one adds to Errors. They are a look, not a penalty. A hint that has to stop and talk about a wrong digit does count as a check on your hint record. It is not recorded as a technique hint. Useful to know if you are trying to keep a no-hint solve. Opening the hint to hunt a typo still counts as using the check.

Reveal Cell and Reveal Puzzle are also in that menu. Reveal fills the solution. That is you deciding you are done learning this one. Reset is the other exit. I would rather clear the one bad cell and keep going.

## 6. Guessing when a single is still there

On an Easy, if you are choosing between two digits, you missed a single. I say this as someone who guesses anyway, then acts surprised.

A [naked single](/techniques/naked-single/) is a cell with one digit left. A [hidden single](/techniques/hidden-single/) is a digit with one home in a row, a column, or a box, even when the cell still shows other marks. The 5 in the top middle box of the grid above is one of those. The cell can be 5 or 7. The box has nowhere else for the 5. You do not flip a coin.

Quick and Easy on this site are singles only. If the singles have really dried up, you are not on an Easy anymore, or a wrong digit has eaten the one you needed. [Practice a naked single](/?practice=naked-single) or [a hidden single](/?practice=hidden-single) if you want the move served on its own. Practice fills the easier steps and stops when that technique is next. It does not touch your streak.

Guessing is how a clean grid becomes a contradiction you meet twenty entries later. The app will usually catch the guess immediately, because checking is on by default, and the guess does not have to repeat a digit in the house to count. The site knows the solution. A 4 in row 2, column 8 clashes with the box, so you might have seen it yourself. A different wrong digit can sit there with no duplicate at all. No conflict dot, just a slash, because "Highlight conflicts" dots a digit only when it actually repeats in a house. The slash is the solution check. The dot is the duplicate check. They are not the same mark.

If you turned checking off, that quiet wrong digit stays quiet. No slash, no count, no closed puzzle. The contradiction shows up later, when a house has no home for something. The hint can still see it, because the hint compares your digits to the solution even with checking off. That is the rescue. Use it before you start ripping out correct work.

## 7. Treating Fill as the solve

More, then Fill a technique, plays every copy of one technique that is available right now. The hint sheet has the same control once it is showing a move. The whole batch is a single Undo. That part is great. I have undone a fill I did not mean, and the board came back in one tap, notes and all.

The mistake is using it to get through a puzzle you do not understand. Fill marks the game as fast-forwarded. It will not count as a clean solve, and a practice game filled this way is not the "you spotted the technique" result either. You get a finished grid and the same hole next time.

Read the three beats on the hint first. Where to look. Why. Then the placement. The sheet links the technique page. If the name is new, open [the page](/techniques/) before you fill every copy of it. [Pointing](/techniques/pointing/) is the first move past singles, and [naked pairs](/techniques/naked-pair/) are the usual reason a Hard stalls. I do not memorize them from a filled grid. I memorize them from the one cell the hint made me look at.

There is a cap on Undo, eighty snapshots, which is more than a normal puzzle needs. Fill uses one of them for the batch, not one per cell. Placing a digit uses one. Toggling a single note uses one. Erase uses one. You will not run out. You can run out of patience if you Undo one note at a time trying to reach a mistake from the start of the puzzle. When that happens I Reset, honestly. Sorry to the correct digits.

## What I do when the grid goes quiet

I used to rescan the same rows until I was angry at a 6. This is the order that wastes less of the evening.

First I look for a slash, or I open Check Puzzle. If anything is wrong, I stop. Last entry, Undo. Older than that, clear it and leave the count alone.

Then I look at the mode switch, because I have lost minutes to Candidate.

Then one digit, boxes first. On an Easy I am hunting a single. The [how to play](/articles/beginners-guide/) page is that scan, on a board, if you want it slow. If the singles are gone and nothing is slashed, I stop pretending and open the hint, or I go practice the move I think I am missing.

Then I play another one. Staring at the corpse of a puzzle is how the same 6 gets typed tomorrow.

[Play an Easy](/?difficulty=easy) and leave the counter where you can see it. When it ticks, Undo. Not Erase.
