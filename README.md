# SudokuSudoku

Static site for [sudokusudoku.com](https://sudokusudoku.com). The game runs entirely in the browser: a playable puzzle on first load, notes, undo, a daily puzzle, and stats saved on the device. Header, footer, and the rest of the site stay static HTML, CSS, and JavaScript.

Puzzles come from `SudokuGenerator.generate(difficulty, seed)`, which returns the puzzle, its solution, and metadata. The daily puzzle is the Not Easy grade. Its seed is the UTC date, so every visitor gets the same puzzle on a given day.

## Cloudflare Pages

Create a Pages project from this GitHub repository. Pages builds the site itself. This repo does not use a deploy token or a GitHub Action.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `22` (from `.nvmrc`; Pages picks this up automatically) |
| Environment variables | None for the game. The contact form needs the variables below. |

The build writes:

- `dist/404.html` for unknown URLs
- `dist/_redirects`, which sends `/sudoku` to `/` and `/articles/advanced-techniques` to `/techniques/`
- `dist/ads.txt`

The www hostname should redirect to the apex with a Cloudflare redirect rule. That rule lives in the dashboard, not in this repo.

## House promos

Reserved ad boxes are filled by House marks, a small in-house series that links to other pages on this site. The graphics and copy are the page. They are not labeled as ads.

Real AdSense units stay off. `ADSENSE_UNITS_ENABLED` in `scripts/house-promos.mjs` is false, and every unit id is still `REPLACE_WITH_SLOT`. The publisher id is `ca-pub-9345046210950956`. Flip the flag only after those ids are live units. The boxes keep the same sizes, so the swap does not move the layout. The AdSense script in the page head is unchanged.

Privacy, the 404 page, links, and account screens do not get a unit. The game unit sits below the homepage copy, outside the play column, so the phone keypad stays on the first screen.

After the first deploy, attach the custom domain `sudokusudoku.com` (and `www`) to the Pages project. The zone is already on Cloudflare. Remove the old A records that point at a deleted origin. Pages will publish the hostname on its own.

## Contact form

`functions/api/contact.js` is a Pages Function. It is not copied into `dist`. The page hides the form's send button state and shows "not available yet" until every item below exists. No email address is printed on the site.

1. Compute > Email Service > Email Sending > Onboard Domain: `sudokusudoku.com`. Cloudflare adds SPF, DKIM, DMARC, and the bounce MX records on `cf-bounce`. The From address has to be on that domain. The default is `contact@sudokusudoku.com`. A mailbox is not required to send.
2. Email Service > Email Routing > Destination addresses: add the inbox that should receive messages and complete the verification email. `CONTACT_TO` must be that verified address. Sending to a verified destination stays on the free path. An arbitrary recipient needs Workers Paid.
3. Turnstile: create a widget for `sudokusudoku.com`. Add the `pages.dev` preview hostname only if the form should work on preview deployments.
4. Pages project > Settings > Environment variables, for Production (and Preview if you want the form there):
   - `TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
   - `CONTACT_TO` (the verified destination)
   - `CONTACT_FROM` (optional plain address on the onboarded domain)
5. Pages project > Settings > Bindings > Service binding. Variable name: `EMAIL`. Service: `sudokusudoku-mailer`, entrypoint `Mailer`. Pages Functions cannot hold a send_email binding. The worker's `send({to, from, replyTo, subject, text})` RPC forwards to Email Sending. Redeploy so the binding attaches.

There is no `wrangler.toml`. The build command and output directory stay as they are in the Pages project.

## Optional account

Sign-in is optional. The game keeps using `localStorage` first. A signed-in player also gets a copy of stats, streaks, settings, skill progress, and the unfinished puzzle in D1, so it can survive a cleared browser or a new device. Anonymous play does not call these endpoints.

`functions/api/account/` is the Pages Function. Apply [`migrations/0002_accounts.sql`](migrations/0002_accounts.sql) to both D1 databases the same way as the stats tables. One statement per request.

The sign-in form reuses the contact form's Turnstile keys (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`). Add the preview hostname to the Turnstile widget if sign-in should work on preview deployments.

