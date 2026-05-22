-- ============================================
-- MIGRATION 008: food_logs.meal_time
-- Adds a free-form text column for meal time
-- (e.g., 'breakfast', 'lunch', 'dinner', 'snack').
-- Restored from the May 7 deploy bundle.
-- ============================================

ALTER TABLE food_logs
  ADD COLUMN IF NOT EXISTS meal_time TEXT;

COMMENT ON COLUMN food_logs.meal_time IS 'Optional meal category for a food log entry (breakfast, lunch, dinner, snack, etc.)';
