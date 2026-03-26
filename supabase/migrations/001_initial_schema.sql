-- ============================================
-- Healthy Me — Initial Database Schema
-- 12 tables, RLS, triggers, indexes, storage
-- Created: 2026-03-26
-- NOTE: pet_status table deferred to future ticket
-- ============================================

-- ============================================
-- TABLE: user_profiles
-- Core user data, created via trigger on signup
-- ============================================
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Identity
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,

  -- PCOS Profile
  pcos_type TEXT CHECK (pcos_type IN (
    'insulin_resistant', 'post_pill', 'inflammatory', 'adrenal', 'unsure', NULL
  )),
  date_of_birth DATE,

  -- Goals
  calorie_target INTEGER DEFAULT 1500,
  protein_target INTEGER DEFAULT 80,
  carb_target INTEGER DEFAULT 150,
  fat_target INTEGER DEFAULT 55,
  water_target INTEGER DEFAULT 8,
  goal_weight DECIMAL(5,2),
  weight_unit TEXT DEFAULT 'lbs' CHECK (weight_unit IN ('lbs', 'kg')),

  -- Pet (static character for MVP)
  pet_choice TEXT DEFAULT 'default',
  pet_name TEXT,

  -- Settings
  onboarding_complete BOOLEAN DEFAULT FALSE,
  push_token TEXT,
  notification_supplements_time TIME DEFAULT '08:00',
  notification_lunch_time TIME DEFAULT '12:00',
  notification_dinner_time TIME DEFAULT '18:00',
  notification_checkin_time TIME DEFAULT '21:00',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  timezone TEXT DEFAULT 'America/Los_Angeles'
);

-- ============================================
-- TABLE: food_logs
-- Food/meal tracking with AI analysis results
-- ============================================
CREATE TABLE food_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  log_date DATE DEFAULT CURRENT_DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),

  description TEXT NOT NULL,

  -- Macros
  calories INTEGER,
  protein DECIMAL(6,1),
  carbs DECIMAL(6,1),
  fat DECIMAL(6,1),
  fiber DECIMAL(6,1),
  sugar DECIMAL(6,1),

  -- AI analysis
  ai_analyzed BOOLEAN DEFAULT FALSE,
  ai_confidence DECIMAL(3,2),
  ai_pcos_notes TEXT,
  photo_url TEXT,

  user_edited BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- ============================================
-- TABLE: water_logs
-- Daily water intake tracking
-- ============================================
CREATE TABLE water_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,

  log_date DATE DEFAULT CURRENT_DATE NOT NULL,
  glasses INTEGER DEFAULT 0 NOT NULL,

  UNIQUE(user_id, log_date)
);

-- ============================================
-- TABLE: user_supplements
-- Which supplements this user tracks
-- ============================================
CREATE TABLE user_supplements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  supplement_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT DEFAULT 'daily',
  time_of_day TEXT DEFAULT 'morning',
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,

  UNIQUE(user_id, supplement_name)
);

-- ============================================
-- TABLE: supplement_logs
-- Daily supplement intake tracking
-- ============================================
CREATE TABLE supplement_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  user_supplement_id UUID REFERENCES user_supplements(id) ON DELETE CASCADE NOT NULL,

  log_date DATE DEFAULT CURRENT_DATE NOT NULL,
  taken BOOLEAN DEFAULT FALSE NOT NULL,
  taken_at TIMESTAMPTZ,
  notes TEXT,

  UNIQUE(user_supplement_id, log_date)
);

-- ============================================
-- TABLE: exercise_logs
-- Exercise and activity tracking
-- ============================================
CREATE TABLE exercise_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  log_date DATE DEFAULT CURRENT_DATE NOT NULL,
  exercise_type TEXT NOT NULL,
  duration_minutes INTEGER,
  calories_burned INTEGER,
  intensity TEXT CHECK (intensity IN ('low', 'moderate', 'high')),

  sleep_score INTEGER CHECK (sleep_score BETWEEN 0 AND 100),
  activity_score INTEGER CHECK (activity_score BETWEEN 0 AND 100),
  steps INTEGER,

  notes TEXT
);

-- ============================================
-- TABLE: health_labs
-- Lab test results tracking
-- ============================================
CREATE TABLE health_labs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  test_date DATE NOT NULL,
  test_name TEXT NOT NULL,
  value DECIMAL(10,3) NOT NULL,
  unit TEXT NOT NULL,
  reference_range_low DECIMAL(10,3),
  reference_range_high DECIMAL(10,3),
  is_flagged BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- ============================================
-- TABLE: weight_logs
-- Weight tracking over time
-- ============================================
CREATE TABLE weight_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  log_date DATE DEFAULT CURRENT_DATE NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  notes TEXT,

  UNIQUE(user_id, log_date)
);

