# Why NYT Medium sometimes feels harder than Hard

**Meta Description:** NYT Medium and Hard have almost the same number of clues. On 1,483 puzzles, the difference is the path, not the label.

**Keywords:** NYT sudoku, sudoku medium, sudoku hard, pointing pairs, sudoku difficulty

---

Medium and Hard, in the New York Times sudoku, are not far apart in the way a label suggests. Count the givens and they nearly match. Count the hardest idea each puzzle actually needs, and a slice of Hard never leaves the technique that every Medium uses. What changes is the shape of the path: how many cells you fill before you stall, and how often only one move is available when you do.

The figures below are from 1,483 New York Times sudoku puzzles published January 2023 through March 2024, archived by [vivrao9/nyt-sudoku](https://github.com/vivrao9/nyt-sudoku). Easy, Medium, and Hard are 495, 494, and 494 puzzles. This site isn't affiliated with The New York Times.

## The clues barely move

NYT Easy is a different puzzle: always 38 clues, and singles are enough. Medium and Hard sit on top of each other.

| | Medium | Hard |
| --- | --- | --- |
| Puzzles | 494 | 494 |
| Clues, mean (range) | 24.1 (21–27) | 23.7 (21–27) |
| Hardest technique | Pointing or claiming, every puzzle | 24% pointing only, 51% naked pair, 18% hidden pair, 6% triples |
| Non-single steps, mean | 2.45 | 5.90 |
| Stalls, mean | 1.23 | 1.90 |
| Bottleneck steps, mean (p10, median, p90, max) | 5.32 (3, 5, 8, 14) | 8.23 (4, 8, 13, 21) |
| Cells filled before the first stall, mean | 15.5 | 8.2 |

A bottleneck step is a point in the solve where only one move is available. A stall is a stretch where the singles have run out and a harder step has to open the puzzle again. Nothing in this set, at any NYT label, needs a technique past triples.

<div class="compare-chart" aria-label="Medium fills more cells before stalling, and has fewer bottleneck steps, than Hard">
  <p class="compare-title">Cells filled before the first stall</p>
  <div class="compare-row"><span class="compare-name">Medium</span><span class="compare-track"><span class="compare-fill" style="width: 100%">15.5</span></span></div>
  <div class="compare-row"><span class="compare-name">Hard</span><span class="compare-track"><span class="compare-fill is-hard" style="width: 53%">8.2</span></span></div>
  <p class="compare-title">Bottleneck steps, mean</p>
  <div class="compare-row"><span class="compare-name">Medium</span><span class="compare-track"><span class="compare-fill" style="width: 65%">5.32</span></span></div>
  <div class="compare-row"><span class="compare-name">Hard</span><span class="compare-track"><span class="compare-fill is-hard" style="width: 100%">8.23</span></span></div>
</div>

## Where Hard is the easier grade

About 24% of NYT Hard never needs a pair. The hardest step on those puzzles is pointing or claiming, which is exactly the hardest step on every Medium. If you picked one of those Hards and one of the tighter Mediums, the Hard can be the gentler solve. Medium's mean puzzle fills 15.5 cells before the first stall (the middle of the set fills 15; a few stall almost immediately, and the easy tail fills 25 or more). Hard fills 8.2 before that first stall, so you are asked to do something other than place singles sooner. The Hard label is carrying two different puzzles: a pointing puzzle that would have fit under Medium, and a pair or triple puzzle with a longer list of non-single steps (5.90 against Medium's 2.45).

The bottleneck counts tell the same story from the other side. Medium's path is narrower than its technique list. The mean Medium has 5.32 steps where only one move exists, on a puzzle whose only hard idea is pointing. Hard has more of those narrow steps (mean 8.23) because the puzzle is longer, not because the label guarantees a harder idea. A Medium with a long corridor of single available moves feels stuck. A Hard that is still only pointing does not have that reputation, and a quarter of them are that puzzle.

## How the levels here are split

This site doesn't reuse the NYT labels, because those two overlap. The split follows the technique the solver actually has to use.

- **Quick** and **Easy** are singles. Quick is hidden singles inside a box. Easy allows a hidden single in a row or column as well.
- **Not Easy** is pointing and claiming. It is aimed at the NYT Medium puzzles that stay on that grade: one to three non-single steps, and a bottleneck count kept between 3 and 11. In the archive, 387 Medium puzzles sit in that window. Their mean bottleneck count is 5.0, and they fill 16.4 cells before the first stall.
- **Hard** requires a pair or a triple, and at least four non-single steps, so it does not include the pointing-only puzzles that NYT calls Hard. Of the archived Hard puzzles, 314 need a pair or a triple and at least four such steps. That window's mean bottleneck count is 8.9, and it fills 7.2 cells before the first stall.
- **Expert** is where a quad, an X-wing, a swordfish, or an XY-wing is required. **Mental** is coloring or an XY-chain. Neither shows up in this NYT set.

A Not Easy puzzle can still feel tight. That is the Medium problem, kept on purpose: few hard steps, and a path that keeps narrowing. A Hard puzzle here will actually ask for a pair or a triple. The names describe the technique, which is the part the NYT labels sometimes don't. The windows, and one Hard board that passed them, are on [how difficulty works](/how-difficulty-works/).

The steps themselves are written up, with a board from this solver, in the [technique library](/techniques/). Pointing is the one [every Medium needs](/techniques/pointing/). The pair that shows up on about half of NYT Hard is the [naked pair](/techniques/naked-pair/).
