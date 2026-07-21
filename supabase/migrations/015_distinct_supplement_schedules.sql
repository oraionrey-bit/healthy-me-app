-- Treat each scheduled supplement dose as a distinct tracker entry.
--
-- The old client merged morning + evening into one row, so both visible
-- checkboxes shared an ID and therefore one supplement_logs row per date.
-- This migration retains the original row as morning, creates an evening row,
-- and copies every historical log so the previously visible completion state
-- remains represented on both schedules.

BEGIN;

ALTER TABLE public.user_supplements
  DROP CONSTRAINT IF EXISTS user_supplements_user_id_supplement_name_key;
ALTER TABLE public.user_supplements
  DROP CONSTRAINT IF EXISTS user_supplements_user_id_name_time_key;

CREATE TEMP TABLE supplement_schedule_split (
  source_id uuid PRIMARY KEY,
  evening_id uuid NOT NULL UNIQUE,
  evening_sort_order integer NOT NULL
) ON COMMIT DROP;

-- New rows are placed deterministically after the user's current maximum.
-- This avoids the old `sort_order + 1` collision without changing any existing
-- row's order. id is the final tie-breaker so equal legacy orders are harmless.
INSERT INTO supplement_schedule_split (source_id, evening_id, evening_sort_order)
SELECT
  dual.id,
  gen_random_uuid(),
  per_user.max_sort_order
    + row_number() OVER (PARTITION BY dual.user_id ORDER BY dual.sort_order, dual.created_at, dual.id)::integer
FROM public.user_supplements AS dual
JOIN (
  SELECT user_id, coalesce(max(sort_order), -1) AS max_sort_order
  FROM public.user_supplements
  GROUP BY user_id
) AS per_user USING (user_id)
WHERE regexp_replace(lower(dual.time_of_day), '\s+', '', 'g') IN (
  'morning,evening',
  'evening,morning'
);

INSERT INTO public.user_supplements (
  id,
  user_id,
  created_at,
  supplement_name,
  dosage,
  frequency,
  time_of_day,
  notes,
  is_active,
  sort_order,
  phase_schedule
)
SELECT
  split.evening_id,
  source.user_id,
  source.created_at,
  source.supplement_name,
  source.dosage,
  source.frequency,
  'evening',
  source.notes,
  source.is_active,
  split.evening_sort_order,
  source.phase_schedule
FROM supplement_schedule_split AS split
JOIN public.user_supplements AS source ON source.id = split.source_id;

-- Keep every original supplement row, ID, timestamp, and log in place.
UPDATE public.user_supplements AS source
SET time_of_day = 'morning'
FROM supplement_schedule_split AS split
WHERE source.id = split.source_id;

-- Clone (do not move or delete) history to the new schedule. The target IDs are
-- new, so the normal (user_supplement_id, log_date) uniqueness is retained.
-- ON CONFLICT makes the intent safe if equivalent target history ever exists.
INSERT INTO public.supplement_logs (
  id,
  user_id,
  user_supplement_id,
  log_date,
  taken,
  taken_at,
  notes
)
SELECT
  gen_random_uuid(),
  log.user_id,
  split.evening_id,
  log.log_date,
  log.taken,
  log.taken_at,
  log.notes
FROM supplement_schedule_split AS split
JOIN public.supplement_logs AS log
  ON log.user_supplement_id = split.source_id
ON CONFLICT (user_supplement_id, log_date) DO NOTHING;

-- Canonicalize schedule spelling without restricting the open TEXT domain.
-- Existing/custom values remain supported; only surrounding whitespace and
-- casing are normalized. Supplement display casing remains unchanged.
UPDATE public.user_supplements
SET
  supplement_name = btrim(supplement_name),
  time_of_day = lower(btrim(time_of_day));

-- Refuse to silently discard/merge pre-existing logical duplicates. The whole
-- migration is transactional, so this leaves source data untouched and gives
-- operators an actionable error if legacy case/whitespace variants exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.user_supplements
    GROUP BY user_id, lower(btrim(supplement_name)), lower(btrim(time_of_day))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce canonical supplement schedule identity: case/whitespace duplicate rows exist';
  END IF;
END $$;

-- Expression uniqueness prevents future logical duplicates such as
-- `Creatine`/` creatine ` or `Morning`/` morning `. It deliberately does not
-- add a narrow schedule CHECK: time_of_day has historically been open TEXT.
CREATE UNIQUE INDEX user_supplements_user_name_time_canonical_key
  ON public.user_supplements (
    user_id,
    lower(btrim(supplement_name)),
    lower(btrim(time_of_day))
  );

COMMIT;
