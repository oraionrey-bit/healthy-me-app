-- ============================================
-- Migration: Add calf recovery tracking
-- Adds dedicated columns to daily_logs + calf_measurements table
-- For proper Excel export of recovery progress
-- ============================================

-- Add calf tracking columns to daily_logs
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS wore_compression_socks BOOLEAN DEFAULT FALSE;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS wore_calf_sleeves BOOLEAN DEFAULT FALSE;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS stretched_minutes INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS calf_notes TEXT;

-- ============================================
-- TABLE: calf_measurements
-- Periodic calf/ankle measurements for recovery tracking
-- ============================================
CREATE TABLE IF NOT EXISTS calf_measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  measure_date DATE DEFAULT CURRENT_DATE NOT NULL,
  left_calf_cm NUMERIC(5,1) NOT NULL,
  right_calf_cm NUMERIC(5,1) NOT NULL,
  ankle_flexion_degrees NUMERIC(5,1),
  notes TEXT,

  UNIQUE(user_id, measure_date)
);

-- RLS
ALTER TABLE calf_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calf_measurements"
  ON calf_measurements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own calf_measurements"
  ON calf_measurements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calf_measurements"
  ON calf_measurements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own calf_measurements"
  ON calf_measurements FOR DELETE USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_calf_measurements_user_date ON calf_measurements(user_id, measure_date);
