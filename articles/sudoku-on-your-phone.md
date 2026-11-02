---
title: "Sudoku on Your Phone"
slug: sudoku-on-your-phone
meta_description: "There is no app-store app. How SudokuSudoku's board, notes, daily, and offline play work on a phone."
summary: "The phone layout of this site: the pad under the board, small candidate marks, the daily, saving, and what still runs with no signal."
publishDate: 2026-10-30
---

<!-- REQUIRES: the phone layout, install prompt, offline shell, and account modal as they ship, articles /articles/how-to-use-sudoku-notes/, /articles/how-to-solve-a-hard-sudoku/, /articles/what-to-do-when-stuck/ -->

# Sudoku on Your Phone

![One cell in Candidate mode. Notes 1 and 8 are dark. The other digits are faint, in the usual 3 by 3 spots.](/articles/images/phone-cell.svg "420x300")

There isn't a SudokuSudoku app in a store. The site is the game. Open it in the phone's browser, and if you want it on the home screen you add it yourself. I play most of mine that way, one thumb, on the couch. Teddy is usually asleep through the whole thing. Black coat, white patch on his chest, and he has never once looked up when the board covers itself because I switched apps.

This is what the phone actually does. I checked it in the code that ships the site, because "it works on mobile" is a sentence that has lied to me before.

## The board is on top

On a narrow screen the grid sits above the controls, as wide as the page, and square. Under it is the pad. The first row is 1 through 5. The second is 6 through 9 and a ×, which is Erase. Once the window is about 721 pixels wide, the pad moves beside the board, becomes a 3 by 3, and the × turns into the word Erase. A phone in portrait stays in the stacked layout. A tablet, or a phone turned sideways and wide enough, gets the side pad.

