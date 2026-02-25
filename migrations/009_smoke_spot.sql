-- Add smoke_spot field to checkins table
ALTER TABLE checkins ADD COLUMN smoke_spot TEXT;

-- Index for future analytics
CREATE INDEX IF NOT EXISTS idx_checkins_smoke_spot ON checkins(smoke_spot);
