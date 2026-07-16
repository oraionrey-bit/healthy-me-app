-- Dedicated longitudinal Zepbound injection and symptom tracking.

CREATE TABLE IF NOT EXISTS zepbound_injections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  injection_date DATE NOT NULL,
  injection_time TIME NOT NULL,
  dose_mg NUMERIC(5,2) NOT NULL CHECK (dose_mg > 0),
  injection_site TEXT NOT NULL CHECK (injection_site IN ('abdomen', 'thigh', 'upper_arm', 'other')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS zepbound_symptom_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  injection_id UUID REFERENCES zepbound_injections(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  log_date DATE NOT NULL,
  symptom_time TIME NOT NULL,
  symptom_type TEXT NOT NULL CHECK (btrim(symptom_type) <> ''),
  severity SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  notes TEXT
);

ALTER TABLE zepbound_injections ENABLE ROW LEVEL SECURITY;
ALTER TABLE zepbound_symptom_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own zepbound_injections"
  ON zepbound_injections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own zepbound_injections"
  ON zepbound_injections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own zepbound_injections"
  ON zepbound_injections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own zepbound_injections"
  ON zepbound_injections FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own zepbound_symptom_logs"
  ON zepbound_symptom_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own zepbound_symptom_logs"
  ON zepbound_symptom_logs FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      injection_id IS NULL
      OR EXISTS (
        SELECT 1 FROM zepbound_injections
        WHERE id = injection_id AND user_id = auth.uid()
      )
    )
  );
CREATE POLICY "Users can update own zepbound_symptom_logs"
  ON zepbound_symptom_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
    auth.uid() = user_id
    AND (
      injection_id IS NULL
      OR EXISTS (
        SELECT 1 FROM zepbound_injections
        WHERE id = injection_id AND user_id = auth.uid()
      )
    )
  );
CREATE POLICY "Users can delete own zepbound_symptom_logs"
  ON zepbound_symptom_logs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_zepbound_injections_user_date
  ON zepbound_injections(user_id, injection_date DESC);
CREATE INDEX IF NOT EXISTS idx_zepbound_symptom_logs_user_date
  ON zepbound_symptom_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_zepbound_symptom_logs_injection
  ON zepbound_symptom_logs(injection_id);
