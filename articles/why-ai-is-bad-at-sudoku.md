---
title: "Why AI Is Surprisingly Bad at Sudoku (and a Tiny Program Isn't)"
slug: why-ai-is-bad-at-sudoku
meta_description: "Chatbots that write essays often fail a Sudoku a child can finish. Here's why, what the research shows, and why a short program never misses."
summary: "Language models pick one token at a time and can't take a move back. Sudoku punishes exactly that, while plain old search solves every puzzle in milliseconds. I timed it on 1,483 NYT puzzles."
publishDate: 2026-11-04
---

<!-- REQUIRES: hints (three-step teaching hints: where to look, why, the move), techniques (pages linked below), articles /articles/sudoku-variants/, /articles/what-makes-a-sudoku-hard/, /articles/why-being-stuck-is-good-for-you/, /articles/history-of-sudoku/ -->

# Why AI Is Surprisingly Bad at Sudoku

This one still makes me smile. The same AI chatbots that can draft a cover letter, explain tax law and write a sonnet about my dog have a long, well-documented habit of falling apart on a newspaper Sudoku. Meanwhile a program short enough to fit on an index card has been solving every Sudoku ever printed, correctly, for decades.

That gap isn't a fluke. It says something real about how these systems work. It's also the reason the hints on SudokuSudoku are built the way they are.

## How a language model writes an answer

A large language model produces text one small piece at a time. Each piece (a "token," roughly a word or part of a word) is chosen based on everything before it, and then the model moves on. It doesn't draft the whole answer, check it, and revise. Once a token is out, it's part of the record the model builds on.

For an essay, that works great. Language is forgiving. If sentence four is a little off, sentence five can smooth it over, and nobody fails the essay.

Sudoku is not forgiving. It's what computer scientists call a constraint satisfaction problem: 81 cells, and every one of them has to agree with 20 others (its row, column and box). Put one wrong digit in row two, and the mistake may not show up until row eight, when two cells both "need" to be a 5. By then the model has built forty more digits on top of the bad one.

A person with a pencil handles this by not committing until they're sure. Or by erasing. Programs handle it by backtracking: try a digit, follow the consequences, and if you hit a contradiction, undo everything back to the guess and try the next option.