The level name is a button. It might say Easy, Hard, or Daily. Tap it and the list opens: Daily, Quick, Easy, Not Easy, Hard, Expert, Mental. It isn't a row of tabs sitting on the screen. Daily is a Not Easy puzzle for the UTC date, so it changes at midnight UTC. On the West Coast that's 5pm while daylight saving time is on, and 4pm in the winter. [Today's daily](/?daily) is that puzzle. A [Hard](/?difficulty=hard) is the same generator the walkthroughs use, just not tied to the date.

The menu, on a screen about 768 pixels wide or less, is the hamburger. A dropdown in that menu opens in place instead of navigating away. The installed version, once you add it, hides the site header and footer entirely and pads itself into the phone's safe areas. More on adding it below.

## Notes, at about 11 pixels

The diagram at the top is one cell the way the site draws candidates. 1 is top left. 8 is bottom middle. 9 is bottom right. The faint digits are the ones that aren't candidates. There is no second layer of corner marks. If you pencil in corners on paper, that habit stays on paper. [How to use Sudoku notes](/articles/how-to-use-sudoku-notes/) is the full version of what a placement clears and what it leaves.

On the phone those marks are small. The type starts around 11 pixels and grows with the cell, up to about 15. The button says Candidate, not Notes. The N key still toggles it, and the little N badge is hidden on a touch screen, so don't go looking for it.

The first tap on a cell only selects it. A second tap on a digit's spot inside that empty cell toggles the note. Touch doesn't fade a preview of the digit the way a mouse does. With Candidate off, the pad places a full digit. That's the mistake I make when the button state is easy to miss: I meant a note and I entered a number.

Those 1 and 8 marks aren't a sketch. They're row 7, column 2 of a real Hard, at the moment a naked pair is the next move. Column 8 of the same row is the other cell, also only 1 or 8. The solve is in [how to solve a Hard](/articles/how-to-solve-a-hard-sudoku/). The grid, if you want to set it up:

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

Auto Candidate Mode, the checkbox under the pad, fills the legal digits for you. A digit you wrote by hand still shows even if it isn't legal anymore. The notes article is where that gets picky. On a phone I turn auto on once the singles stop, because tapping every candidate into an 11-pixel grid is a bad hobby.

Each pad key also shows a tiny 3 by 3 of which boxes already contain that digit, and a count of how many are left. When the count hits 0 the key goes dull and won't press. That map is on unless you turn off "Show box map on number pad" in Settings. I leave it on. It's the fastest way to see that a 7 is already done in the middle-right box without scanning the whole grid with a thumb.

## When you get it wrong, or you leave

"Check guesses as you go" is on by default. A wrong digit goes red and gets a slash, and the counter reads Errors, out of 4. The fourth one ends the puzzle: "Too many mistakes," with Undo for the last entry or a new game. A wrong entry also throws away eliminations a hint had stored. [What to do when you're stuck](/articles/what-to-do-when-stuck/) is the order I use before I start guessing.

The hint is the ? button, and it's also under More. It opens a sheet. The first pass tells you where to look. Show why is the reason, and you can swipe the sheet down to dismiss it. If a digit on the board is wrong, the sheet says so and won't teach the next technique until you clear it.

Leave the phone, switch apps, or lock the screen, and the timer pauses. The board covers itself with Paused. Come back and it resumes, unless you had paused it yourself with the button.

Vibrate on entry and mistakes is on unless you turned it off. A correct digit is a short buzz. A wrong one is two pulses. Nothing happens if the phone doesn't vibrate. Plenty of them don't, including a lot of iPhones. The setting isn't a promise.

Appearance is in Settings: match the system, which is the default, or force light or dark. The browser's theme color follows. There is no battery-saver mode and no keep-awake. If the screen sleeps, that's the phone, and the pause above is what the site does about it.

## The puzzle stays on the device

The game saves itself in the browser: the board, your notes, the timer, the mistakes, whether Candidate was on. Come back and, if a save exists, it asks "Resume or start new?" A private tab can refuse to store that. If the puzzle vanishes when you close the tab, that's the usual reason.

A practice link is the exception. Opening `/?practice=naked-pair`, or any other technique, skips the resume question and starts the drill. That drill is what gets saved, over the puzzle that was on the phone. Resume the old one before you open the link, if you still want it. Practice doesn't count toward times, streaks, or badges. The prompt tells you the technique, and the easier steps are already filled.

The account is optional, and it is real. Stats, streaks, settings, and an unfinished puzzle stay on the device either way. Sign in from Settings or Stats with your email. The message has a sign-in link and a 6-digit code, no password, and they expire in 15 minutes. That copy is for another visit or another device, and sending it needs a connection. Delete my account removes the server copy. The phone keeps its own.

## Offline, and the home screen

After the game has loaded once, a new puzzle and the daily are generated on the phone. They don't need a signal. The offline page says the puzzle is saved on this device, and that you can keep playing, including a new game or today's daily.

Articles and technique pages are a different cache. One you've already opened can come back. One you haven't may not load until you're online. The account and the community stats need the network. I don't treat a subway ride as a good time to read a technique page I've never visited. The puzzle itself is fine.

Adding it to the home screen is not an install from a store. After you solve a puzzle, not a revealed one, the solved dialog can offer it, if you're on a phone, you haven't dismissed it, and you aren't already in the installed version.

On an iPhone the line is: tap the Share button, then Add to Home Screen. There is no Add button in our dialog, because iOS doesn't give the site one.

On an Android phone, if the browser is willing, the line is "Add Sudoku to your home screen and it opens like an app," and there is an Add button.

If the browser doesn't offer that, the line is to open the browser menu and tap Add to Home Screen.

Not now remembers the dismissal. The installed copy opens like an app, in portrait, without the website header, the footer, or the tagline under the title. The manifest calls it SudokuSudoku and says it plays offline, which is true for the game and not a promise about every article.

Share and Share image show up after a real solve. Not after practice, not after you reveal the puzzle, and not if steps were filled for you. Share uses the phone's share sheet when it has one, and otherwise copies the text. Share image shares the picture or downloads it.

Set the pair grid up, or just start a Hard, and play one on the phone before you add anything to the home screen. If the notes are too small to tap, turn Auto Candidate Mode on and use the pad. The × is erase. Four wrong digits is the limit.
