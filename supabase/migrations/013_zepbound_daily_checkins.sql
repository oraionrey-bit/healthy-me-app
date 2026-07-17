-- Add the manual, Oura-independent Zepbound daily check-in.
-- Nullable booleans preserve the difference between unanswered and No.

BEGIN;

CREATE TABLE zepbound_daily_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  worked_out BOOLEAN,
  workout_duration_minutes SMALLINT,
  pooped BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT zepbound_daily_checkins_answered_check
    CHECK (worked_out IS NOT NULL OR pooped IS NOT NULL),
  CONSTRAINT zepbound_daily_checkins_duration_check CHECK (
    (worked_out IS TRUE AND workout_duration_minutes BETWEEN 1 AND 1440)
    OR (worked_out IS FALSE AND workout_duration_minutes IS NULL)
    OR (worked_out IS NULL AND workout_duration_minutes IS NULL)
  ),
  UNIQUE (user_id, log_date)
);

CREATE INDEX idx_zepbound_daily_checkins_user_date
  ON zepbound_daily_checkins (user_id, log_date DESC);

CREATE TRIGGER update_zepbound_daily_checkins_updated_at
  BEFORE UPDATE ON zepbound_daily_checkins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE zepbound_daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own Zepbound daily check-ins"
  ON zepbound_daily_checkins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Zepbound daily check-ins"
  ON zepbound_daily_checkins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Zepbound daily check-ins"
  ON zepbound_daily_checkins FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own Zepbound daily check-ins"
  ON zepbound_daily_checkins FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMIT;
