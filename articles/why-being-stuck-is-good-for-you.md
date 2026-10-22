---
title: "Why Being Stuck on a Sudoku Is Good for You"
slug: why-being-stuck-is-good-for-you
meta_description: "Learning science says the stuck moments in a Sudoku are where you actually improve. Here's the research, and how it shaped our hints and skill ladder."
summary: "Desirable difficulties, productive failure and the generation effect all point the same way: struggle a little before getting help, and play just above your level."
publishDate: 2026-11-11
---

<!-- REQUIRES: hints (three-tap teaching hints), techniques (/techniques/ pages with worked examples, plus pages linked below), skill-ladder, articles /articles/what-makes-a-sudoku-hard/, /articles/why-ai-is-bad-at-sudoku/, /articles/does-sudoku-keep-your-brain-sharp/ -->

# Why Being Stuck Is Good for You

There's a moment in almost every NYT Hard I play. I've filled in the easy cells, my notes are a mess, and I've scanned every row, column and box twice. Nothing. Stuck.

For years I treated that moment as the problem. Now I think it's the point.

When I started building SudokuSudoku, I went looking for research on how people actually get better at things. Partly because [I have a ceiling](/articles/what-makes-a-sudoku-hard/). There are puzzles I just can't crack, and I wanted to know what would move it.

What I found, from people who study learning for a living, was surprisingly consistent. The stuck feeling isn't a sign that learning has stopped. Often it's the sign that it's about to happen.

## Desirable difficulties

The psychologist Robert Bjork at UCLA coined the term "desirable difficulties" in 1994 [1]. The core finding is a little uncomfortable. The conditions that make practice feel smooth and productive are often the ones that produce the least lasting learning, and some conditions that feel harder produce more.

Robert and Elizabeth Bjork's [examples](https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/11/Making-Things-Hard-on-Yourself-but-in-a-Good-Way-20111.pdf) include spacing practice out instead of cramming, mixing different kinds of problems together instead of doing them in blocks, and testing yourself instead of rereading [2]. They all feel worse while you're doing them. They all tend to work better a week later.

The word that matters is "desirable." The Bjorks are explicit that a difficulty only helps if you have the background knowledge or skill to respond to it. If you don't, it becomes an undesirable difficulty, and you're just lost [2].

That one sentence explains a lot about Sudoku. An Expert puzzle that needs an [X-wing](/techniques/x-wing/) isn't a desirable difficulty if you've never heard of an X-wing. It's a wall. The same puzzle a few weeks later, after you've learned the pattern but haven't quite made it automatic? Exactly the right kind of hard.

## The generation effect

