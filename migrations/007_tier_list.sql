-- User tier list table for brand rankings
CREATE TABLE IF NOT EXISTS user_tier_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  brand TEXT NOT NULL,
  tier TEXT NOT NULL CHECK(tier IN ('S', 'A', 'B', 'C', 'D', 'F')),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id, brand)
);

CREATE INDEX IF NOT EXISTS idx_tier_list_user ON user_tier_list(user_id);
