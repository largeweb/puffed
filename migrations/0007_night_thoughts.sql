-- Night Thoughts table (ephemeral thoughts shared in Late Night Lounge)
CREATE TABLE IF NOT EXISTS night_thoughts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  thought TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_night_thoughts_user_id ON night_thoughts(user_id);
CREATE INDEX IF NOT EXISTS idx_night_thoughts_created_at ON night_thoughts(created_at);
