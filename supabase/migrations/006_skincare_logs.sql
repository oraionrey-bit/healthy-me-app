-- ============================================
-- Migration: Add skincare_logs table
-- Single table for daily skincare tracking:
--   products used, routine adherence, skin state, product testing, cycle correlation
-- Replaces JSON blob storage in daily_logs.health_notes
-- ============================================

CREATE TABLE IF NOT EXISTS skincare_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  log_date DATE DEFAULT CURRENT_DATE NOT NULL,

  -- What products were used today (array of product names)
  products_used TEXT[] DEFAULT '{}',

  -- Routine adherence
  am_routine_done BOOLEAN DEFAULT FALSE,
  pm_routine_done BOOLEAN DEFAULT FALSE,
  am_steps_completed TEXT[] DEFAULT '{}',
  pm_steps_completed TEXT[] DEFAULT '{}',

  -- Daily skin state
  skin_score INTEGER CHECK (skin_score BETWEEN 1 AND 10),
  breakouts TEXT CHECK (breakouts IN ('none', 'mild', 'moderate', 'severe')),
  breakout_locations TEXT[] DEFAULT '{}',  -- forehead, chin, cheeks, nose, jawline, perioral
  dryness TEXT CHECK (dryness IN ('none', 'low', 'medium', 'high')),
  oiliness TEXT CHECK (oiliness IN ('none', 'low', 'medium', 'high')),
  sensitivity TEXT CHECK (sensitivity IN ('none', 'mild', 'moderate', 'severe')),
  texture TEXT CHECK (texture IN ('smooth', 'rough', 'bumpy', 'flaky')),

  -- Product testing
  testing_product TEXT,
  test_reaction TEXT CHECK (test_reaction IN ('none', 'mild', 'moderate', 'severe')),
  test_day INTEGER,  -- day N of testing period

  -- PCOS / cycle correlation
  cycle_day INTEGER,

  -- Photos and notes
  photo_urls TEXT[] DEFAULT '{}',
  notes TEXT,

  UNIQUE(user_id, log_date)
);

-- RLS
ALTER TABLE skincare_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skincare_logs"
  ON skincare_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own skincare_logs"
  ON skincare_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own skincare_logs"
  ON skincare_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own skincare_logs"
  ON skincare_logs FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skincare_logs_user_date ON skincare_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_skincare_logs_testing ON skincare_logs(user_id, testing_product) WHERE testing_product IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_skincare_logs_breakouts ON skincare_logs(user_id, log_date) WHERE breakouts IS NOT NULL AND breakouts != 'none';
