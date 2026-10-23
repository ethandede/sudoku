-- Optional account. Email plus a JSON copy of on-device game data.
-- No name and no password. Apply each statement on its own. The D1 HTTP API
-- runs one statement per request. The same list is in migrations/README.md.
--
-- login_tokens.ip_hash is a SHA-256 of the connecting IP, used only to rate
-- limit sign-in emails. The address itself is not stored. Tokens store hashes
-- of the magic link and the 6-digit code, not the values sent to the player.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);

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

CREATE INDEX IF NOT EXISTS idx_login_tokens_email_created ON login_tokens (email, created_at);

CREATE INDEX IF NOT EXISTS idx_login_tokens_ip_created ON login_tokens (ip_hash, created_at);

CREATE TABLE IF NOT EXISTS player_data (
  user_id TEXT PRIMARY KEY,
  blob TEXT NOT NULL,
  version INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
