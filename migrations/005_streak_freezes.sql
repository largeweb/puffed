-- Streak Freezes table
-- Allows users to protect their streak once per week without logging a smoke
CREATE TABLE IF NOT EXISTS streak_freezes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_streak_freezes_user ON streak_freezes(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_freezes_created ON streak_freezes(created_at);
