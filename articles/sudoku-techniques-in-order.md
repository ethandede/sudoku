---
title: "Sudoku Techniques in the Order You'll Actually Need Them"
slug: sudoku-techniques-in-order
meta_description: "Sudoku techniques in the order a puzzle forces them. Across 1,483 NYT puzzles, pointing does the work, and an X-wing never has to fire."
summary: "I graded 1,483 NYT puzzles and 900 generated ones with our easiest-first solver. Pointing is the technique you actually use. An X-wing is a rare forced step, and only once the puzzle has left newspaper Hard behind."
publishDate: 2026-10-29
---

<!-- REQUIRES: techniques (/techniques/ pages linked below), articles /articles/nyt-medium-vs-hard/, how difficulty works (/how-difficulty-works/) -->

# The order you'll actually need them

I learned the X-wing years before a puzzle asked me for one. I could sketch the rectangle. I still couldn't find it in a grid, and I treated that as a personal failing.

The grader on this site says the rectangle was fine. The puzzles were the part I had wrong. It plays the easiest legal move, and a harder technique only when nothing easier exists anywhere on the board. Then it writes down which technique that move was. I ran it on a public archive of New York Times sudoku, and on 300 generated puzzles each at Hard, Expert, and Mental.

Short version. On a newspaper puzzle you need [singles](/techniques/naked-single/), then [pointing](/techniques/pointing/). [Claiming](/techniques/claiming/) and [pairs](/techniques/naked-pair/) show up once the paper calls it Hard. An [X-wing](/techniques/x-wing/) does not show up at all.

## What "need" means here

The solver checks [naked singles](/techniques/naked-single/) and [hidden singles](/techniques/hidden-single/) before anything else. When those run out it tries pointing, then claiming, then a [naked pair](/techniques/naked-pair/), a [hidden pair](/techniques/hidden-pair/), [triples](/techniques/naked-triple/), [quads](/techniques/quads/), an X-wing, an [XY-wing](/techniques/xy-wing/) (the Y-wing, same pattern), a [swordfish](/techniques/swordfish/), then the other wings, [coloring](/techniques/coloring/), and an [XY-chain](/techniques/xy-chain/). That is the detector order in `assets/js/solver.js`.

A technique shows up when that detector fires. An X-wing can sit on the grid while a pointing or a pair is still available. I counted plays, not latent shapes.

The script is `articles/data/technique-order/analyze.mjs`. Fixed seeds, so a rerun on this solver reproduces the tables. [Why NYT Medium sometimes feels harder than Hard](/articles/nyt-medium-vs-hard/) already compared the labels. This piece opens the step list behind those paths, instead of stopping at each puzzle's single hardest technique.

## The newspaper, one step at a time