In 1978, Norman Slamecka and Peter Graf published [a series of experiments](https://doi.org/10.1037/0278-7393.4.6.592) showing that people remember information better when they generate it themselves than when they just read it [3]. To borrow the style of their word tasks: if you complete "hot – c_ _ _" with "cold," you'll remember that pair better than if you'd just read "hot – cold."

It's one of the sturdier findings in memory research. A [2007 meta-analysis](https://doi.org/10.3758/BF03193441) pooled 86 studies and found an average advantage of about 0.4 standard deviations for generated over read material [4]. That's a meaningful effect, though it varied a lot depending on the kind of task and test.

The Bjorks put the practical version bluntly. Any time you look up an answer or have someone show you something you could have produced yourself, you "rob yourself of a powerful learning opportunity" [2].

In Sudoku terms: a hint that just fills in the cell gives you a digit. Finding the digit yourself, even with a nudge, gives you the pattern.

## Productive failure

The learning scientist Manu Kapur took this further. In [his studies](https://doi.org/10.1080/07370000802212669), students tried to solve complex problems before being taught how. They mostly failed. Then they got instruction. Compared with students who got instruction first and practiced afterward, the "fail first" students often understood the underlying ideas better [5].

Kapur calls it productive failure. The struggle seems to prepare the ground. You notice what you don't know, you try approaches that don't quite work, and when the real method shows up, it has somewhere to land.

A [2021 meta-analysis](https://doi.org/10.3102/00346543211019105) by Tanmay Sinha and Kapur pooled 53 studies. Problem solving before instruction gave a moderate advantage for conceptual understanding and transfer (an effect size of about 0.36), with no real difference for procedural skill [6]. The benefit was larger when the design followed the productive failure approach closely.

So it's not "struggle is always good." A certain kind of well-designed struggle, followed by real explanation, helps you understand why something works.

Which is a pretty good description of finding your first [hidden pair](/techniques/hidden-pair/) after twenty minutes of staring.

## Worked examples, and when they stop helping

There's a fair counterweight. In 1985, John Sweller and Graham Cooper [showed](https://doi.org/10.1207/s1532690xci0201_3) that students learning algebra often learned more from studying worked examples than from solving the same problems themselves [7]. For a true beginner, problem solving can overload working memory. You're so busy searching that you don't absorb the method.

But later research found the ["expertise reversal effect."](https://doi.org/10.1207/S15326985EP3801_4) Supports that help novices can become useless or even harmful as people gain skill. For more experienced learners, solving problems beats studying worked examples [8].

So the research doesn't say "never help." It says the right amount of help depends on where you are, and it should shrink as you improve.

## The assistance dilemma

Kenneth Koedinger and Vincent Aleven at Carnegie Mellon named this tension the ["assistance dilemma."](https://doi.org/10.1007/s10648-007-9049-0) How should a learning system balance giving help and holding it back? They called it a fundamental open problem in instructional science [9].

Their work on Cognitive Tutors, computer tutors used in real classrooms, is the closest thing I found to a blueprint for Sudoku hints. Those tutors offer hints on request in several levels, each more specific than the last. The final one, the "bottom-out hint," basically gives the answer [9].

And here's the part that made me laugh in recognition. Their log data showed students often clicked straight through to the bottom-out hint to get the answer, without reading the earlier hints that explained why [9]. Another researcher, Ryan Baker, coined a name for this: "gaming the system." Students also did the opposite, refusing to ask for help even after repeated mistakes [9].

I've done both. Everyone who's ever hit a hint button has done both.

## Flow, and playing just above your ceiling

The last idea is the most famous. The psychologist Mihaly Csikszentmihalyi spent years studying the state he called flow: total absorption in an activity, where time disappears [10]. One of its central conditions is balance. When a challenge is well below your skill, you get bored. Far above it, you get anxious. Flow tends to show up when the challenge sits right at the edge of what you can do.

Anyone who has played a puzzle that was exactly hard enough knows the feeling.

There's even a mathematical cousin of this. In 2019, Robert Wilson and colleagues [showed](https://doi.org/10.1038/s41467-019-12552-4) that for learning algorithms trained by gradient descent on simple two-choice tasks, learning is fastest when the learner gets things right about 85 percent of the time [11]. That's about computer models and simple tasks, so I wouldn't treat 85 percent as a rule for people playing Sudoku. But the shape of it, mostly succeeding with regular stumbles, lines up with everything above.

## How this shaped SudokuSudoku

I didn't want a hint button that just fills in a square. Here's what we built instead, and the research behind each piece.

**Three-tap hints.** Tap Hint once and it only shows you where to look: the cells involved, highlighted on your own board. That's the smallest nudge that can get you unstuck, and it leaves the generating to you. Tap again and it explains why: "the 7s in this box are locked to one row, so 7 can't go here." Tap a third time and it makes the move.

That's the multi-level hint ladder from the Cognitive Tutor research, with a bottom-out step at the end. The first tap protects the generation effect. The second turns a stuck moment into a productive failure with a real explanation behind it.

**One step at a time, on purpose.** I know I'm a hint-clicker. I don't think the answer is to hide hints, because refusing help after repeated mistakes isn't good either. The goal is for the first tap to be enough most of the time, so you still get to find the digit yourself.

**Hints that link to the technique.** Each hint names the technique it used and links to [a page explaining it](/techniques/), with a worked example. That's the worked-example research applied where it helps most, the moment you first meet something new.

**A skill ladder instead of one big jump.** Our grader knows which technique every step of a puzzle needs, because it [solves puzzles the way a person does](/articles/why-ai-is-bad-at-sudoku/). It can notice which techniques you handle on your own and which ones you still need hints for, then offer a puzzle that needs exactly one technique above where you are. That's my best attempt at a desirable difficulty. Hard enough to stretch you, close enough that you have what you need.

That last one matters to me personally. My ceiling isn't one big wall. It's a specific technique or two I haven't made mine yet. Jumping from Hard to Expert never helped, because Expert asked for three new things at once. One new thing at a time, a little struggle, then a clear explanation. That's what the research says should work. (Will it keep your brain young? [Different question](/articles/does-sudoku-keep-your-brain-sharp/), and a less exciting answer.)

So next time you're stuck on a grid that won't give, sit with it a little longer before you tap. You're not wasting time. That's the part where you get better.

Want to try it? Open a [Hard](/?difficulty=hard) and give yourself five minutes before the first hint.

## References

1. Bjork, R. A. (1994). Memory and metamemory considerations in the training of human beings. In J. Metcalfe & A. Shimamura (Eds.), Metacognition: Knowing about knowing (pp. 185–205). MIT Press.
2. Bjork, E. L., & Bjork, R. A. (2011). Making things hard on yourself, but in a good way: Creating desirable difficulties to enhance learning. In M. A. Gernsbacher et al. (Eds.), Psychology and the real world: Essays illustrating fundamental contributions to society (pp. 56–64). Worth Publishers. <https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/11/Making-Things-Hard-on-Yourself-but-in-a-Good-Way-20111.pdf>
3. Slamecka, N. J., & Graf, P. (1978). The generation effect: Delineation of a phenomenon. Journal of Experimental Psychology: Human Learning and Memory, 4(6), 592–604. <https://doi.org/10.1037/0278-7393.4.6.592>
4. Bertsch, S., Pesta, B. J., Wiscott, R., & McDaniel, M. A. (2007). The generation effect: A meta-analytic review. Memory & Cognition, 35(2), 201–210. <https://doi.org/10.3758/BF03193441>
5. Kapur, M. (2008). Productive failure. Cognition and Instruction, 26(3), 379–424. <https://doi.org/10.1080/07370000802212669>
6. Sinha, T., & Kapur, M. (2021). When problem solving followed by instruction works: Evidence for productive failure. Review of Educational Research, 91(5), 761–798. <https://doi.org/10.3102/00346543211019105>
7. Sweller, J., & Cooper, G. A. (1985). The use of worked examples as a substitute for problem solving in learning algebra. Cognition and Instruction, 2(1), 59–89. <https://doi.org/10.1207/s1532690xci0201_3>
8. Kalyuga, S., Ayres, P., Chandler, P., & Sweller, J. (2003). The expertise reversal effect. Educational Psychologist, 38(1), 23–31. <https://doi.org/10.1207/S15326985EP3801_4>
9. Koedinger, K. R., & Aleven, V. (2007). Exploring the assistance dilemma in experiments with Cognitive Tutors. Educational Psychology Review, 19(3), 239–264. <https://doi.org/10.1007/s10648-007-9049-0>
10. Csikszentmihalyi, M. (1990). Flow: The psychology of optimal experience. Harper & Row.
11. Wilson, R. C., Shenhav, A., Straccia, M., & Cohen, J. D. (2019). The Eighty Five Percent Rule for optimal learning. Nature Communications, 10, 4646. <https://doi.org/10.1038/s41467-019-12552-4>
