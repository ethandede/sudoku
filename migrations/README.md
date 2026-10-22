# Stats database migrations

Cloudflare D1 is already bound to the Pages project as `STATS_DB`.

| Environment | Database name | Database ID |
| --- | --- | --- |
| Production | `sudokusudoku-stats` | `1d90567c-bc27-48d4-bd35-f9d02f2fd036` |
| Preview | `sudokusudoku-stats-preview` | `492493ba-3bad-403e-8391-1090489ef024` |

Preview deployments read and write the preview database, so test plays do not land in production. There is no `wrangler.toml` in this repo. Do not add one. The Pages build stays `npm run build` with output directory `dist`.

Apply the same statements to both databases. The D1 HTTP API runs one statement per request. Do not send the whole file in one call. Do not seed sample rows into production.

Set `CLOUDFLARE_API_TOKEN` to a token that can query D1, and `ACCOUNT_ID` to the Cloudflare account that owns the databases.

```bash
curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/d1/database/DATABASE_ID/query" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"sql":"STATEMENT"}'
```

`DATABASE_ID` is one of the two ids above. A successful response has `"success": true`.

## Statements

Run these in order, once per database.

```sql
CREATE TABLE IF NOT EXISTS plays (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  puzzle_key TEXT NOT NULL,
  level TEXT NOT NULL,
  is_daily INTEGER NOT NULL DEFAULT 0,
  puzzle_date TEXT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  outcome TEXT,
  elapsed_seconds INTEGER,
  mistakes INTEGER,
  hints_used INTEGER,
  hardest_hint TEXT,
  notes_used INTEGER,
  device_class TEXT,
  created_at INTEGER NOT NULL
);
```

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_plays_client_puzzle ON plays (client_id, puzzle_key);
```

```sql
CREATE INDEX IF NOT EXISTS idx_plays_open ON plays (outcome, started_at);
```

```sql
CREATE INDEX IF NOT EXISTS idx_plays_level ON plays (level, is_daily, outcome, finished_at);
```

```sql
CREATE INDEX IF NOT EXISTS idx_plays_client_started ON plays (client_id, started_at);
```

## What the table is for

`functions/api/stats/start.js` inserts a row when a puzzle starts. `functions/api/stats/finish.js` fills the outcome. The client id is a random 32-character hex value from `localStorage` (`sudoku-anon-id`), not a cookie. The puzzle key is the SHA-256 hex of the seed string, or of the 81 givens when the puzzle has no seed. The same client and puzzle key are one play.

Outcomes are `solved`, `revealed` (Reveal Puzzle), `failed` (the four-mistake limit, and the player left that game), and `abandoned`. Leaving a tab does not abandon the play, because the game is still saved on the device. The next visit abandons it if that save is gone, and a new game abandons it if it was replaced. A start that still has no finish after 24 hours is marked abandoned when the next start or the public summary runs. There is no scheduled cron. A later real finish may replace `abandoned` with `solved`, `revealed`, or `failed`. It will not replace those three with `abandoned`.

Solved and revealed times below 8 seconds on Quick, or below 20 seconds on every other level, are rejected. Failed and abandoned plays can be shorter. Each client can start 40 plays per rolling day, and at most one new play every 10 seconds. That is a rate limit, not a random sample.

`GET /api/stats/summary` is cached at the edge for about 10 minutes. A group with fewer than 20 finishes is suppressed. Daily plays are reported on their own and are not mixed into the Not Easy free-play numbers.
