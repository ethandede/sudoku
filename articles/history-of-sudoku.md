---
title: "Where Sudoku Came From: Magic Squares, an Indiana Architect, and a Judge in a Tokyo Bookshop"
slug: history-of-sudoku
meta_description: "Sudoku isn't Japanese at heart, and it isn't new. The real story runs from Euler to 1890s Paris, a 1979 Dell magazine, Nikoli, and a Hong Kong judge."
summary: "The sourced history of Sudoku, from Latin squares and French newspaper puzzles to Number Place, Nikoli, Wayne Gould, the 2005 craze, and the math that came after. Plus where the record gets fuzzy."
publishDate: 2026-10-28
---

<!-- REQUIRES: techniques (/techniques/ index), articles /articles/what-makes-a-sudoku-hard/, /articles/sudoku-variants/, /articles/why-ai-is-bad-at-sudoku/ -->

# Where Sudoku Came From

I play Sudoku nearly every day, and for years I assumed it was an old Japanese puzzle. Nope.

When I started building SudokuSudoku I went looking for the real story, and it's better than the one I had in my head. It runs through an 18th-century Swiss mathematician, Paris newspapers in the 1890s, a retired architect in Indiana, a Tokyo publisher who named it in a hurry, and a judge from New Zealand with a computer program.

Here's what I could verify, and where the record gets fuzzy.

## Before Sudoku: Latin squares

Every finished Sudoku grid is a special case of what mathematicians call a Latin square: an n-by-n grid where each symbol appears once in every row and once in every column. Sudoku adds one rule, that each 3×3 box also holds every digit once.

The name usually attached to Latin squares is Leonhard Euler. He studied them at length in a paper published in 1782, "[Recherches sur une nouvelle espèce de quarrés magiques](https://scholarlycommons.pacific.edu/euler-works/530/)," or "Research on a new kind of magic square" [1]. Some popular accounts say 1783 [3]. The Euler Archive lists 1782.

Euler wasn't making puzzles, and his squares had no boxes. But "each symbol once per row and column" is his territory, which is why most Sudoku histories start with him.

## France, 1890s: the near miss

