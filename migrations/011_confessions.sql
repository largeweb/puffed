-- Smoke Confessional - Anonymous late-night thoughts
CREATE TABLE IF NOT EXISTS confessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  confession TEXT NOT NULL,
  mood TEXT,
  hour_posted INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_confessions_created ON confessions(created_at);
CREATE INDEX IF NOT EXISTS idx_confessions_user ON confessions(user_id);

-- Reactions to confessions (anonymous solidarity)
CREATE TABLE IF NOT EXISTS confession_reactions (
  id TEXT PRIMARY KEY,
  confession_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (confession_id) REFERENCES confessions(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(confession_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_confession_reactions_confession ON confession_reactions(confession_id);
