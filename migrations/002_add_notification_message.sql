-- Migration: Add message column to notifications table
-- Run: npx wrangler d1 execute puffed-db --file=migrations/002_add_notification_message.sql --remote

ALTER TABLE notifications ADD COLUMN message TEXT;
