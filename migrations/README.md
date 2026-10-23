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

`functions/api/stats/start.js` inserts a row on the first digit or note, not when the page loads. HeadlessChrome and requests with no user agent are rejected and do not write a row. `functions/api/stats/finish.js` fills the outcome. The client id is a random 32-character hex value from `localStorage` (`sudoku-anon-id`), not a cookie. The puzzle key is the SHA-256 hex of the seed string, or of the 81 givens when the puzzle has no seed. The same client and puzzle key are one play.

Outcomes are `solved`, `revealed` (Reveal Puzzle), `failed` (the four-mistake limit, and the player left that game), and `abandoned`. Leaving a tab does not abandon the play, because the game is still saved on the device. The next visit abandons it if that save is gone, and a new game abandons it if it was replaced. A start that still has no finish after 24 hours is marked abandoned when the next start or the public summary runs. There is no scheduled cron. A later real finish may replace `abandoned` with `solved`, `revealed`, or `failed`. It will not replace those three with `abandoned`.

Solved and revealed times below 8 seconds on Quick, or below 20 seconds on every other level, are rejected. Failed and abandoned plays can be shorter. Each client can start 40 plays per rolling day, and at most one new play every 10 seconds. That is a rate limit, not a random sample.

## Optional account

Run these after the stats statements, once per database, one statement per request. They create the optional sign-in tables. They do not change `plays`.

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
```

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
```

```sql
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
```

```sql
CREATE TABLE IF NOT EXISTS login_tokens (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  failures INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  ip_hash TEXT NOT NULL
);
```

```sql
CREATE INDEX IF NOT EXISTS idx_login_tokens_email_created ON login_tokens (email, created_at);
```

```sql
CREATE INDEX IF NOT EXISTS idx_login_tokens_ip_created ON login_tokens (ip_hash, created_at);
```

```sql
CREATE TABLE IF NOT EXISTS player_data (
  user_id TEXT PRIMARY KEY,
  blob TEXT NOT NULL,
  version INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

`users.email` is the only identity. `player_data.blob` is JSON for stats, skills, settings, and one in-progress puzzle. `login_tokens` stores SHA-256 hashes of the magic link and the 6-digit code, plus `ip_hash` (SHA-256 of the connecting IP) for rate limits. The raw link, the raw code, and the IP address are not stored. Sessions store a hash of the cookie value. Deleting the account removes the user, sessions, login tokens, and player data for that email.

`GET /api/stats/summary` is cached at the edge for about 10 minutes. A group with fewer than 20 finishes is suppressed. Daily plays are reported on their own and are not mixed into the Not Easy free-play numbers.
