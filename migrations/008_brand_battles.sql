-- Brand Battle Votes table
CREATE TABLE IF NOT EXISTS brand_battle_votes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  brand TEXT NOT NULL,
  voted_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_brand_battle_votes_week ON brand_battle_votes(week_number);
CREATE INDEX IF NOT EXISTS idx_brand_battle_votes_brand ON brand_battle_votes(brand, week_number);
