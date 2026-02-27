-- Friday Shoutouts - Give props to community members
CREATE TABLE IF NOT EXISTS shoutouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  category TEXT NOT NULL, -- photos, helpful, taste, active, vibes, reviews
  message TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_shoutouts_from_user ON shoutouts(from_user_id);
CREATE INDEX IF NOT EXISTS idx_shoutouts_to_user ON shoutouts(to_user_id);
CREATE INDEX IF NOT EXISTS idx_shoutouts_created_at ON shoutouts(created_at);
