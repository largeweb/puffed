-- Wishlist table for "Want to Try" brands
CREATE TABLE IF NOT EXISTS wishlist (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    brand TEXT NOT NULL,
    notes TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, brand)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_brand ON wishlist(brand);