The closest ancestors showed up in French newspapers. The French researcher Christian Boyer dug these out and published them in [*Pour la Science*](https://www.pourlascience.fr/sr/histoire-sciencesles-ancetres-francais-du-sudoku-2930.php) in 2006 [2]. He also posted a [supplement with the original puzzles](http://multimagie.com/SupplAncetresSudoku.pdf).

The earliest he found ran in *La Revue des Jeux* on 21 August 1891. He describes it as the first known 9×9 grid divided into 3×3 sub-squares [2]. On 19 November 1892, the Paris daily *Le Siècle* printed a partially filled 9×9 grid with 3×3 compartments [2].

Neither was a Sudoku. They came out of the 19th-century French obsession with magic squares, where numbers (often up to 81) have to add up to the same total, so you solved them with arithmetic. Boyer does point out that the *Le Siècle* grid can be split into two Sudoku-like squares, which is fun to see [2].

Then on 6 July 1895, the rival paper *La France* ran a puzzle that came remarkably close [2]. A 9×9 grid to complete, where every row and every column used all the digits 1 to 9. The 3×3 blocks weren't drawn, but each one also contained 1 to 9, and so did the two long diagonals [2].

Boyer's own caption is basically my reaction: so close to a Sudoku! It was still framed as a magic-square problem, though, and there's no evidence the later inventors ever saw it.

## 1979: Number Place

The puzzle as we know it first appeared in the United States. In the May 1979 issue of *Dell Pencil Puzzles & Word Games* (issue 16, page 6), Dell ran a puzzle called **[Number Place](https://mathpuzzle.com/MAA/41-Sudoku%20Variations/mathgames_09_05_05.html)** [4]. The instructions describe the modern rules exactly: every row, every column, and every 3×3 box must contain 1 through 9 [4].

No byline. So who made it?

Will Shortz, the New York Times crossword editor and a puzzle historian, figured it out years later. He noticed that the name Howard Garns appeared in Dell's list of contributors in every issue that had a Number Place puzzle, and never in an issue that didn't [4]. Garns was a retired architect, 74 when he made the puzzle, and he died in Indianapolis in 1989, long before it got famous [4]. Sources differ on his hometown (Indianapolis and Connersville, Indiana both show up), so I'll just say Indiana architect.

Dell's own editor told [*The Observer*](https://www.theguardian.com/media/2005/may/15/pressandpublishing.usnews) in 2005 that nobody there knew who devised the puzzle, and that the oldest copy in Dell's archive was from 1979 [3]. So the Garns attribution rests on Shortz's detective work. Convincing and widely accepted, but circumstantial.

## Japan and the name

Maki Kaji [founded the puzzle magazine Nikoli](https://www.theguardian.com/world/2021/aug/20/maki-kaji-obituary), whose first issue came out in 1980 [6][8]. He came across Number Place in an American puzzle magazine. By [his own account](https://www.japanpolicyforum.jp/culture/pt201505281000504929.html) he didn't read English well, so he solved it without reading the instructions [5]. Nikoli introduced the puzzle in Japan in 1984 [4][5][7].

The original Japanese name was a mouthful: *Sūji wa dokushin ni kagiru*. It's usually translated as "the numbers must be single" or "numbers should be unmarried" (*dokushin* means a single, unmarried person) [4][6]. "Sudoku" is the short version: *sū* for number, *doku* for single [4].

Kaji later said he came up with the name in about 25 seconds because he was rushing to a horse race, and he didn't expect it to stick [6][7].

When the short name took over is less clear. Some sources tie it to the 1984 launch. Kaji himself wrote that he switched to "sudoku" for a standalone Nikoli book in 1988 [5]. I've seen 1986 in other places. I'd trust Kaji's own account, but I can't settle it.

Nikoli also tightened the form. The authors of the 17-clue proof (more on that below) note Nikoli's rule that its puzzles never have more than 32 clues [15]. Nikoli trademarked the name in Japan, which is why many other Japanese publishers still call it "Number Place" or *Nanpure* [4].

Kaji [died in August 2021](https://www.bbc.com/news/world-asia-58243126) at 69 [6][7]. He's widely called the ["godfather of Sudoku."](https://www.nytimes.com/2021/08/17/world/asia/maki-kaji-dead.html)

## The judge and the program

The puzzle stayed mostly in Japan for another twenty years. Then [Wayne Gould](https://time.com/collections/the-2006-time-100/7376371/wayne-gould/), a New Zealander who had been a judge in Hong Kong, came across a Sudoku book in a Tokyo bookshop in 1997 [3][9]. He spent roughly six years writing a computer program that could generate puzzles and, just as important, rate how hard they were [3][9].

His first newspaper wasn't in Britain. It was [*The Conway Daily Sun*](https://www.nytimes.com/2007/03/21/business/worldbusiness/21sudoku.html) in North Conway, New Hampshire, in 2004. His wife was a linguistics professor in that state [3][11]. Then, in Gould's words, he "turned up unannounced at the Times, like an old-fashioned travelling salesman" [3]. *The Times* of London published its [first "Su Doku"](https://www.news.co.uk/our-history/history-the-times/) on 12 November 2004 [10].

His business model was clever. Give the puzzles to papers for free, in exchange for a credit and a link to his program and books [9].

That detail matters to me. Gould's program cared about rating difficulty, not just generating valid grids. That's the same problem SudokuSudoku's grader works on. And it turns out [computers solve Sudoku very differently from people](/articles/why-ai-is-bad-at-sudoku/).

## 2005: the craze

What happened next was fast. *The Observer* called the second week of May 2005 "the week of Sudoku" in Britain. National papers advertised the puzzle on their front pages, *The Guardian*'s G2 section billed itself as "the only newspaper section with Sudoku on every page," and BBC Radio 4's *Today* programme read the numbers aloud for a radio version [3]. A radio Sudoku?!? I'd have lasted about two clues.

In the United States, the *New York Post* started running Sudoku in April 2005 [12]. By late August, *The New York Times* [reported](https://www.nytimes.com/2005/08/28/weekinreview/a-few-words-about-sudoku-which-has-none.html) that more than half of the leading American newspapers were printing one or more a day, and that no puzzle had spread through newspapers so fast since the crossword craze of 1924 and 1925 [12]. By May 2006, Shortz wrote that nearly every major paper in America had a daily Sudoku [9].

The Times itself held out in print. In 2006 it [ran three daily Sudoku on its website](https://nymag.com/arts/all/features/17244/), but not in the paper [13]. Much later it added Sudoku to its games app, which is [where I play it now](https://www.nytimes.com/puzzles/sudoku). The company's [May 2023 announcement](https://www.nytco.com/press/tiles-and-sudoku-join-nyt-games-app/) says that happened that February [14]. The first World Sudoku Championship was [held in Lucca, Italy, in 2006](https://www.nrc.nl/nieuws/2024/12/13/toen-de-sudoku-verdween-mailden-lezers-woedend-a4876352) [18].

## The math that followed

Once millions of people were playing, mathematicians started asking the obvious questions.

**How many finished grids are there?** Bertram Felgenhauer and Frazer Jarvis [worked it out](http://www.afjarvis.org.uk/sudoku/) in 2005: 6,670,903,752,021,072,936,960, about 6.67 × 10^21 [16]. They later learned that a poster called "QSCGZ" had reached the same number on the rec.puzzles newsgroup in September 2003 [16]. Many of those grids are really the same grid relabeled, rotated, or with rows shuffled within a band. Ed Russell and Jarvis counted the essentially different ones and got 5,472,730,538 [17].

**What's the fewest clues a puzzle can have and still have one solution?** For years the record was 17. Mathematician Gordon Royle at the University of Western Australia [collected tens of thousands of 17-clue puzzles](https://web.archive.org/web/20200726052010/https://staffhome.ecm.uwa.edu.au/~00013890/sudokumin.php) while hunting for a 16 [15]. Nobody found one.

On 1 January 2012, Gary McGuire, Bastian Tugemann and Gilles Civario [posted a proof](https://arxiv.org/abs/1201.0749) that no 16-clue Sudoku exists [15]. They searched every essentially different grid by computer, a project they estimated at about 800 processor-years, run over roughly a year at the Irish Centre for High-End Computing [15]. The paper was published in *Experimental Mathematics* in 2014 [15]. So 17 is the minimum.

The part I love: a 17-clue puzzle sounds terrifying, but plenty of them are easy. I ran a sample of Royle's collection through our own grader and wrote it up in [More clues doesn't mean easier](/articles/what-makes-a-sudoku-hard/).

## Timeline

| Year | What happened |
|---|---|
| 1782 | Euler's paper on Latin squares, "a new kind of magic square," is published [1] |
| 1891 | *La Revue des Jeux* prints the first known 9×9 grid with 3×3 sub-squares [2] |
| 1892 | *Le Siècle* prints a 9×9 magic-square puzzle with 3×3 compartments [2] |
| 1895 | *La France* prints a near-Sudoku using only 1 to 9 [2] |
| 1979 | Dell publishes Number Place, almost certainly by Howard Garns [4] |
| 1980 | Maki Kaji's Nikoli publishes its first issue [6] |
| 1984 | Nikoli introduces the puzzle in Japan [4][5] |
| 1980s | The name is shortened to "Sudoku" (exact year disputed) [5] |
| 1989 | Howard Garns dies [4] |
| 1997 | Wayne Gould finds a Sudoku book in Tokyo [9] |
| 2004 | First Gould puzzle in *The Conway Daily Sun*; *The Times* launches Su Doku on 12 November [10][11] |
| 2005 | The UK craze peaks in May; the *New York Post* brings it to US papers in April [3][12] |
| 2005 | Felgenhauer and Jarvis publish the count of grids [16] |
| 2006 | Russell and Jarvis count 5,472,730,538 essentially different grids; first World Sudoku Championship [17][18] |
| 2012 | McGuire, Tugemann and Civario prove 17 clues is the minimum [15] |
| 2021 | Maki Kaji dies [6] |
| 2023 | The New York Times adds Sudoku to its games app [14] |

## Why I care about any of this

What gets me is how many hands this puzzle passed through. A magic square in Paris. A nameless contributor in a Dell magazine. A publisher who renamed it on the way to the races. A judge who wanted a program that could tell easy from hard.

That last one is the heart of SudokuSudoku. Our levels are graded by the techniques a puzzle actually requires, and you can see every one of them on the [techniques pages](/techniques/). Go find the one that's been stopping you. Or skip the reading and [play today's puzzle](/?daily).

And if you want to see where setters took the idea after 2005, I wrote up the [variants](/articles/sudoku-variants/) too...some of them are a whole 'nother level.

## References

1. Euler, L. (1782). Recherches sur une nouvelle espèce de quarrés magiques. *Verhandelingen uitgegeven door het zeeuwsch Genootschap der Wetenschappen te Vlissingen*, 9, 85–239. Euler Archive E530. <https://scholarlycommons.pacific.edu/euler-works/530/>
2. Boyer, C. (2006, June). Les ancêtres français du sudoku. *Pour la Science*, 344, 8–11, 89. <https://www.pourlascience.fr/sr/histoire-sciencesles-ancetres-francais-du-sudoku-2930.php> ; supplement with the original puzzles: <http://multimagie.com/SupplAncetresSudoku.pdf> .
3. Smith, D. (2005, May 15). So you thought Sudoku came from the Land of the Rising Sun... *The Observer*. <https://www.theguardian.com/media/2005/may/15/pressandpublishing.usnews>
4. Pegg, E., Jr. (2005, September 6, updated September 15). Math Games: Sudoku Variations. Mathematical Association of America. <https://mathpuzzle.com/MAA/41-Sudoku%20Variations/mathgames_09_05_05.html>
5. Kaji, M. (2015). Sudoku of the world and the originator's joy. *Japan Policy Forum*. <https://www.japanpolicyforum.jp/culture/pt201505281000504929.html>
6. BBC News. (2021, August 17). Sudoku: Maki Kaji, puzzle enthusiast, dies aged 69. <https://www.bbc.com/news/world-asia-58243126>
7. The New York Times. (2021, August 17). Maki Kaji, the 'Godfather of Sudoku,' is dead at 69. <https://www.nytimes.com/2021/08/17/world/asia/maki-kaji-dead.html>
8. The Guardian. (2021, August 20). Maki Kaji obituary. <https://www.theguardian.com/world/2021/aug/20/maki-kaji-obituary>
9. Shortz, W. (2006, May 8). Wayne Gould. *Time*, The 2006 TIME 100. <https://time.com/collections/the-2006-time-100/7376371/wayne-gould/>
10. News UK. History of The Times (timeline entry: 12 November 2004, first Su Doku puzzle published). <https://www.news.co.uk/our-history/history-the-times/>
11. Fackler, M. (2007, March 21). Inside Japan's puzzle palace (with correction regarding The Conway Daily Sun). *The New York Times*. <https://www.nytimes.com/2007/03/21/business/worldbusiness/21sudoku.html>
12. The New York Times. (2005, August 28). A few words about Sudoku, which has none. <https://www.nytimes.com/2005/08/28/weekinreview/a-few-words-about-sudoku-which-has-none.html>
13. New York Magazine. (2006). New York Times crossword creator Will Shortz gets rich off Sudoku. <https://nymag.com/arts/all/features/17244/>
14. The New York Times Company. (2023, May 16). Tiles and Sudoku join NYT Games app. <https://www.nytco.com/press/tiles-and-sudoku-join-nyt-games-app/>
15. McGuire, G., Tugemann, B., & Civario, G. (2014). There is no 16-clue Sudoku: Solving the Sudoku minimum number of clues problem via hitting set enumeration. *Experimental Mathematics*, 23(2), 190–217. doi:10.1080/10586458.2013.870056. Preprint: <https://arxiv.org/abs/1201.0749>
16. Felgenhauer, B., & Jarvis, F. (2005). Enumerating possible Sudoku grids; and Jarvis, F., Sudoku enumeration problems (notes the earlier QSCGZ result). <http://www.afjarvis.org.uk/sudoku/>
17. Russell, E., & Jarvis, F. (2006). Mathematics of Sudoku II. Summary at <http://www.afjarvis.org.uk/sudoku/>
18. Ritmeester, P. (2024, December 13). Toen de sudoku verdween, mailden lezers woedend. *NRC*. <https://www.nrc.nl/nieuws/2024/12/13/toen-de-sudoku-verdween-mailden-lezers-woedend-a4876352>
