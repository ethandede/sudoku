---
title: "The Fewest and Most Clues a Sudoku Can Have: 17, 40, 77 and Why"
slug: fewest-and-most-sudoku-clues
meta_description: "17 clues is the proven minimum for a one-answer Sudoku. 77 clues can still leave two answers, and 40 is the record for a puzzle with no spare clue."
summary: "The absolutes of Sudoku: the 2012 proof that 17 is the minimum, why 77 givens can still have two solutions but 78 can't, the 40-clue record for a minimal puzzle, and the smallest hidden contradiction, which I checked by computer."
publishDate: 2026-11-18
---

<!-- REQUIRES: techniques (/techniques/ pages linked below), articles /articles/what-makes-a-sudoku-hard/, /articles/history-of-sudoku/, /articles/nyt-medium-vs-hard/, difficulty play links (/?difficulty=quick, /?difficulty=mental) -->

# The Fewest and Most Clues a Sudoku Can Have

How empty can a Sudoku get and still have exactly one answer? And how full can it get and still *not* have one?

I play nearly every day and I have a ceiling. The people who answered these questions apparently don't. They used a supercomputer, years of forum work and some very stubborn math.

Here are the absolutes, what each one means, and what they have to do with actually playing.

First, one word. A **proper** Sudoku has exactly one solution. That's the deal every puzzle you play is supposed to keep, and it's the standard [Wikipedia's Mathematics of Sudoku page](https://en.wikipedia.org/wiki/Mathematics_of_Sudoku) uses too [1]. Everything below hangs on it.

## The floor: 17 clues

The fewest clues a proper Sudoku can have is 17. Not "probably 17." Proven.

People had found 17-clue puzzles for years. Mathematician Gordon Royle at the University of Western Australia [collected them](https://web.archive.org/web/20200726052010/https://staffhome.ecm.uwa.edu.au/~00013890/sudokumin.php) while hunting for a 16 [2]. His list grew to about 49,000 puzzles. Nobody ever found a 16. But not finding something isn't proof it doesn't exist.

So Gary McGuire, Bastian Tugemann and Gilles Civario went looking for every possible 16, in every possible grid. They posted the result on January 1, 2012: [There is no 16-clue Sudoku](https://arxiv.org/abs/1201.0749) [3].

How do you search *everything*? There are 6,670,903,752,021,072,936,960 filled grids, which [Bertram Felgenhauer and Frazer Jarvis counted](http://www.afjarvis.org.uk/sudoku/) in 2005 [4]. Most of those are the same grid with the digits relabeled, the grid rotated, or rows shuffled within a band. Ed Russell and Jarvis worked out that there are 5,472,730,538 essentially different grids [4]. Still a lot. The team checked every one of them.

The trick that made it possible is called an **unavoidable set**. Here's the idea in plain terms. Inside any finished grid there are little groups of cells whose digits can be shuffled among themselves and still leave a valid grid. The simplest is 4 cells in a rectangle holding two digits, like this:

```
row 1:  5 . . . 9 . . . .
row 2:  9 . . . 5 . . . .
```

Swap the 5s and 9s in just those 4 cells and you get a different, still valid, solution. So any puzzle for that grid needs at least one clue in those 4 cells. Otherwise you can't tell the two answers apart. That's what "unavoidable" means: your clues can't avoid it.

Every grid has lots of these sets. A real puzzle's clues have to touch every single one. That turns the question into a search for **hitting sets**, groups of 16 cells that hit every unavoidable set at least once. For each grid, their program, called checker, found the unavoidable sets, listed every 16-cell group that hit all of them, and tested each group to see whether it pinned down a single answer. None ever did.

Their new version averaged about 3.6 seconds per grid. Across all 5.47 billion grids, that added up to about 7.1 million core hours on the Stokes cluster at the Irish Centre for High-End Computing, run from January to December 2011 [3]. They put it at roughly 800 processor-years. The original 2006 version of checker would have needed over 300,000 [3]. The paper was published in *Experimental Mathematics* in 2014 [3].

Two side notes from the paper that I love.

The easy half of the proof is *really* easy. A 7-clue puzzle can't work, because at least two digits never appear, and you can swap those two everywhere in any solution to get another one [3]. Same reason every proper puzzle shows at least 8 of the 9 digits. But nobody has a pen-and-paper proof that 8 clues can't work [3]. Everything past 7 has needed a computer.

And not every grid has a 17-clue puzzle hiding in it. The paper is careful to say very few do [3]. The claim is only that no grid has a 16.

If you'd rather watch than read, Numberphile did a good short video on it, [17 and Sudoku Clues](https://www.youtube.com/watch?v=MlyTq-xVkQE), with James Grime [5].

## The ceiling: 77 clues and still two answers

Now flip it. How many clues can a puzzle have and still *not* have a unique answer?

77. Four empty cells, two solutions.

It's the same rectangle from above, the shape solvers call a deadly pattern. Take a finished grid, find 4 cells at the corners of a rectangle holding just two digits, set up so the 4 cells sit in exactly two boxes. Blank those 4 and stop. Here's one I built and checked with a solver:

```
+-------+-------+-------+
| 5 7 6 | 8 2 1 | 3 4 9 |
| . . 2 | 9 3 4 | 5 6 7 |
| 9 3 4 | 5 7 6 | 1 8 2 |
+-------+-------+-------+
| 7 4 1 | 3 5 8 | 2 9 6 |
| 3 5 8 | 6 9 2 | 4 7 1 |
| 6 2 9 | 1 4 7 | 8 5 3 |
+-------+-------+-------+
| 4 6 3 | 7 1 5 | 9 2 8 |
| . . 5 | 2 6 9 | 7 3 4 |
| 2 9 7 | 4 8 3 | 6 1 5 |
+-------+-------+-------+
```

`576821349..2934567934576182741358296358692471629147853463715928..5269734297483615`

Row 2 is missing a 1 and an 8. So is row 8. So are columns 1 and 2. So are the two boxes. Put 8, 1 on top and 1, 8 on the bottom, or flip it. Both work, and nothing on the board can tell you which. My solver reports exactly 2 solutions. McGuire's team used the same kind of example when they explained unavoidable sets: blank one of these rectangles and you get "a 77-clue sudoku puzzle with two completions" [3].

Why does it have to be exactly two boxes? If all 4 cells were in one box, that box would hold two 1s and two 8s, which can't happen. If the 4 cells were in four different boxes, swapping would break the boxes. Two boxes is the only shape where the swap is legal.

So why can't 78 clues do the same thing? With 78 clues there are only 3 empty cells. Think about where they sit:

- If any empty cell is the only blank in its row, the row tells you its digit.
- If not, the 3 blanks can't spread across rows in pairs (3 doesn't split into pairs). So all 3 share one row. Then each one is alone in its column, and the column tells you the digit.

Either way one cell is forced. Fill it, and the same logic works on the 2 left, then the last 1. No room for a second answer. For the record, I also blanked every possible combination of 3 cells in that grid, all 85,320 of them, and every one came back with exactly one solution. The paper backs this up from the other side: the smallest unavoidable set has 4 cells, never 1, 2 or 3 [3].

So any puzzle with 78 or more clues has one answer, or none.

## The other kind of unsolvable: no answer at all

That "or none" is its own question. How few clues does it take to make a puzzle impossible?

The boring answer is 2. Put two 5s in the same row and you're done.

The more interesting question is how few clues it takes when nothing is *obviously* wrong. No repeated digit in any row, column or box, and still no solution. I worked one out with 5:

```
+-------+-------+-------+
| . . . | 1 . . | . . . |
| . . . | . . . | 1 . . |
| . . 2 | . . . | . . . |
+-------+-------+-------+
| 1 . . | . . . | . . . |
| . . . | . . . | . . . |
| . . . | . . . | . . . |
+-------+-------+-------+
| . 1 . | . . . | . . . |
| . . . | . . . | . . . |
| . . . | . . . | . . . |
+-------+-------+-------+
```

Look at the top-left box. It needs a 1. Rows 1 and 2 already have a 1, so not there. Columns 1 and 2 already have a 1, so not there either. That leaves one cell, row 3 column 3...and it's a 2. The 1 has nowhere to go. It's a [hidden single](/techniques/hidden-single/) with no cell left, basically.

Is 5 the floor? I wasn't sure, so I checked. Every cell is equivalent to every other under the grid's symmetries, so I fixed one clue in the top-left corner and tried every other placement of 3 more clues, with every way of matching or not matching their digits. That came to 735,692 conflict-free sets of 4 clues. Every single one still had a solution. So 5 is the fewest clues for a puzzle that's impossible without showing it.

## The strangest one: 40 clues, and every one matters

Here's the absolute I find hardest to wrap my head around.

A **minimal** puzzle is a proper puzzle where every clue is load-bearing. Remove any one and you get more than one solution [1]. Puzzles don't have to be minimal, and plenty you play aren't.

So how big can a minimal puzzle get? For years people found 38s and 39s. Then on March 4, 2014, Mladen Dobrichev posted ["the first discovered 40-given minimal unique Sudoku puzzle"](https://web.archive.org/web/20241103181752/http://forum.enjoysudoku.com/high-clue-tamagotchis-t30020-135.html) on the Sudoku Players' Forum [6]:

```
+-------+-------+-------+
| . . . | . . . | . . . |
| . 1 2 | . 3 4 | 5 6 7 |
| . 3 4 | 5 . 6 | 1 8 2 |
+-------+-------+-------+
| . . 1 | . 5 8 | 2 . 6 |
| . . 8 | 6 . . | . . 1 |
| . 2 . | . . 7 | . 5 . |
+-------+-------+-------+
| . . 3 | 7 . 5 | . 2 8 |
| . 8 . | . 6 . | 7 . . |
| 2 . 7 | . 8 3 | 6 1 5 |
+-------+-------+-------+
```

`..........12.34567.345.6182..1.582.6..86....1.2...7.5...37.5.28.8..6.7..2.7.83615`

Look at it. The whole top row is empty, and there isn't a single 9 on the board. Two days later he posted a second 40 that's one clue away from the first [6]. As far as I can tell those two are still the only known 40s, and nobody has found a 41. It's believed 40 is the max. It hasn't been proven.

I didn't want to just take a forum post's word for it, so I ran both through a solver. Each has exactly one solution, and removing any one of the 40 clues gives more than one. (Fun detail: that 77-clue grid up above is this puzzle's solution with 4 cells knocked out.)

Then I ran it through our own grader. Singles place exactly 1 cell. Two [pointing](/techniques/pointing/) moves after that, then our grader is stuck. Nothing in our toolkit, [X-wings](/techniques/x-wing/), [coloring](/techniques/coloring/), [XY-chains](/techniques/xy-chain/), cracks it. A puzzle with 40 givens, as many as one of our Quick warm-ups, is harder than anything we serve.

One distinction worth keeping straight, because these numbers get mixed up online:

- The most clues a **proper** puzzle can have is 80. Fill in all but one cell and it's trivially unique. Lots of those clues are just redundant.
- The most clues a **minimal** puzzle can have, with no redundant clue at all, is 40 as far as anyone knows.

## What this means when you play

Put the numbers side by side and the pattern is obvious. A 17-clue puzzle can be easy, and a 40-clue puzzle can be brutal.

That's not a fluke. When I graded 5,000 of Royle's 17s, 43% needed nothing beyond [naked singles](/techniques/naked-single/) and hidden singles. I wrote that up, with a 68-clue puzzle that still needs an XY-wing, in [More clues doesn't mean easier](/articles/what-makes-a-sudoku-hard/). It's also part of why [NYT Medium sometimes feels harder than Hard](/articles/nyt-medium-vs-hard/).

What makes a puzzle hard is the one move you can't see. So that's what we grade on here. Every puzzle gets solved one step at a time, the way you'd do it, and the hardest step it *requires* sets the level. Clue count is just a rough range for each level, never the grade.

If you want to feel the difference, [play a Quick](/?difficulty=quick) and then [try a Mental](/?difficulty=mental). One is full and friendly, the other sparse and stubborn. Watch which one makes you put the phone down and stare.

Want more of the math and the history behind it? It's in [Where Sudoku came from](/articles/history-of-sudoku/).

## References

1. Wikipedia. Mathematics of Sudoku (definitions of proper and minimal puzzles; grid counts). <https://en.wikipedia.org/wiki/Mathematics_of_Sudoku>
2. Royle, G. Minimum Sudoku: collection of 17-clue puzzles, University of Western Australia (original page offline; archived copy). <https://web.archive.org/web/20200726052010/https://staffhome.ecm.uwa.edu.au/~00013890/sudokumin.php>
3. McGuire, G., Tugemann, B., & Civario, G. (2014). There is no 16-clue Sudoku: Solving the Sudoku minimum number of clues problem via hitting set enumeration. *Experimental Mathematics*, 23(2), 190–217. doi:10.1080/10586458.2013.870056. Preprint posted January 1, 2012: <https://arxiv.org/abs/1201.0749>
4. Jarvis, F. Sudoku enumeration problems (Felgenhauer and Jarvis, 6,670,903,752,021,072,936,960 grids; Russell and Jarvis, 5,472,730,538 essentially different grids). <http://www.afjarvis.org.uk/sudoku/>
5. Numberphile. (2012, January 24). 17 and Sudoku Clues, with James Grime. <https://www.youtube.com/watch?v=MlyTq-xVkQE>
6. Dobrichev, M. (2014, March 4 and 6). "40 !!!" and follow-up posts in the "High clue tamagotchis" thread, The New Sudoku Players' Forum (archived copy). <https://web.archive.org/web/20241103181752/http://forum.enjoysudoku.com/high-clue-tamagotchis-t30020-135.html>
