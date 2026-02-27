-- Time Capsules table (messages to your future self)
CREATE TABLE IF NOT EXISTS time_capsules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  brand TEXT,
  product TEXT,
  mood TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  unlocks_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_time_capsules_user_id ON time_capsules(user_id);
CREATE INDEX IF NOT EXISTS idx_time_capsules_unlocks_at ON time_capsules(unlocks_at);
