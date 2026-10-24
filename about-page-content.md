Hi, I'm Ethan Ede.

<figure class="teddy-figure">
  <img class="teddy-art" src="/assets/img/teddy/teddy.svg" width="256" height="320" alt="Teddy, a black Australian labradoodle with a curly coat, tan brows, a grey beard, a white chest patch, and a red collar" loading="lazy" decoding="async">
  <figcaption><img class="teddy-icon" src="/assets/img/teddy/teddy-icon.svg" width="32" height="32" alt="">Teddy, chief puzzle supervisor. Never once helpful.</figcaption>
</figure>

I build websites for a living, and I have for more than 20 years. I also play a lot of Sudoku. Most days that is the New York Times puzzle in their app, usually with coffee, sometimes with Teddy's head on my knee wondering why I'm not throwing the ball. I live in Portland, Oregon. I built SudokuSudoku, and I run it. Teddy is a black Australian labradoodle with a white chest patch, and he is a grown dog. Mia the tabby lives here too.

I'm not a Sudoku genius. I have a ceiling. For years I solved on singles and stubbornness, and when a puzzle needed an X-wing or a coloring chain, I'd guess or give up. I knew those techniques existed. I was too lazy to sit down and learn them, and every place I looked made it feel like homework: a wall of text, a static diagram, and good luck. So I built the tool I wanted. When you're stuck, it shows you the move on your own board, names it, explains why it works, and lets you practice that one technique until it clicks. The honest difficulty grades came along for the ride.

## How a puzzle gets a level

A new game is generated in your browser when you start it. The generator fills a complete grid at random, then removes givens one cell at a time. A removal stays only when the puzzle still has exactly one solution. There is no symmetry.

A solver then plays the puzzle the way a person would, easiest move first. Singles come first: a [naked single](/techniques/naked-single/), then a [hidden single](/techniques/hidden-single/) in a box, then a hidden single in a row or column. Once the singles run out, it looks for [pointing](/techniques/pointing/) and [claiming](/techniques/claiming/), then pairs, triples, and the harder patterns after those. The hardest move that was actually required sets the level. The generator puts clues back, or takes more out, until the puzzle sits in that level's window. If a fresh grid will not land there, the game serves one from a checked pool of the same level.

Quick and Easy stay on singles. Quick may only place naked singles and hidden singles inside a box. Easy also allows a hidden single in a row or column. Not Easy requires pointing or claiming. Hard requires a pair or a triple. Expert and Mental are the steps past that. The [daily](/?daily) is a Not Easy, and its seed is the UTC date, so everyone gets the same grid that day.

The gates, the clue windows, stalls, bottlenecks, and a comparison with 1,483 New York Times puzzles are on [how difficulty works](/how-difficulty-works/). Every step the solver can name has a page in the [technique library](/techniques/), with a board you can click through. A [naked pair](/techniques/naked-pair/) is one of the moves that puts a puzzle on Hard. An [X-wing](/techniques/x-wing/) is one of the Expert patterns. [Coloring](/techniques/coloring/) and an [XY-chain](/techniques/xy-chain/) are Mental. If you want to feel the window, start a [Not Easy](/?difficulty=not-easy) or a [Hard](/?difficulty=hard).

## What a hint does

A hint points at the cells, names the technique, and shows why the step works. The sheet links to that technique's page. If a digit already on the board is wrong, the hint says so before it teaches the next move. A step built on a bad digit is junk.

You can practice one technique on its own. The puzzle loads with the easier steps filled, and it stops where that technique is the next move. The same jump is on each technique page, on the skill ladder, and under More in the game. Practice stays out of times, streaks, badges, and the daily. A finished practice can mark the technique as seen. It is not recorded as a clean solve.

## What stays on this device

You can play without an account. The puzzle in progress, your settings, your own stats, and the skill ladder live in this browser's local storage. They are not cookies. That copy stays on the device unless you ask for an account.

Sign-in is optional. In Stats or Settings, Save your progress emails you a link and a 6-digit code. There is no password. They expire after 15 minutes, and each works once. If you sign in, the server keeps your email and a copy of your stats, streak, settings, skill progress, and an unfinished puzzle, so another device can pick it up. Delete my account removes that server copy. The copy on this device stays until you clear the site's data. I do not sell email addresses or game data.

Share anonymous play stats, in Settings, feeds the public [stats page](/stats/). A random id in local storage keeps one browser from counting the same puzzle twice. Turn the switch off and the id is deleted. In the European Economic Area, the United Kingdom, and Switzerland the game waits for analytics consent first. Elsewhere the switch starts on. A group with fewer than 20 finished plays is left off the public page.

Google Analytics and the AdSense script load on the game and on most other pages. Those same regions get a consent message before ad storage and analytics storage are allowed. Cloudflare Web Analytics counts page views and does not use cookies. The [privacy policy](/privacy-policy/) is the full list, including how to ask for a copy or a deletion. The [terms of use](/terms/) cover the rules of the site.

Is the grader perfect? Probably not. It is honest about the move it used, and it is built by someone who still gets stuck. If something is broken, a grade looks wrong, or you want to argue about whether X-wings are fun, use the [contact form](/contact/). It comes straight to me.

-Ethan
