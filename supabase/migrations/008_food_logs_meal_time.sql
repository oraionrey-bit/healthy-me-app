-- ============================================
-- MIGRATION 008: food_logs.meal_time
-- Adds a simple optional text column for when the meal was eaten
-- (e.g., '8:30 AM', 'noon', 'after workout').
-- Restored from the May 7 deploy bundle.
-- ============================================

ALTER TABLE food_logs
  ADD COLUMN IF NOT EXISTS meal_time TEXT;

COMMENT ON COLUMN food_logs.meal_time IS 'Optional simple time label for when the meal was eaten, such as 8:30 AM or noon';
