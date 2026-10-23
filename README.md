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

## Community stats

D1 is bound on the Pages project as `STATS_DB`. Production uses `sudokusudoku-stats` (`1d90567c-bc27-48d4-bd35-f9d02f2fd036`). Preview deployments use `sudokusudoku-stats-preview` (`492493ba-3bad-403e-8391-1090489ef024`). Apply the statements in [`migrations/README.md`](migrations/README.md) to both databases with the Cloudflare API. Do not seed sample rows into production.

`POST /api/stats/start` and `POST /api/stats/finish` record an anonymous play. `GET /api/stats/summary` is the public aggregate, cached at the edge for about 10 minutes. A bucket with fewer than 20 finishes is omitted. `GET /api/stats/consent` says whether this request's country should wait for analytics consent before the page stores a random id. The country is not saved.

## Local

Node 22 is required.

```bash
npm install
npm run build
npx serve dist
```

`npm run build` compiles `assets/scss/main.scss` and writes a ready-to-serve `dist/` folder.

`npm run test:grader` generates puzzles for every difficulty and prints clue, technique, step, stall, and bottleneck distributions. `node scripts/test-grader.mjs --nyt <dir>` also compares the grader with the Python reference on archived NYT CSV exports in that directory.
