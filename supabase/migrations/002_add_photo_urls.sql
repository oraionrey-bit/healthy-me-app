-- ============================================
-- Add photo_urls array column to food_logs
-- The app stores multiple photo URLs per entry
-- ============================================

ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS photo_urls TEXT[];