Email has to reach whatever address the player types. The contact binding `EMAIL` cannot do that: `sudokusudoku-mailer` is locked to the verified destination in `CONTACT_TO`. Cloudflare Email Routing's `send_email` binding, with or without a destination lock, only delivers to verified destination addresses unless Email Sending is enabled for arbitrary recipients (Workers Paid, domain onboarded, `cf-bounce` DNS). This account has Email Routing and does not have Email Sending onboarded.

Use one of these, then redeploy:

1. Cloudflare Email Sending, once the account is on Workers Paid and `sudokusudoku.com` is onboarded under Compute > Email Service > Email Sending. Add a worker method that calls an unrestricted `send_email` binding, then add a Pages service binding named `LOGIN_EMAIL` to that worker. Do not point `LOGIN_EMAIL` at the contact mailer's destination-locked binding.
2. Or set a Pages secret `LOGIN_EMAIL_API_KEY` (Resend) on Production and Preview. Verify `sudokusudoku.com` with Resend so the From address is allowed. Optional `LOGIN_FROM` (default `SudokuSudoku <login@sudokusudoku.com>`).

Production sign-in links always use `https://sudokusudoku.com` (`CF_PAGES_BRANCH === "main"`, or `SITE_ORIGIN` when that is set). Preview links use the host the player requested from. A verify link opened on another production host redirects to that canonical URL before the token is used. An expired or used link returns a page with a path to send a new one.

Until one of those exists, the sign-in sheet still shows, and the request responds that sign-in email is not set up. No secret belongs in the repo or in logs.

## Practice

`/?practice=<technique>` deals a puzzle whose solve path needs that technique, fills every easier step, and stops when that technique is the next move. The same jump is on each technique page, the skill ladder, and More → Practice a technique. More → Fill a technique (and the hint sheet) applies every currently available step of one technique as a single undo.

Practice games and any puzzle you fast-forward stay out of times, streaks, badges, no-hint records, and the daily. A finished practice can mark that technique as seen. It is not a clean solve. Neither kind of game is posted to `POST /api/stats/start` or recorded as a solved play. A normal game that already logged a start, then got fast-forwarded, is left unfinished for the 24h sweep instead of being stored as a solve.

## Community stats

D1 is bound on the Pages project as `STATS_DB`. Production uses `sudokusudoku-stats` (`1d90567c-bc27-48d4-bd35-f9d02f2fd036`). Preview deployments use `sudokusudoku-stats-preview` (`492493ba-3bad-403e-8391-1090489ef024`). Apply the statements in [`migrations/README.md`](migrations/README.md) to both databases with the Cloudflare API. Do not seed sample rows into production.

`POST /api/stats/start` records an anonymous play on the first digit or note, not when the puzzle is dealt. `POST /api/stats/finish` records the outcome. Requests with no user agent, and HeadlessChrome, are ignored. Practice games are not posted. `GET /api/stats/summary` is the public aggregate, cached at the edge for about 10 minutes. It includes average technique hints per solved game and the hardest hint players used. A bucket with fewer than 20 finishes is omitted, so a handful of test plays cannot publish. The response has no player id. `GET /api/stats/consent` says whether this request's country should wait for analytics consent before the page stores a random id. The country is not saved. Game events `game_start`, `game_complete`, and `game_abandon` go to Google Analytics through the existing Consent Mode tag.

Your own hint record (technique hints, checks, and hints per level) is on `/stats/` and in the in-game stats window. It is stored with the rest of your skills and merged with the account when you are signed in. A wrong-digit check is not a technique hint.

## Local

Node 22 is required.

```bash
npm install
npm run build
npx serve dist
```

`npm run build` compiles `assets/scss/main.scss` and writes a ready-to-serve `dist/` folder.

`npm run test:grader` generates puzzles for every difficulty and prints clue, technique, step, stall, and bottleneck distributions. `node scripts/test-grader.mjs --nyt <dir>` also compares the grader with the Python reference on archived NYT CSV exports in that directory.
