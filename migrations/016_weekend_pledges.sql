-- Weekend Pledges table
CREATE TABLE IF NOT EXISTS weekend_pledges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pledge_type TEXT NOT NULL,
  weekend_start INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, pledge_type, weekend_start)
);

CREATE INDEX IF NOT EXISTS idx_weekend_pledges_weekend ON weekend_pledges(weekend_start);
CREATE INDEX IF NOT EXISTS idx_weekend_pledges_user ON weekend_pledges(user_id);
