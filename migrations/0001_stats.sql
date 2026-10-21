-- Anonymous community puzzle stats.
-- One row is one play of one puzzle by one browser.
-- Apply each statement on its own. The Cloudflare D1 HTTP API runs a single
-- statement per request. Comments and the order are documented in
-- migrations/README.md.
--
-- Nothing in this table is an IP address, a country, or a user agent.
-- A play that is still open after 24 hours is marked abandoned by the
-- Pages Function (there is no cron). That update sets
-- outcome = 'abandoned' and finished_at = started_at + 86400000
-- where outcome is null and started_at is older than 24 hours.

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_plays_client_puzzle ON plays (client_id, puzzle_key);

CREATE INDEX IF NOT EXISTS idx_plays_open ON plays (outcome, started_at);

CREATE INDEX IF NOT EXISTS idx_plays_level ON plays (level, is_daily, outcome, finished_at);

CREATE INDEX IF NOT EXISTS idx_plays_client_started ON plays (client_id, started_at);