Plain next-token generation has no eraser. [Researchers have argued](https://arxiv.org/abs/2403.06963) that the next-token training objective itself is a poor fit for problems that need planning and lookahead [1].

## What the research actually shows

The clearest test I found comes from Google Research and UT Austin. In [a 2024 paper](https://arxiv.org/abs/2409.10502), Kulin Shah and colleagues gave GPT-4o and Gemini 1.5 Pro four solved example puzzles, then asked each for the solution to a fifth, across 3,000 puzzles. Neither model solved a single one completely. Per cell, they were right about 9 to 10 percent of the time, which is roughly what you'd get by guessing [2].

Zero for 3,000.

The same paper has the more interesting half of the story. The researchers trained a smaller transformer (the same basic architecture as a chatbot) on Sudoku, and the order of the training data mattered enormously. Taught to fill cells left to right, top to bottom, it solved about 7 percent of puzzles. Taught to fill cells in the order a logical solver would, easiest cell first, it solved about 87 percent, and about 94 percent with a little extra search at the end. When they told the model which cell to work on next, it got the digit right 99 percent of the time. Its real weakness was finding where to look [2].

That matched my own experience as a player more than I expected. Most of the time when I'm stuck, it isn't that I can't do the logic. I just haven't found the spot where the logic applies.

Then came the "reasoning" models, the ones that think for a while before answering. In 2025, Sakana AI released [Sudoku-Bench](https://sakana.ai/sudoku-bench/), built with the hosts of the [Cracking the Cryptic](https://www.youtube.com/@CrackingTheCryptic) YouTube channel and including hand-made puzzles from Nikoli, the Japanese company that [named Sudoku](/articles/history-of-sudoku/) [3]. Most of its 100 puzzles are [variants with extra rules](/articles/sudoku-variants/), which matters. These are harder and less familiar than the daily NYT grid.

In the [technical report](https://arxiv.org/abs/2505.16135), no model solved more than 15 percent of the full set without tools. Most of the successes came on tiny 4×4 grids. On the 9×9 puzzles, the best single-shot result was about 3 percent, and in the step-by-step mode none of the models with reported results finished a single 9×9 [4]. The authors describe a common failure: models place locally sensible digits, run into a contradiction late, then either hand back an "almost" solution or claim the puzzle is broken [3].

Claim the puzzle is broken. I've wanted to do that a few times myself.

## The other kind of AI is perfect, and has been for ages

Sudoku isn't hard for computers. It's hard for one particular style of computer reasoning.

**Backtracking search** solves any valid puzzle. Find an empty cell, try each digit that doesn't clash, recurse, undo on failure. A sensible tweak, always picking the cell with the fewest options, makes it much faster.

**SAT solvers** treat the puzzle as a big logic formula of true/false statements ("cell r1c1 is a 5") and solve that. Inês Lynce and Joël Ouaknine [described simple encodings](https://sat.inesc-id.pt/~ines/publications/aimath06.pdf) in 2006 and showed that with the right encoding, simple inference alone cracks about half of a set of very hard puzzles [5].

**[Dancing Links](https://arxiv.org/abs/cs/0011047)**, Donald Knuth's 2000 technique, is an elegant way to run backtracking on "exact cover" problems, where every constraint must be satisfied exactly once [6]. His paper is about pentominoes and queens, not Sudoku. But Sudoku fits the exact cover mold neatly (each cell gets one digit, each row/column/box gets each digit once), and DLX became a favorite way to solve it.

None of this makes Sudoku a toy. Generalized to bigger grids, it's NP-complete, part of the family of problems with no known shortcut [7]. At 9×9, though, search just wins.

## Our own small demo

I didn't want to just assert that, so I measured it. I've been building websites for over 20 years, and I still like seeing a number for myself.

We have [an archive of 1,483 NYT Sudoku puzzles](https://github.com/vivrao9/nyt-sudoku) (Easy, Medium and Hard, from August 30, 2021 through March 2, 2024). I wrote the most naive backtracking solver I could, a dozen or so lines of JavaScript, and ran it on all of them on an ordinary cloud server.

- It solved all 1,483 correctly, checked against the rules. Average time: about 3.4 milliseconds per puzzle. The slowest single puzzle took about half a second, because naive search can wander.
- Adding the "fewest options first" tweak dropped the average to about 0.24 milliseconds and the slowest to about 11 milliseconds.
- I also ran Arto Inkala's 2012 puzzle, the one the press called [the world's hardest](http://abcnews.com/blogs/headlines/2012/06/can-you-solve-the-hardest-ever-sudoku) [8]. Naive backtracking finished it in under 2 milliseconds.

Then I ran the solver behind our hints, which only uses techniques a person would: [singles](/techniques/naked-single/), [locked candidates](/techniques/pointing-and-claiming/), [pairs](/techniques/naked-pair/), [X-wings](/techniques/x-wing/) and so on, up to [simple chains](/techniques/xy-chain/). It solved all 1,483 NYT puzzles by logic alone, averaging under half a millisecond. But on Inkala's puzzle it got stuck. It ran out of human techniques, which is exactly what that puzzle was designed to do to people.

I didn't test any commercial chatbots myself, so I'm only reporting what the papers above measured. One fair caveat: a chatbot that's allowed to write and run code can solve a standard Sudoku easily, because it just writes one of these programs. The Sudoku-Bench authors point this out too [4]. The weakness is reasoning "in its head," token by token.

## The specialized models are a different story

There's a third kind of AI here, and I want to be precise about it.

In 2019, [SATNet](https://arxiv.org/abs/1905.12149) (Wang, Donti, Wilder and Kolter, at ICML) built a differentiable logic solver into a neural network and showed it could learn the rules of Sudoku from examples alone, solving 98.3 percent of test puzzles [9]. A [follow-up in 2020](https://proceedings.neurips.cc/paper/2020/hash/0ff8033cf9437c213ee13937b1c4c455-Abstract.html) found that its headline "visual Sudoku" result, reading digits from images, depended on labels leaking into training. Without them it scored 0 percent on that task. The non-visual result held up [10].

In 2025, Sapient Intelligence's [Hierarchical Reasoning Model](https://arxiv.org/abs/2506.21734), with about 27 million parameters and trained on just 1,000 very hard puzzles, was reported to beat chain-of-thought language models on extreme Sudoku, where the language models scored zero [11]. An [independent reproduction](https://github.com/sapientinc/HRM/issues/12) posted to the project's GitHub got lower numbers than the paper (about 46 percent versus a reported 55 percent on the 1,000-example version) [12]. And a [2026 analysis](https://arxiv.org/abs/2601.10679) found it could fail on a puzzle with only one empty cell, while also showing tricks that pushed accuracy much higher [13].

These are research systems trained for grids, not chatbots. The field is moving fast, so I'm not sure how long any of these numbers will hold.

## Why our hints use a human-style solver

So if a tiny search program is perfect, why not just use that for hints?

Because a perfect answer isn't a useful hint. Backtracking can tell you that r4c7 is a 6, but its reason is "I tried everything and this was what survived." You can't learn from that, and it's not how you'd ever find it yourself.

Our solver works the way a player does. It always tries the easiest technique first and only reaches for something harder when nothing easier works. That's the same order the Shah paper found makes even a neural network good at Sudoku.

Because it solves like a person, a hint can walk you through it in order: where to look, why the move works, then the move itself. It's also how we [grade difficulty](/articles/what-makes-a-sudoku-hard/). A puzzle is "Hard" because of what a human needs to solve it, not because a computer found it slow.

The computer was never the hard part. Finding the next move, and understanding why it's the next move, is the part [worth practicing](/articles/why-being-stuck-is-good-for-you/). Go find one. A [Hard](/?difficulty=hard) is a good place to start.

## References

1. Bachmann, G., & Nagarajan, V. (2024). The pitfalls of next-token prediction. arXiv:2403.06963. <https://arxiv.org/abs/2403.06963>
2. Shah, K., Dikkala, N., Wang, X., & Panigrahy, R. (2024). Causal language modeling can elicit search and reasoning capabilities on logic puzzles. arXiv:2409.10502. <https://arxiv.org/abs/2409.10502>
3. Sakana AI. (2025, March 21; updated May 26). Sakana AI super-powers AI reasoning using Japan's own Sudoku puzzles. <https://sakana.ai/sudoku-bench/>
4. Seely, J., Imajuku, Y., Zhao, T., Cetin, E., & Jones, L. (2025). Sudoku-Bench: Evaluating creative reasoning with Sudoku variants. arXiv:2505.16135. <https://arxiv.org/abs/2505.16135>
5. Lynce, I., & Ouaknine, J. (2006). Sudoku as a SAT problem. Proceedings of the 9th International Symposium on Artificial Intelligence and Mathematics (ISAIM). <https://sat.inesc-id.pt/~ines/publications/aimath06.pdf>
6. Knuth, D. E. (2000). Dancing links. arXiv:cs/0011047. <https://arxiv.org/abs/cs/0011047>
7. Yato, T., & Seta, T. (2003). Complexity and completeness of finding another solution and its application to puzzles. IEICE Transactions on Fundamentals, E86-A(5), 1052–1060.
8. Harish, A. (2012, June 29). Can you solve the hardest-ever Sudoku? ABC News. <http://abcnews.com/blogs/headlines/2012/06/can-you-solve-the-hardest-ever-sudoku>
9. Wang, P.-W., Donti, P. L., Wilder, B., & Kolter, J. Z. (2019). SATNet: Bridging deep learning and logical reasoning using a differentiable satisfiability solver. ICML 2019. <https://arxiv.org/abs/1905.12149>
10. Chang, O., Flokas, L., Lipson, H., & Spranger, M. (2020). Assessing SATNet's ability to solve the symbol grounding problem. NeurIPS 2020. <https://proceedings.neurips.cc/paper/2020/hash/0ff8033cf9437c213ee13937b1c4c455-Abstract.html>
11. Wang, G., Li, J., Sun, Y., et al. (2025). Hierarchical Reasoning Model. arXiv:2506.21734. <https://arxiv.org/abs/2506.21734>
12. Lorenzobattistela (HigherOrderCO). (2025, July 30). Reproducibility results of Sudoku-Extreme and ARC-AGI 1. GitHub issue #12, sapientinc/HRM. <https://github.com/sapientinc/HRM/issues/12>
13. Ren, Z., & Liu, Z. (2026). Are your reasoning models reasoning or guessing? A mechanistic analysis of hierarchical reasoning models. arXiv:2601.10679. <https://arxiv.org/abs/2601.10679>

*Demo note: timings measured October 2026 with Node.js 20 on a shared Intel Xeon cloud server. The script is in data/ai-demo.mjs; your numbers will vary with hardware.*
