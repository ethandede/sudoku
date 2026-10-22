---
title: "Sudoku Variants: Killer, Jigsaw, Thermo, the Miracle, and the Cousins That Aren't Sudoku at All"
slug: sudoku-variants
meta_description: "A plain-English tour of Sudoku variants: what each extra rule adds, how it changes the way you solve, and who made it popular. Sources included."
summary: "Rules, solving changes and verified origins for about twenty Sudoku variants and cousins, from Killer and Samurai to Sandwich, anti-knight and the Miracle Sudoku. Where I couldn't verify an origin, I say so."
publishDate: 2026-11-04
---

<!-- REQUIRES: hints (teaching hints that explain the technique), techniques (/techniques/ index and pages linked below), articles /articles/history-of-sudoku/, /articles/what-makes-a-sudoku-hard/ -->

# Sudoku Variants, and What Each One Does to Your Brain

Classic Sudoku has exactly one idea. Every row, column and 3×3 box holds 1 to 9 once.

Almost every variant keeps that idea and adds one more rule. What gets me is how much one extra rule changes the way you think. Some make the puzzle feel like arithmetic. Some make it feel like geometry. A few start from a nearly empty grid and still have only one answer.

First, a straight answer: SudokuSudoku plays classic 9×9 Sudoku only. Everything below is for curiosity and your next rabbit hole, not a list of things you'll find here.

