-- Migration: Extend saved_meals for Personal Food Dictionary
-- Adds auto-save support, fuzzy matching aliases, serving info, source tracking

-- Add new columns to saved_meals
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}';
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'ai_analyzed', 'user_created', 'barcode'));
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS serving_size NUMERIC(8,1);
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS serving_unit TEXT DEFAULT 'serving';
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS original_ai_calories INTEGER;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS original_ai_protein NUMERIC(6,1);
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS original_ai_carbs NUMERIC(6,1);
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS original_ai_fat NUMERIC(6,1);

-- Index for fuzzy text search on name
CREATE INDEX IF NOT EXISTS idx_saved_meals_user_name ON saved_meals(user_id, name);
CREATE INDEX IF NOT EXISTS idx_saved_meals_user_use_count ON saved_meals(user_id, use_count DESC);
CREATE INDEX IF NOT EXISTS idx_saved_meals_user_last_used ON saved_meals(user_id, last_used_at DESC NULLS LAST);

-- RLS policies for saved_meals (if not already present)
ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to be safe (idempotent)
DO $$
BEGIN
  -- Check if policies exist before creating
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_meals' AND policyname = 'Users can view own saved_meals') THEN
    EXECUTE 'CREATE POLICY "Users can view own saved_meals" ON saved_meals FOR SELECT USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_meals' AND policyname = 'Users can insert own saved_meals') THEN
    EXECUTE 'CREATE POLICY "Users can insert own saved_meals" ON saved_meals FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_meals' AND policyname = 'Users can update own saved_meals') THEN
    EXECUTE 'CREATE POLICY "Users can update own saved_meals" ON saved_meals FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_meals' AND policyname = 'Users can delete own saved_meals') THEN
    EXECUTE 'CREATE POLICY "Users can delete own saved_meals" ON saved_meals FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END $$;
