# Sudoku Sudoku

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
| Environment variables | None |

The build writes:

- `dist/404.html` for unknown URLs
- `dist/_redirects`, which sends `/sudoku` and `/sudoku/` to `/`
- `dist/ads.txt`

No redirects file or environment variable has to be added in the dashboard. After the first deploy, attach the custom domain `sudokusudoku.com` (and `www`) to the Pages project. The zone is already on Cloudflare. Remove the old A records that point at a deleted origin. Pages will publish the hostname on its own.

## Local

Node 22 is required.

```bash
npm install
npm run build
npx serve dist
```

`npm run build` compiles `assets/scss/main.scss` and writes a ready-to-serve `dist/` folder.

`npm run test:grader` generates puzzles for every difficulty and prints clue, technique, step, stall, and bottleneck distributions. `node scripts/test-grader.mjs --nyt <dir>` also compares the grader with the Python reference on archived NYT CSV exports in that directory.
