# Sudoku Sudoku

Static site for [sudokusudoku.com](https://sudokusudoku.com). The game, header, footer, and styles are the old WordPress theme, served as plain HTML, CSS, and JavaScript.

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
