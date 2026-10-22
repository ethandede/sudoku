---
title: "More Clues Doesn't Mean Easier: What Actually Makes a Sudoku Hard"
slug: what-makes-a-sudoku-hard
meta_description: "A 68-clue Sudoku that needs an XY-wing, a 17-clue one you can finish with singles, and 2,280 graded puzzles. Clue count barely predicts difficulty."
summary: "I graded 2,280 generated puzzles and 5,000 of Royle's 17-clue puzzles with our own grader. Difficulty comes from the techniques a puzzle forces and how narrow the path is, not the number of givens."
publishDate: 2026-10-28
---

<!-- REQUIRES: hints (teaching hints that explain the move), techniques (/techniques/ pages linked below), stats (/stats/ page), articles /articles/nyt-medium-vs-hard/, /articles/history-of-sudoku/, /articles/why-being-stuck-is-good-for-you/ -->

# More Clues Doesn't Mean Easier

When I open a Sudoku, the first thing I do is glance at how full it looks. Lots of numbers, relax. Sparse grid, brace yourself.

I've played the [NYT puzzle](https://www.nytimes.com/puzzles/sudoku) nearly every day for years, and that instinct has been wrong often enough that I stopped trusting it. Some sparse puzzles fall apart in five minutes. Some busy-looking ones stop me cold.

Building the grader for SudokuSudoku let me test it properly. Short version: the number of givens tells you surprisingly little. What matters is which techniques the puzzle forces you to use, and how many times it leaves you with nowhere obvious to go.

I'm not the first to notice. Peter Ritmeester, who has set a weekly Sudoku for the Dutch newspaper *NRC* since 2005, said it in his [1,000th-puzzle column](https://www.nrc.nl/nieuws/2024/12/13/toen-de-sudoku-verdween-mailden-lezers-woedend-a4876352): "Many people think that the more given digits, the easier the puzzle. Number 1,000 shows that this isn't always the case" [1]. Here's the evidence from our own code.

## How a puzzle gets graded

