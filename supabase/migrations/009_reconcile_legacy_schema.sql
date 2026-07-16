-- Reconcile the audited production baseline with reproducible fresh installs.
-- Production migration history was empty when this migration was authored;
-- migrations 001-008 must be repaired as applied before running this file.

DO $$
BEGIN
  IF to_regclass('public.saved_meals') IS NULL
    OR to_regclass('public.food_logs') IS NULL
    OR to_regclass('public.supplement_logs') IS NULL
    OR to_regclass('public.user_supplements') IS NULL
  THEN
    RAISE EXCEPTION 'Legacy baseline tables are missing; stop instead of partially reconciling';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'saved_meals' AND column_name = 'serving_size'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'food_logs' AND column_name = 'meal_time'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'supplement_logs' AND column_name = 'user_supplement_id'
  ) THEN
    RAISE EXCEPTION 'Legacy baseline columns are missing; stop instead of partially reconciling';
  END IF;
END $$;

-- Canonical live/app type: serving sizes are human-entered labels, not only numbers.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'saved_meals'
      AND column_name = 'serving_size'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE public.saved_meals
      ALTER COLUMN serving_size TYPE TEXT USING serving_size::TEXT;
  END IF;
END $$;

-- Canonical live type: meal_time is a local clock time. Validate every legacy
-- text value before changing the type so an unexpected label aborts safely.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'food_logs'
      AND column_name = 'meal_time'
      AND data_type <> 'time without time zone'
  ) THEN
    BEGIN
      PERFORM NULLIF(btrim(meal_time::TEXT), '')::TIME
      FROM public.food_logs
      WHERE meal_time IS NOT NULL;
    EXCEPTION
      WHEN invalid_datetime_format OR datetime_field_overflow THEN
        RAISE EXCEPTION 'food_logs.meal_time contains a value that cannot be converted to TIME; reconcile the data before retrying';
    END;

    ALTER TABLE public.food_logs
      ALTER COLUMN meal_time TYPE TIME
      USING NULLIF(btrim(meal_time::TEXT), '')::TIME;
  END IF;
END $$;

COMMENT ON COLUMN public.food_logs.meal_time IS
  'User-reported clock time the meal was actually eaten (HH:MM:SS, local to user timezone). NULL for legacy/unspecified entries. Use log_date + meal_time for eating-window analysis; do not use created_at (insertion time can be hours later).';

-- Canonical live behavior: deleting a supplement definition preserves its
-- historical intake rows and clears their optional definition reference.
ALTER TABLE public.supplement_logs
  ALTER COLUMN user_supplement_id DROP NOT NULL;
ALTER TABLE public.supplement_logs
  DROP CONSTRAINT IF EXISTS supplement_logs_user_supplement_id_fkey;
ALTER TABLE public.supplement_logs
  ADD CONSTRAINT supplement_logs_user_supplement_id_fkey
  FOREIGN KEY (user_supplement_id)
  REFERENCES public.user_supplements(id)
  ON DELETE SET NULL;

-- food-photos is private. Authenticated users retain upload/read/delete access
-- only under their own top-level UUID folder. Service-role operations continue
-- to bypass RLS and the existing service delete policy is intentionally kept.
-- storage.objects is platform-managed, already has RLS enabled, and is owned by
-- supabase_storage_admin. The migration role may manage its policies but must
-- not attempt to alter the managed table itself.

DROP POLICY IF EXISTS "Authenticated upload food-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read food-photos" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload own food photos" ON storage.objects;
CREATE POLICY "Users can upload own food photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'food-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Users can view own food photos" ON storage.objects;
CREATE POLICY "Users can view own food photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'food-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Users can delete own food photos" ON storage.objects;
CREATE POLICY "Users can delete own food photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'food-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
