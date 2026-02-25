-- Smoke Timer: Track session duration
CREATE TABLE IF NOT EXISTS smoke_timers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  brand TEXT NOT NULL,
  product TEXT,
  notes TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  checkin_id INTEGER REFERENCES checkins(id),
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_smoke_timers_user ON smoke_timers(user_id);
CREATE INDEX IF NOT EXISTS idx_smoke_timers_active ON smoke_timers(user_id, ended_at);
