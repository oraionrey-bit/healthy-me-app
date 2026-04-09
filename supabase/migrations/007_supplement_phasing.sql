-- ============================================
-- MIGRATION 007: Supplement Phasing Support
-- Adds phase_schedule JSONB to user_supplements
-- for medications like metformin that ramp up over time
-- ============================================

ALTER TABLE user_supplements
  ADD COLUMN IF NOT EXISTS phase_schedule JSONB DEFAULT NULL;

-- phase_schedule schema example for metformin:
-- {
--   "phases": [
--     { "phase": 1, "label": "500mg x1/day", "dosage": "500mg", "frequency": "once daily", "duration_weeks": 2 },
--     { "phase": 2, "label": "500mg x2/day", "dosage": "500mg", "frequency": "twice daily", "duration_weeks": 2 },
--     { "phase": 3, "label": "500mg x4/day (2000mg)", "dosage": "500mg x4", "frequency": "four times daily", "duration_weeks": null }
--   ],
--   "current_phase": 1,
--   "phase_started_at": "2026-04-08",
--   "start_date": "2026-04-08"
-- }

COMMENT ON COLUMN user_supplements.phase_schedule IS 'JSONB phasing schedule for medications that ramp up over time (e.g., metformin)';