[Our grader](https://github.com/ethandede/sudoku) solves a puzzle the way a careful person would, easiest available move first [2]. It only reaches for a harder technique when nothing easier works anywhere on the board. Roughly in order:

1. **Singles.** A cell with [only one possible digit](/techniques/naked-single/), or a digit with [only one possible cell](/techniques/hidden-single/) in a row, column or box.
2. **[Pointing and claiming](/techniques/pointing-and-claiming/).** A digit locked into one row or column inside a box, which removes it elsewhere in that line (or the reverse).
3. **[Pairs](/techniques/naked-pair/) and [triples](/techniques/naked-triple/).** Two cells that can only hold the same two digits, so those digits can go nowhere else in the unit.
4. **[X-wing](/techniques/x-wing/), [XY-wing](/techniques/xy-wing/), [swordfish](/techniques/swordfish/), [quads](/techniques/naked-quad/).** Patterns that span several rows, columns or boxes at once.
5. **[Coloring](/techniques/simple-coloring/) and [chains](/techniques/xy-chain/).** Following a digit, or a chain of two-option cells, across the grid.

The grade is the hardest rung it needed. The grader also records a few things I've come to think matter almost as much:

- **Stalls:** how many separate times you run out of singles and have to work something out.
- **Technique steps:** how many non-single moves the puzzle needs in total.
- **Forced moves:** points where only one move exists anywhere on the board. These are the moments where you stare at a grid for ten minutes.

Every example below was checked by computer to have exactly one solution. The high-clue ones were also re-checked with a separate Python solver I wrote earlier, and both gave the same grade.

## Example 1: 40 clues, still needs an X-wing

Straight out of the random sample described further down, nothing tuned. It has 40 givens, which is more than a typical NYT Easy.

`008735206000040890001908370704000009080009430003470008207504083400087052000690701`

```
+-------+-------+-------+
| . . 8 | 7 3 5 | 2 . 6 |
| . . . | . 4 . | 8 9 . |
| . . 1 | 9 . 8 | 3 7 . |
+-------+-------+-------+
| 7 . 4 | . . . | . . 9 |
| . 8 . | . . 9 | 4 3 . |
| . . 3 | 4 7 . | . . 8 |
+-------+-------+-------+
| 2 . 7 | 5 . 4 | . 8 3 |
| 4 . . | . 8 7 | . 5 2 |
| . . . | 6 9 . | 7 . 1 |
+-------+-------+-------+
```

It starts gently. Singles carry you from 40 filled cells to 67. Then they stop.

At that point, the 2s in row 3 can only go in columns 2 and 5, and so can the 2s in row 4. Whichever way those two rows resolve, columns 2 and 5 each get their 2 from rows 3 and 4. So no other cell in those columns can be a 2, and that removes the 2 from row 5, column 5. That's an X-wing. Even after that there's still no single anywhere, and it takes an XY-wing to break through.

A puzzle that looks like a warm-up, with 2 moves most casual players have never heard of.

## How far can you push it? 68 clues

Then I tried something sillier. I took a sampled puzzle that needed an XY-wing and kept adding back digits from its solution, one at a time, keeping each one only if the puzzle *still* needed an XY-wing. It stopped at 68 givens. Only 13 cells are empty.

`012097083039108062408203019853001297926375148147829635005934821384712956291586374`

```
+-------+-------+-------+
| . 1 2 | . 9 7 | . 8 3 |
| . 3 9 | 1 . 8 | . 6 2 |
| 4 . 8 | 2 . 3 | . 1 9 |
+-------+-------+-------+
| 8 5 3 | . . 1 | 2 9 7 |
| 9 2 6 | 3 7 5 | 1 4 8 |
| 1 4 7 | 8 2 9 | 6 3 5 |
+-------+-------+-------+
| . . 5 | 9 3 4 | 8 2 1 |
| 3 8 4 | 7 1 2 | 9 5 6 |
| 2 9 1 | 5 8 6 | 3 7 4 |
+-------+-------+-------+
```

There isn't a single single on the board. Twelve of the 13 empty cells have exactly two candidates, and every digit has at least two possible spots in every row, column and box.

The way in: row 1, column 4 can only be 4 or 6. If it's 6, then row 1, column 1 must be 5. If it's 4, then row 2, column 5 must be 5. Either way, a 5 lands in a cell that row 2, column 1 can see, so row 2, column 1 can't be 5. It must be 7, and the rest falls in seconds.

To be fair, this is a deliberate construction, not something you'd see in a newspaper. A seasoned solver might also find a shortcut based on the puzzle having one solution, which our grader doesn't use. Still. 68 clues, and the first move is an XY-wing.

## Example 2: 23 clues, nothing but singles

Now the opposite. Same random sample, 23 givens, fewer than the NYT Medium average.

`010040000000009005000030280700000010908005007000062000005000609000003000607000048`

```
+-------+-------+-------+
| . 1 . | . 4 . | . . . |
| . . . | . . 9 | . . 5 |
| . . . | . 3 . | 2 8 . |
+-------+-------+-------+
| 7 . . | . . . | . 1 . |
| 9 . 8 | . . 5 | . . 7 |
| . . . | . 6 2 | . . . |
+-------+-------+-------+
| . . 5 | . . . | 6 . 9 |
| . . . | . . 3 | . . . |
| 6 . 7 | . . . | . 4 8 |
+-------+-------+-------+
```

It looks intimidating. It isn't. There's always at least one single available, first move to last, so it never stalls. You scan carefully, but you never think in pairs or patterns. In our sample, 84 of the 196 puzzles with 22 to 24 clues were like this.

## Example 3: the 17-clue minimum

Seventeen clues is the fewest a Sudoku can have and still have one solution. That was proven by [an exhaustive computer search](https://arxiv.org/abs/1201.0749) published in 2012 [3], which I wrote about in the [history of Sudoku](/articles/history-of-sudoku/). Mathematician Gordon Royle collected 17-clue puzzles for years while hunting for a 16. His [collection](https://web.archive.org/web/20200726052010/https://staffhome.ecm.uwa.edu.au/~00013890/sudokumin.php) holds 49,158 of them [4][3].

I graded a random sample of 5,000 from that collection, using a [public copy of the list](https://github.com/607011/RateMySudoku/blob/master/collections/gordon-royle-17.txt). Here's one that needs nothing but singles:

`000000000000000001000002030000004250006000000017000080000070006400060000900800010`

```
+-------+-------+-------+
| . . . | . . . | . . . |
| . . . | . . . | . . 1 |
| . . . | . . 2 | . 3 . |
+-------+-------+-------+
| . . . | . . 4 | 2 5 . |
| . . 6 | . . . | . . . |
| . 1 7 | . . . | . 8 . |
+-------+-------+-------+
| . . . | . 7 . | . . 6 |
| 4 . . | . 6 . | . . . |
| 9 . . | 8 . . | . 1 . |
+-------+-------+-------+
```

And no, it's not a fluke:

| Hardest technique needed | Share of 5,000 seventeen-clue puzzles |
|---|---|
| Singles only | 43.4% (2,169) |
| Pointing or claiming | 33.0% (1,648) |
| Pair or triple | 9.1% (456) |
| X-wing, XY-wing or swordfish | 2.0% (100) |
| Coloring or chains | 8.0% (399) |
| Beyond every technique our grader knows | 4.6% (228) |

Three out of four of the sparsest possible Sudoku puzzles need nothing harder than pointing and claiming. That's the same ceiling as an NYT Medium.

## The measured picture: 2,280 puzzles

Examples can be cherry-picked, so here's the broad view. For each target from 22 to 40 clues, I generated 120 random puzzles: fill a random valid grid, then remove digits in random order, keeping each removal only if the puzzle still has one solution. Low targets often couldn't be reached, so the table groups puzzles by their actual clue count. Same grader that sets SudokuSudoku's levels.

| Clues | Puzzles | Singles only | Pointing / claiming | Pairs / triples | X-wing, XY-wing, swordfish, quads | Coloring / chains | Beyond our grader | Avg technique steps* | Avg stalls* |
|---|---|---|---|---|---|---|---|---|---|
| 22–24 | 196 | 42.9% | 17.3% | 7.7% | 4.1% | 8.2% | 19.9% | 2.48 | 0.87 |
| 25–26 | 386 | 49.2% | 9.8% | 6.2% | 4.9% | 14.8% | 15.0% | 2.05 | 0.77 |
| 27–28 | 258 | 62.0% | 5.4% | 3.9% | 3.5% | 14.7% | 10.5% | 1.41 | 0.48 |
| 29–30 | 240 | 85.4% | 2.1% | 0.8% | 2.9% | 5.4% | 3.3% | 0.37 | 0.16 |
| 31–32 | 240 | 87.5% | 2.1% | 0.4% | 2.1% | 6.7% | 1.3% | 0.36 | 0.16 |
| 33–34 | 240 | 96.7% | 0.8% | 0.0% | 0.0% | 1.3% | 1.3% | 0.06 | 0.03 |
| 35–36 | 240 | 98.3% | 0.0% | 0.0% | 1.3% | 0.0% | 0.4% | 0.03 | 0.02 |
| 37–38 | 240 | 99.6% | 0.0% | 0.0% | 0.0% | 0.4% | 0.0% | 0.02 | 0.00 |
| 39–40 | 240 | 99.6% | 0.0% | 0.0% | 0.4% | 0.0% | 0.0% | 0.01 | 0.00 |

*Averages over puzzles the grader finished. "Beyond our grader" means it needs something stronger than our chains, or guessing. It doesn't mean unsolvable.

I want to be fair to my old instinct. Clue count isn't meaningless. Above about 33 clues, almost everything is singles-only.

But in the range where real puzzles live, roughly 22 to 28 clues, it barely sorts anything. At 25 or 26 clues, about half the puzzles are singles-only and about 15% are beyond everything in our toolkit. Same clue count, opposite ends of the scale.

Flip the question around and it gets stranger. The puzzles whose hardest step was pointing or claiming averaged 25.8 clues. The ones that needed an X-wing, XY-wing, swordfish or quad averaged 27.6. The harder group had *more* givens on average. And 41 of the 1,320 puzzles with 30 or more clues needed a pair or something harder.

One caveat: these are randomly carved puzzles, not curated ones. Publishers pick puzzles to hit a difficulty target. The point is only what clue count alone can tell you.

## So what actually makes a puzzle hard?

Here's what I think separates easy from hard:

1. **The hardest technique you're forced to use.** If the puzzle can't be finished without an X-wing, it doesn't matter how many givens it has.
2. **How often you hit a wall.** One stall in a long puzzle feels very different from three.
3. **How narrow the path is.** A puzzle with ten singles available at every step is relaxing even if it's sparse. A puzzle where only one move exists at a time feels like a hallway. That's often what makes something feel hard even when the techniques are simple.
4. **How early the first wall comes.** Getting stuck after 15 easy placements feels different from getting stuck after 50.

This is exactly what I see in the NYT puzzles. Across 1,483 archived NYT puzzles in [a public dataset](https://github.com/vivrao9/nyt-sudoku) [5], Medium averaged 24.1 clues and Hard averaged 23.7. Nearly identical. And 24% of the Hards needed nothing beyond pointing and claiming, the same ceiling as Medium. I wrote up what that means in [Why NYT Medium sometimes feels harder than Hard](/articles/nyt-medium-vs-hard/). (SudokuSudoku isn't affiliated with The New York Times. I'm just a daily player who got curious.)

## How SudokuSudoku grades its six levels

Every puzzle here is generated, solved by the grader above, and only kept if what it actually needed falls inside that level's window. Clue count is a guide rail, not the grade. Our [stats page](/stats/) shows how long each level actually takes people.

- **Quick** (40–45 clues): finishable with [naked singles](/techniques/naked-single/) and [hidden singles](/techniques/hidden-single/) you can spot inside a box. A warm-up.
- **Easy** (36–38 clues, usually 38): singles only, including hidden singles you find in rows and columns.
- **Not Easy** (22–27 clues, usually 23–25): must need [pointing and claiming](/techniques/pointing-and-claiming/), one to three times, and nothing harder. It also has to create a few forced moves along the way, so it has that narrow, NYT Medium feel.
- **Hard** (22–27 clues): must need a [naked pair](/techniques/naked-pair/), [hidden pair](/techniques/hidden-pair/) or [triple](/techniques/naked-triple/), with at least four technique steps. That rule is what keeps Hard reliably harder than Not Easy.
- **Expert** (22–26 clues): must need an [X-wing](/techniques/x-wing/), [XY-wing](/techniques/xy-wing/), [swordfish](/techniques/swordfish/) or a quad.
- **Mental** (17–24 clues): must need [simple coloring](/techniques/simple-coloring/) or an [XY-chain](/techniques/xy-chain/).

Because the grader knows exactly which technique each step needs, the hints use the same information. When you're stuck, a hint shows you where to look and explains the move on your own board, instead of just filling in a number. I have a ceiling too. This is how I'm trying to [raise mine](/articles/why-being-stuck-is-good-for-you/).

Want to try them? Every grid above is printed as an 81-character string you can paste into most Sudoku tools. Start with the 68-clue one...see how long the first move takes you. Or skip the homework and [play a Not Easy](/?difficulty=not-easy). Watch for the moment the singles run out.

## References

1. Ritmeester, P. (2024, December 13). Toen de sudoku verdween, mailden lezers woedend. *NRC*. <https://www.nrc.nl/nieuws/2024/12/13/toen-de-sudoku-verdween-mailden-lezers-woedend-a4876352> (quote translated from Dutch by me)
2. SudokuSudoku source code, human-style solver and grader, `assets/js/solver.js`. <https://github.com/ethandede/sudoku>
3. McGuire, G., Tugemann, B., & Civario, G. (2014). There is no 16-clue Sudoku: Solving the Sudoku minimum number of clues problem via hitting set enumeration. *Experimental Mathematics*, 23(2), 190–217. doi:10.1080/10586458.2013.870056. Preprint posted January 1, 2012: <https://arxiv.org/abs/1201.0749>
4. Royle, G. Minimum Sudoku: collection of 17-clue puzzles, University of Western Australia (original page staffhome.ecm.uwa.edu.au/~00013890/sudokumin.php is offline; archived copy: <https://web.archive.org/web/20200726052010/https://staffhome.ecm.uwa.edu.au/~00013890/sudokumin.php>). The 49,158-puzzle list used here is the public mirror at <https://github.com/607011/RateMySudoku/blob/master/collections/gordon-royle-17.txt>
5. Rao, V. nyt-sudoku (dataset of archived New York Times Sudoku puzzles). <https://github.com/vivrao9/nyt-sudoku> . The 1,483 puzzles analyzed (495 Easy, 494 Medium, 494 Hard) are dated between August 2021 and March 2024.
