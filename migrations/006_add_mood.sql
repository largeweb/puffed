-- Add mood column to checkins table for tracking how users feel when smoking
ALTER TABLE checkins ADD COLUMN mood TEXT;

-- Index for mood-based queries
CREATE INDEX IF NOT EXISTS idx_checkins_mood ON checkins(mood);