Variants started piling up almost as soon as [the craze](/articles/history-of-sudoku/) did. Ed Pegg Jr. was already [cataloguing them](https://mathpuzzle.com/MAA/41-Sudoku%20Variations/mathgames_09_05_05.html) for the Mathematical Association of America in September 2005 [2]. Where I could find a reliable source for who invented or popularized a variant, I've cited it. Where I couldn't, I say so, instead of repeating whatever gets copied from site to site.

## Variants that change the shape of the grid

**Mini Sudoku (4×4 and 6×6).** Same rules, smaller grid: digits 1 to 4 with 2×2 boxes, or 1 to 6 with 2×3 boxes. The 6×6 version runs in *USA Today* as "Mini Sudoku" ([Wikipedia's Sudoku page](https://en.wikipedia.org/wiki/Sudoku) has a good rundown of the sizes) [1]. Small grids are great for learning, because the logic of [singles](/techniques/naked-single/) is easy to see. [The math](https://arxiv.org/abs/1201.0749) is tidy too. A 4×4 needs at least 4 clues and a 6×6 at least 8 to have a unique solution [8].

**16×16 (and bigger).** Digits 1 to 16, or the letters A to P, in 4×4 boxes. Dell publishes 16×16 "Number Place Challenger" puzzles, and in August 2005 the BBC's *Radio Times* started a weekly 16×16 "Super Sudoku" [1]. Same techniques, just a lot more to track. Miss one candidate and it costs you more.

**Jigsaw (irregular) Sudoku.** The nine 3×3 boxes are replaced by [nine irregular regions](https://en.wikipedia.org/wiki/Glossary_of_sudoku) of nine cells each. Rows, columns and regions still hold 1 to 9 [1][9]. Box scanning goes out the window, and a neat trick takes over. Because any row holds 1 to 9 exactly once, you can sometimes add up which region cells stick out of a set of rows and pin a digit that way. It goes by a bunch of names (squiggly, irregular, nonomino), and I couldn't find a reliable first publisher.

**Samurai (Gattai-5).** Five 9×9 grids overlap at the corners in an X shape, so the center grid shares a box with each of the other four. In Japan it's *Gattai 5*, "five merged," and *The Times* in London calls it Samurai Sudoku [1]. Solving feels like juggling. You get stuck in one grid and have to finish a neighbor to break through the shared box.

## Variants that add a region

**Diagonal or X-Sudoku.** Both long diagonals must also contain 1 to 9 [1]. Two extra "units" means more singles to find and more places for [pointing and claiming](/techniques/pointing-and-claiming/). Peter Ritmeester, who sets the weekly Saturday Sudoku in the Dutch paper *NRC*, [announced in 2024](https://www.nrc.nl/nieuws/2024/12/13/toen-de-sudoku-verdween-mailden-lezers-woedend-a4876352) that he'd bring this one back there as "Sudoku X" [3].

**Hyper Sudoku (Windoku, NRC Sudoku).** Four extra shaded 3×3 regions sit one cell in from each corner, and each must also contain 1 to 9. This one has a clean origin story. Ritmeester designed it in 2005 and offered it exclusively to *NRC*, where it first ran on Saturday 8 October 2005 [3]. When he and Will Shortz put together a book of variants, Ritmeester suggested the English name "Sudoku Extra" and Shortz suggested "Hyper Sudoku." Shortz won [3]. The New York Times Syndicate was [distributing it by early 2006](https://www.editorandpublisher.com/stories/nyt-syndicate-offering-hyper-sudokukakuro,116258) [4]. The extra windows create hidden overlap regions, and that's where the satisfying deductions live.

## Variants with math clues

**Killer Sudoku.** The grid usually starts empty. Instead, cells are grouped into dotted "cages," each with a sum, and digits can't repeat inside a cage [5]. Solving shifts toward arithmetic. A two-cell cage that sums to 3 must be 1 and 2. And because every row, column and box sums to 45, you can deduce single cells "sticking out" of a region (solvers call them innies and outies).

Who invented it? [Wikipedia](https://en.wikipedia.org/wiki/Killer_sudoku) credits Tokyo setter Tetsuya Nishio and dates its first appearance outside Japan to *The Times* in 2005, citing a 2005 *Times* article [5]. I haven't read that article myself, so treat the inventor credit as the commonly told version.

**Sandwich Sudoku.** Numbers outside the grid give the sum of the digits sandwiched between the 1 and the 9 in that row or column [6]. A clue of 0 means the 1 and 9 are next to each other. A clue of 35 means everything except 1 and 9 sits between them. It had shown up at World Puzzle Championships as "Between 1 and 9 Sudoku," and the YouTube channel [Cracking the Cryptic](https://www.youtube.com/@CrackingTheCryptic) made it a hit in 2019. The name "Sandwich Sudoku" came from [Alex Bellos](https://www.theguardian.com/science/2019/may/06/can-you-solve-it-sandwich-sudoku-a-new-puzzle-goes-viral), the *Guardian* puzzle columnist [6].

**Arrow Sudoku.** A circle sits at one end of an arrow, and the digits along the arrow add up to the digit in the circle. Digits can repeat on an arrow if Sudoku rules allow. It makes you think about small sums. A circle with a three-cell arrow is at least 6, because 1+2+3 is the smallest it can be.

**Thermo Sudoku.** Thermometer shapes are drawn across the grid, and digits must strictly increase from the bulb to the tip. A thermometer five cells long instantly limits its bulb to 1 to 5. These can start with almost no given digits.

Who invented arrow or thermo? I couldn't find a reliable source, so I'm leaving that blank. Both are staples of modern competition and online puzzle setting.

**Greater-Than Sudoku.** Small > or < signs sit between neighboring cells instead of (or on top of) given digits [1]. You solve by chaining inequalities. A cell that's smaller than three neighbors can't be very big. It's related to the Japanese puzzle Futoshiki, which uses the same inequality idea on a smaller Latin square.

**Even-Odd Sudoku.** Some cells are shaded to show they must hold an even digit (or unshaded for odd). A gentle one. Parity turns into a strong elimination tool, since only four digits are even.

## Variants inspired by chess

**Anti-King.** No two cells that touch, including diagonally, can hold the same digit [7].

**Anti-Knight.** No two cells a chess knight's move apart can hold the same digit [7].

Both rules work across box borders, so they create constraints classic Sudoku never has. Anti-knight especially rewards looking at one digit's pattern across the whole grid.

## The Miracle Sudoku

In May 2020, Cracking the Cryptic featured a puzzle by Mitchell Lee that [went properly viral](https://www.thenationalnews.com/lifestyle/puzzlingly-compelling-watch-a-man-solve-miracle-sudoku-with-only-two-numbers-filled-in-1.1024674) [7][10]. It stacks three rules on top of normal Sudoku: anti-knight, anti-king, and non-consecutive (orthogonally neighboring cells can't hold consecutive digits). It starts with just two given digits. Two. And it still has exactly one solution [7].

Alex Bellos [wrote about it in *The Guardian*](https://www.theguardian.com/science/2020/may/18/can-you-solve-it-sudoku-as-spectator-sport-is-unlikely-lockdown-hit) a week later, as the channel's audience was surging during lockdown [7]. The nickname comes from that absurd starting position. Honestly, [watching Simon Anthony solve it](https://www.youtube.com/watch?v=yKf9aUIxdb4) is the best introduction I know to what modern setters do.

That's the "setter scene" in a nutshell. Constructors design a puzzle around a specific logical path, often with very few givens, and solvers love finding it. A long way from computer-generated newspaper grids.

## Variants that change the symbols

**Wordoku.** Letters replace digits, often nine distinct letters that spell a word somewhere in the solution. Mathematically it's identical to Sudoku, since the symbols carry no meaning. But your brain reads letters differently, and that's the fun.

## Cousins, not variants

These get filed under "Sudoku" all the time, but they aren't Sudoku. No 3×3 boxes, and the logic is built on arithmetic.

**Kakuro.** It looks like a crossword filled with digits. Each run of white cells must add up to the clue at its start, with no repeated digits in a run. [According to Will Shortz](https://www.conceptispuzzles.com/index.aspx?uri=puzzle%2Fkakuro%2Fhistory), it dates to the April/May 1950 issue of Dell's *Official Crossword Puzzles*, where it was called "Cross Sums" and credited to a Canadian named Jacob E. Funk [11]. Maki Kaji, the Nikoli founder who also named Sudoku, brought it to Japan in 1980 as *Kasan Kurosu*, and Nikoli shortened that to "Kakuro" in 1986 [11].

**KenKen (also sold as Calcudoku or Mathdoku).** A Latin square, from 3×3 up to 9×9, divided into cages with a target number and an operation (add, subtract, multiply, divide). Unlike Killer, digits can repeat within a cage. It was invented in 2004 by Japanese math teacher Tetsuya Miyamoto [12]. *The New York Times* [started running it in February 2009](https://www.nytimes.com/2009/02/09/arts/09ken.html) [12]. "KenKen" [is a trademark](https://en.wikipedia.org/wiki/KenKen), which is why other publishers use names like Calcudoku [13].

## What variants taught me about classic Sudoku

Variants made me a better classic solver. Thermo and arrow taught me to ask what the smallest or largest value in a cell could be. Killer taught me to count. Anti-knight taught me to look at one digit across the whole grid, which is the same habit you need to spot an [X-wing](/techniques/x-wing/).

For now, SudokuSudoku is about getting classic Sudoku right. [Honest difficulty](/articles/what-makes-a-sudoku-hard/). A number pad with a box map, so you can see which boxes still need each digit. Hints that explain the technique instead of just filling a cell.

If you want to sharpen the techniques that carry over into all of these, the [techniques pages](/techniques/) are a good place to start. Or warm up with a classic [Hard](/?difficulty=hard). Then go [watch the Miracle](https://www.youtube.com/watch?v=yKf9aUIxdb4)...

## References

1. Wikipedia contributors. Sudoku: Variants (sections on grid sizes, Mini Sudoku, additional constraints, Gattai 5/Samurai, Greater Than Sudoku). Wikipedia. <https://en.wikipedia.org/wiki/Sudoku> (accessed October 2026; used only for publication facts that it attributes to specific publications)
2. Pegg, E., Jr. (2005, September 6, updated September 15). Math Games: Sudoku Variations. Mathematical Association of America. <https://mathpuzzle.com/MAA/41-Sudoku%20Variations/mathgames_09_05_05.html>
3. Ritmeester, P. (2024, December 13). Toen de sudoku verdween, mailden lezers woedend. *NRC*. <https://www.nrc.nl/nieuws/2024/12/13/toen-de-sudoku-verdween-mailden-lezers-woedend-a4876352>
4. Editor & Publisher. (2006, February 27). NYT Syndicate offering 'Hyper-Sudoku/Kakuro'. <https://www.editorandpublisher.com/stories/nyt-syndicate-offering-hyper-sudokukakuro,116258>
5. Wikipedia contributors. Killer sudoku (History section, citing Lewis, L. (2005, August 31). Too good for Fiendish? Then try Killer Su Doku. *The Times*). <https://en.wikipedia.org/wiki/Killer_sudoku>
6. Bellos, A. (2019, May 6). Can you solve it? Sandwich sudoku: a new puzzle goes viral. *The Guardian*. <https://www.theguardian.com/science/2019/may/06/can-you-solve-it-sandwich-sudoku-a-new-puzzle-goes-viral>
7. Bellos, A. (2020, May 18). Can you solve it? Sudoku as spectator sport is unlikely lockdown hit. *The Guardian*. <https://www.theguardian.com/science/2020/may/18/can-you-solve-it-sudoku-as-spectator-sport-is-unlikely-lockdown-hit>
8. McGuire, G., Tugemann, B., & Civario, G. (2014). There is no 16-clue Sudoku. *Experimental Mathematics*, 23(2), 190–217 (Section 2.2.2 table of smallest critical sets for 4×4, 6×6, 8×8 and 9×9). <https://arxiv.org/abs/1201.0749>
9. Wikipedia contributors. Glossary of sudoku (Jigsaw sudoku, Du-sum-oh). <https://en.wikipedia.org/wiki/Glossary_of_sudoku>
10. The National. (2020). Puzzlingly compelling: watch a man solve 'miracle' Sudoku with only two numbers filled in. <https://www.thenationalnews.com/lifestyle/puzzlingly-compelling-watch-a-man-solve-miracle-sudoku-with-only-two-numbers-filled-in-1.1024674> ; original video: Cracking the Cryptic, "The Miracle Sudoku," <https://www.youtube.com/watch?v=yKf9aUIxdb4>
11. Conceptis Puzzles. Kakuro history (quoting Will Shortz's introduction to *Will Shortz Presents Easy Kakuro*, St. Martin's Griffin, 2006). <https://www.conceptispuzzles.com/index.aspx?uri=puzzle%2Fkakuro%2Fhistory>
12. The New York Times. (2009, February 9). A new puzzle challenges math skills. <https://www.nytimes.com/2009/02/09/arts/09ken.html> ; and The New York Times. (2019, February 9). 10 years of the KenKen puzzle in The Times. <https://www.nytimes.com/2019/02/09/reader-center/kenken-puzzle-10th-anniversary.html>
13. Wikipedia contributors. KenKen (trademark and history sections). <https://en.wikipedia.org/wiki/KenKen>
