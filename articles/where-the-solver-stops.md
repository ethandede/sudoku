---
title: "Where Our Solver Stops on AI Escargot and Inkala"
slug: where-the-solver-stops
meta_description: "Where our solver stops on AI Escargot and Inkala's 2012 puzzle: one hidden single, then nothing, on grids that still have exactly one solution."
summary: "I graded AI Escargot and Arto Inkala's 2012 puzzle with the same teaching solver that finishes all 1,483 archived NYT puzzles. Both grids have one solution. Escargot yields one hidden single. The 2012 grid yields nothing."
publishDate: 2026-10-27
---

<!-- REQUIRES: techniques (/techniques/ pages linked below), articles /articles/nyt-medium-vs-hard/, how difficulty works (/how-difficulty-works/) -->

# Where our solver stops

In 2006 Arto Inkala published a 23-clue sudoku and called it AI Escargot. In 2012 he published another, with 21 clues, and the press called that one the hardest sudoku ever. I like a boast I can check. So I ran both grids through the solver that grades puzzles on this site.

Both have exactly one solution. The solver still stops. Escargot gives up one [hidden single](/techniques/hidden-single/) in a box, then nothing. The 2012 grid gives up nothing at all. That is a fact about this solver's list of techniques, not a ranking of the hardest puzzle in the world.

## What "stops" means

The solver plays the easiest move it knows. Singles first, then [pointing](/techniques/pointing/) and claiming, then pairs, triples, and quads, then an X-wing, an XY-wing, a swordfish, and the later patterns: skyscraper, kite, XYZ-wing, W-wing, unique rectangle, BUG+1, [coloring](/techniques/coloring/), and an [XY-chain](/techniques/xy-chain/). The chain is the end of the list. If none of those detectors fires, it stops and says so. It does not guess. It does not start a search.

Stopping is a specific failure. The puzzle can still have one completion. A different program, the one that searches for a completion, is how I checked. I asked it for at most two solutions. Both grids returned one. "Exactly one solution" and "our teaching list can find it" are different sentences, and only the first one is true here.

The script is `articles/data/solver-stops/analyze.mjs`. It grades the two grids and, as a control, the same New York Times archive used elsewhere on the site. No clock is recorded. I care where the list runs out, not how fast a machine notices.

## Escargot gives you one cell

AI Escargot, 23 clues:

```
+-------+-------+-------+
| 1 . . | . . 7 | . 9 . |
| . 3 . | . 2 . | . . 8 |
| . . 9 | 6 . . | 5 . . |
+-------+-------+-------+
| . . 5 | 3 . . | 9 . . |
| . 1 . | . 8 . | . . 2 |
| 6 . . | . . 4 | . . . |
+-------+-------+-------+
| 3 . . | . . . | . 1 . |
| . 4 . | . . . | . . 7 |
| . . 7 | . . . | 3 . . |
+-------+-------+-------+
```

`100007090030020008009600500005300900010080002600004000300000010040000007007000300`

The grader places one digit. It is a hidden single inside a box: one cell in that box can hold a digit the rest of the box has lost. That is the entire solve. After that placement the technique list is empty. No pointing, no pair, no fish, no wing, no chain. 24 cells are filled (the 23 clues plus that one single) and 57 are still empty. One stall, and the list is done. That is the sort of move a careful beginner finds, and there is no second one.

## The 2012 grid gives you zero

Inkala's 2012 puzzle, 21 clues, the one the newspapers picked up:

```
+-------+-------+-------+
| 8 . . | . . . | . . . |
| . . 3 | 6 . . | . . . |
| . 7 . | . 9 . | 2 . . |
+-------+-------+-------+
| . 5 . | . . 7 | . . . |
| . . . | . 4 5 | 7 . . |
| . . . | 1 . . | . 3 . |
+-------+-------+-------+
| . . 1 | . . . | . 6 8 |
| . . 8 | 5 . . | . 1 . |
| . 9 . | . . . | 4 . . |
+-------+-------+-------+
```

`800000000003600000070090200050007000000045700000100030001000068008500010090000400`

Zero placements. The opening grid has no naked single and no hidden single, in a box or in a line. Nothing further down the list applies either, because those detectors never get a board that singles have simplified. 21 cells filled, 60 empty, technique list empty, one stall. The search check still says exactly one solution.

People talk about these puzzles as if the hard part were a very long chain. On this solver the chain tools, which do exist, never get a turn. There is no pair to clear, and there is not even a single.

## The newspaper, by comparison

I ran the same function on the [vivrao9/nyt-sudoku](https://github.com/vivrao9/nyt-sudoku) archive, August 30, 2021 through March 2, 2024. Easy, Medium, and Hard are 495, 494, and 494 puzzles. The solver finished all 1,483. None were corrupt, and none had a second solution. SudokuSudoku is not affiliated with The New York Times.

[Why NYT Medium sometimes feels harder than Hard](/articles/nyt-medium-vs-hard/) is about two labels that sit close together. These two grids are not in that neighborhood. Every Hard puzzle in that archive still resolves with techniques this solver already has. Escargot and the 2012 puzzle do not resolve with any of them. The gap is a board on which the list never starts.

[How difficulty works](/how-difficulty-works/) stops the named grades at an XY-chain. Mental is that ceiling on purpose. I do not deal Escargot as a Mental. Mental means the chain was required and the puzzle then finished. These two do not finish. Serving them under a grade name would be a lie about the grade.

## What this run does not show

It does not show that either puzzle is the hardest sudoku. I graded two famous grids and one newspaper archive. I did not grade the rest of the hard-puzzle canon, and I do not have a scale that would rank them if I had. A longer list will get further. That does not make this list wrong. It makes the result a statement about this list.

It does not show that a human cannot finish them. A person can invent a pattern this code does not have, or follow a chain longer than the ones we coded. I only know that the logic we shipped, applied easiest move first, is not enough.

It does not show that the puzzles are unfair. Unfair, for me, would be zero solutions or two. Both grids have one. The digit strings are above, and the script counts solutions before it tries to teach anything.

It says nothing about speed. A search that only has to find the one completion is a different tool from a solver that has to name the move. I used the search to confirm the completion exists. The teaching solver's failure is that it has no next move.

## The wall in front of the techniques

If you sit down with Escargot expecting to hunt an X-wing, you are already past the point where this solver died, and you have not earned that hunt. The one available move is a hidden single in a box. After you place it, you are in the same room as the 2012 puzzle: a legal sudoku, one answer, and no technique on our list that will touch it.

Newspaper puzzles, including the hard ones, stay inside the list. These two step outside it before the list has done any work. When I add a technique, the test I want is not whether it fires on a puzzle we already solve. It is whether it moves one of these boards. Until something does, Escargot remains a hidden single and a shrug, and the 2012 grid remains a shrug with no single in front of it.

Paste either string into a solver that only searches, and you will get the completion. Paste it into this one, and you will get the stop. I trust the second answer more, for learning, because it refuses to pretend a guess was a technique.

## References

1. Inkala, A. AI Escargot (2006) and the 2012 puzzle circulated as the world's hardest sudoku. Graded here as the 23-clue and 21-clue grids printed above.
2. Rao, V. nyt-sudoku. <https://github.com/vivrao9/nyt-sudoku>. The 1,483 comparison puzzles are Easy, Medium, and Hard from August 30, 2021 through March 2, 2024.
3. SudokuSudoku solver and the counting script, `assets/js/solver.js` and `articles/data/solver-stops/analyze.mjs`. <https://github.com/ethandede/sudoku>
