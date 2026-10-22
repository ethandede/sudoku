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

## Local

Node 22 is required.

```bash
npm install
npm run build
npx serve dist
```

`npm run build` compiles `assets/scss/main.scss` and writes a ready-to-serve `dist/` folder.

`npm run test:grader` generates puzzles for every difficulty and prints clue, technique, step, stall, and bottleneck distributions. `node scripts/test-grader.mjs --nyt <dir>` also compares the grader with the Python reference on archived NYT CSV exports in that directory.
