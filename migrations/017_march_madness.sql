-- March Madness bracket tables

CREATE TABLE IF NOT EXISTS march_matchups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL DEFAULT 2026,
  round INTEGER NOT NULL, -- 1=Round of 16, 2=Elite Eight, 3=Final Four, 4=Championship
  position INTEGER NOT NULL, -- Position within round (1-8 for R16, 1-4 for E8, etc.)
  brand1 TEXT NOT NULL,
  brand2 TEXT NOT NULL,
  votes1 INTEGER DEFAULT 0,
  votes2 INTEGER DEFAULT 0,
  winner TEXT,
  active INTEGER DEFAULT 0, -- 1 = currently votable
  end_time INTEGER, -- When voting ends for this matchup
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_march_matchups_year ON march_matchups(year);
CREATE INDEX IF NOT EXISTS idx_march_matchups_round ON march_matchups(round);
CREATE INDEX IF NOT EXISTS idx_march_matchups_active ON march_matchups(active);

CREATE TABLE IF NOT EXISTS march_votes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  matchup_id INTEGER NOT NULL,
  brand TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (matchup_id) REFERENCES march_matchups(id) ON DELETE CASCADE,
  UNIQUE(user_id, matchup_id)
);

CREATE INDEX IF NOT EXISTS idx_march_votes_user_id ON march_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_march_votes_matchup_id ON march_votes(matchup_id);