The puzzles are the [vivrao9/nyt-sudoku](https://github.com/vivrao9/nyt-sudoku) archive, from August 30, 2021 through March 2, 2024. That is 495 Easy, 494 Medium, and 494 Hard: 1,483 puzzles. SudokuSudoku is not affiliated with The New York Times.

The solver finished all 1,483. None of them had two solutions, and none came back corrupt.

Easy never leaves singles. It placed 21,285 digits, and the technique list for every one of those puzzles is empty. If you can find a naked single and a hidden single, you can finish every Easy in this set. That is the whole grade.

Medium is one technique. All 1,211 non-single steps are pointing, on all 494 puzzles. Claiming is absent, and pointing is the first move every time the singles run out. Of 29,329 moves (a placement or a candidate elimination), 28,118 are still singles: 95.9%.

Hard is where people expect the textbook to take over. It doesn't. There are 2,917 technique steps across the 494 Hard puzzles:

| Technique | Steps | Share of steps | Puzzles |
| --- | --- | --- | --- |
| Pointing | 1,795 | 61.5% | 474 |
| Claiming | 480 | 16.5% | 282 |
| Naked pair | 409 | 14.0% | 289 |
| Hidden pair | 198 | 6.8% | 154 |
| Naked triple | 24 | 0.8% | 22 |
| Hidden triple | 11 | 0.4% | 11 |

A puzzle can land in more than one row, because these are plays, not a single label. The first step after singles dry up is pointing on 464 of 494 (93.9%). Claiming opens 16, a naked pair opens 10, and a hidden pair opens 4. None of them opens on a triple.

Add the singles back in and the picture gets even more lopsided. Hard plays 28,282 singles and 2,917 technique steps, 31,199 moves. Singles are 90.7% of them.

And then the list stops. No quad. No X-wing. No swordfish. No XY-wing. No skyscraper, kite, or other wing. No coloring. No XY-chain. Zero steps, on all 1,483 puzzles. Newspaper Hard, in this window, is a pointing puzzle that sometimes asks for a pair and, on a thin slice, a triple.

That is why the X-wing is so hard to spot in the puzzle you actually play. You are not missing it. The easier move is still there, so a solver that takes the easier move never plays it. If your scan for rectangles starts the moment the singles stall, you have skipped the move that opens 93.9% of these Hard puzzles.

## Once the paper runs out

Our grades pick up where that archive ends. [Hard](/how-difficulty-works/) here is a pair or a triple, so an X-wing cannot be the step that sets the grade. Expert is the next band in this solver, from quads through BUG+1. Mental is coloring or an XY-chain. I kept 300 fresh puzzles at each grade, seed `technique-order:<level>:<n>`, and dropped anything from the fallback pool. None of the 900 used a relaxed clue window. Hard took 321 seeds (21 pool draws), Expert 301, Mental 662 (362 pool draws).

Generated Hard is the newspaper with the volume up. 1,936 technique steps:

| Technique | Steps | Share of steps | Puzzles |
| --- | --- | --- | --- |
| Pointing | 1,146 | 59.2% | 297 |
| Naked pair | 332 | 17.1% | 243 |
| Claiming | 331 | 17.1% | 196 |
| Hidden pair | 108 | 5.6% | 95 |
| Naked triple | 14 | 0.7% | 13 |
| Hidden triple | 5 | 0.3% | 5 |

Pointing is in 297 of 300. The first technique step is pointing on 295 of them. Singles are 16,855 of 18,791 moves, 89.7%. Same shape as the Times. I would be worried if it weren't.

Expert is where an X-wing is finally a legal way to satisfy the level. In 300 puzzles the solver played one on 53 of them, 55 times. That is 17.7% of puzzles and 3.0% of the 1,847 technique steps. A swordfish showed up on 11 puzzles (0.6% of the steps). An XY-wing showed up on 154 puzzles, 198 times. A [skyscraper](/techniques/skyscraper/) showed up on 125. Pointing was still the most common technique step, 716 of 1,847 (38.8%), in 241 of the 300 puzzles.

Singles were 16,618 of 18,465 moves, 90.0%. The long tail is in the summary file: claiming 190 steps, naked pair 211, hidden pair 119, [W-wing](/techniques/w-wing/) 70, [two-string kite](/techniques/two-string-kite/) 44, [XYZ-wing](/techniques/xyz-wing/) 28, naked triple 25, [unique rectangle](/techniques/unique-rectangle/) 18, hidden triple 7, [BUG+1](/techniques/bug-plus-one/) 7, naked quad 2. With the steps above, that is all 1,847.

When this generator leaves triples behind, it reaches an XY-wing, then a skyscraper, then an X-wing. Swordfish is not next on the syllabus.

Mental moves the ceiling to chains. An XY-chain was played on 286 of 300 puzzles, 442 times, 15.2% of 2,903 technique steps. Coloring was played on 26 puzzles, 29 times. The X-wing count falls to 35 puzzles. Swordfish stays at 11. Pointing is still the largest technique bucket, 1,012 steps, 34.9%. Singles are 17,140 of 20,043 moves, 85.5%. The chain is what the grade demands. It is not what most of the solve feels like.

## The order I'd actually study

Learn singles until they are boring. Then pointing, which is every Medium here and the first real step on 93.9% of the Hards. Then claiming and the two pairs. Then triples. Then an XY-wing and a skyscraper, which is where Expert actually spends its steps. The X-wing belongs in that stretch. It does not belong first, and on this newspaper archive the solver is never forced to play one.

Each technique page can deal a puzzle that stops on that move. A [Hard](/?difficulty=hard) here asks for a pair or a triple. An [Expert](/?difficulty=expert) is where a wing or a fish is required. Every step count, including the ones I only named, is in `articles/data/technique-order/summary.json`.

## References

1. Rao, V. nyt-sudoku (archived New York Times sudoku). <https://github.com/vivrao9/nyt-sudoku>. The 1,483 puzzles graded here are the Easy, Medium, and Hard grids from August 30, 2021 through March 2, 2024.
2. SudokuSudoku solver and the counting script, `assets/js/solver.js` and `articles/data/technique-order/analyze.mjs`. <https://github.com/ethandede/sudoku>