-- ============================================
-- TABLE: symptoms
-- Daily symptom logging (PCOS-specific)
-- ============================================
CREATE TABLE symptoms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  log_date DATE DEFAULT CURRENT_DATE NOT NULL,

  -- Severity 0-5 (0=none, 5=severe)
  bloating INTEGER DEFAULT 0 CHECK (bloating BETWEEN 0 AND 5),
  acne INTEGER DEFAULT 0 CHECK (acne BETWEEN 0 AND 5),
  hair_loss INTEGER DEFAULT 0 CHECK (hair_loss BETWEEN 0 AND 5),
  hirsutism INTEGER DEFAULT 0 CHECK (hirsutism BETWEEN 0 AND 5),
  fatigue INTEGER DEFAULT 0 CHECK (fatigue BETWEEN 0 AND 5),
  brain_fog INTEGER DEFAULT 0 CHECK (brain_fog BETWEEN 0 AND 5),
  cravings INTEGER DEFAULT 0 CHECK (cravings BETWEEN 0 AND 5),
  anxiety INTEGER DEFAULT 0 CHECK (anxiety BETWEEN 0 AND 5),

  -- Mood & Energy (1-5 scale, 5=best)
  mood INTEGER CHECK (mood BETWEEN 1 AND 5),
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),

  notes TEXT,

  UNIQUE(user_id, log_date)
);

-- ============================================
-- TABLE: period_logs
-- Period/cycle tracking
-- ============================================
CREATE TABLE period_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  log_date DATE NOT NULL,
  flow TEXT CHECK (flow IN ('spotting', 'light', 'medium', 'heavy')),

  cramps INTEGER DEFAULT 0 CHECK (cramps BETWEEN 0 AND 5),
  headache BOOLEAN DEFAULT FALSE,
  back_pain BOOLEAN DEFAULT FALSE,

  notes TEXT,

  UNIQUE(user_id, log_date)
);

-- ============================================
-- TABLE: skin_photos
-- Skin progress tracking
-- ============================================
CREATE TABLE skin_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  photo_date DATE DEFAULT CURRENT_DATE NOT NULL,
  photo_url TEXT NOT NULL,
  angle TEXT CHECK (angle IN ('front', 'left', 'right', 'other')),
  acne_severity INTEGER CHECK (acne_severity BETWEEN 0 AND 5),
  notes TEXT
);

-- ============================================
-- TABLE: daily_scores
-- Cached daily health scores (for dashboard)
-- ============================================
CREATE TABLE daily_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,

  score_date DATE DEFAULT CURRENT_DATE NOT NULL,

  food_score INTEGER DEFAULT 0,
  supplement_score INTEGER DEFAULT 0,
  exercise_score INTEGER DEFAULT 0,
  water_score INTEGER DEFAULT 0,
  sleep_score INTEGER DEFAULT 0,

  total_score INTEGER DEFAULT 0,

  calories_consumed INTEGER DEFAULT 0,
  protein_consumed DECIMAL(6,1) DEFAULT 0,
  carbs_consumed DECIMAL(6,1) DEFAULT 0,
  fat_consumed DECIMAL(6,1) DEFAULT 0,

  UNIQUE(user_id, score_date)
);


-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE skin_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_scores ENABLE ROW LEVEL SECURITY;

-- user_profiles: users access their own profile (PK = auth.uid())
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- All user_id-based tables: CRUD own rows only
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'food_logs', 'water_logs', 'user_supplements', 'supplement_logs',
    'exercise_logs', 'health_labs', 'weight_logs',
    'symptoms', 'period_logs', 'skin_photos', 'daily_scores'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "Users can view own %s" ON %I FOR SELECT USING (auth.uid() = user_id)',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "Users can insert own %s" ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "Users can update own %s" ON %I FOR UPDATE USING (auth.uid() = user_id)',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "Users can delete own %s" ON %I FOR DELETE USING (auth.uid() = user_id)',
      tbl, tbl
    );
  END LOOP;
END $$;


-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create user profile on signup (NO pet_status for MVP)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, log_date);
CREATE INDEX idx_supplement_logs_user_date ON supplement_logs(user_id, log_date);
CREATE INDEX idx_exercise_logs_user_date ON exercise_logs(user_id, log_date);
CREATE INDEX idx_symptoms_user_date ON symptoms(user_id, log_date);
CREATE INDEX idx_weight_logs_user_date ON weight_logs(user_id, log_date);
CREATE INDEX idx_period_logs_user_date ON period_logs(user_id, log_date);
CREATE INDEX idx_water_logs_user_date ON water_logs(user_id, log_date);
CREATE INDEX idx_daily_scores_user_date ON daily_scores(user_id, score_date);
CREATE INDEX idx_health_labs_user_date ON health_labs(user_id, test_date);


-- ============================================
-- STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('food-photos', 'food-photos', FALSE, 5242880);

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('skin-photos', 'skin-photos', FALSE, 5242880);

-- Storage policies: users can manage their own folder
CREATE POLICY "Users can upload own food photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE POLICY "Users can view own food photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE POLICY "Users can delete own food photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE POLICY "Users can upload own skin photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'skin-photos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE POLICY "Users can view own skin photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'skin-photos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE POLICY "Users can delete own skin photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'skin-photos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
