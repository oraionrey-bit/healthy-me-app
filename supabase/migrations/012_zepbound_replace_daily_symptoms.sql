-- Repair migration 011's append behavior: retain the newest exact duplicate,
-- prevent recurrence, and make a daily save replace the complete submitted set.
-- This migration is forward-only because migration 011 may already be applied.

-- Block INSERT/UPDATE/DELETE before cleanup so no duplicate can commit between
-- deduplication and unique-index enforcement. SHARE ROW EXCLUSIVE is held until
-- the migration transaction commits while remaining compatible with reads.
LOCK TABLE zepbound_symptom_logs IN SHARE ROW EXCLUSIVE MODE;

-- Keep exactly one row per owner/date/type. Distinct symptom types are separate
-- partitions and are therefore never removed by this one-time cleanup. The UUID
-- tie-breaker makes retention deterministic if timestamps are equal.
WITH ranked_symptoms AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, log_date, symptom_type
      ORDER BY created_at DESC, id DESC
    ) AS duplicate_rank
  FROM zepbound_symptom_logs
)
DELETE FROM zepbound_symptom_logs symptom
USING ranked_symptoms ranked
WHERE symptom.id = ranked.id
  AND ranked.duplicate_rank > 1;

-- Defense in depth for RPC and direct writes. The existing None-exclusivity
-- trigger continues to prevent a None row from coexisting with a real symptom.
CREATE UNIQUE INDEX zepbound_symptom_logs_user_date_type_key
  ON zepbound_symptom_logs (user_id, log_date, symptom_type);

CREATE OR REPLACE FUNCTION save_zepbound_symptoms_for_date(
  p_log_date DATE,
  p_symptoms JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_injection_id UUID;
  v_item JSONB;
  v_none_count INTEGER;
  v_severity SMALLINT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_log_date IS NULL THEN
    RAISE EXCEPTION 'A symptom date is required' USING ERRCODE = 'not_null_violation';
  END IF;
  IF p_symptoms IS NULL
    OR jsonb_typeof(p_symptoms) <> 'array'
    OR jsonb_array_length(p_symptoms) = 0
  THEN
    RAISE EXCEPTION 'At least one symptom is required' USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*)
  INTO v_none_count
  FROM jsonb_array_elements(p_symptoms) item
  WHERE btrim(item->>'symptom_type') = 'None';

  IF v_none_count > 0 AND jsonb_array_length(p_symptoms) <> 1 THEN
    RAISE EXCEPTION 'None cannot be saved with other symptoms'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Validate the complete payload before taking the date lock. Any later error
  -- still rolls the delete and all inserts back as one function transaction.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_symptoms)
  LOOP
    IF jsonb_typeof(v_item) <> 'object'
      OR NULLIF(btrim(v_item->>'symptom_type'), '') IS NULL
      OR jsonb_typeof(v_item->'severity') <> 'number'
      OR (v_item->>'severity') !~ '^[1-5]$'
      OR (v_item ? 'notes' AND jsonb_typeof(v_item->'notes') NOT IN ('string', 'null'))
    THEN
      RAISE EXCEPTION 'Malformed symptom payload' USING ERRCODE = 'check_violation';
    END IF;

    BEGIN
      v_severity := (v_item->>'severity')::SMALLINT;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'Symptom severity must be an integer from 1 to 5'
        USING ERRCODE = 'check_violation';
    END;
    IF v_severity NOT BETWEEN 1 AND 5
      OR (btrim(v_item->>'symptom_type') = 'None' AND v_severity <> 1)
    THEN
      RAISE EXCEPTION 'Symptom severity must be an integer from 1 to 5'
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  IF (
    SELECT count(*) <> count(DISTINCT btrim(item->>'symptom_type'))
    FROM jsonb_array_elements(p_symptoms) item
  ) THEN
    RAISE EXCEPTION 'A symptom type can only be saved once per date'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Match the trigger's lock key so RPC saves and direct writes for one
  -- authenticated owner's date cannot interleave.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_user_id::TEXT || ':' || p_log_date::TEXT, 0)
  );

  SELECT id
  INTO v_injection_id
  FROM zepbound_injections
  WHERE user_id = v_user_id
    AND injection_date <= p_log_date
  ORDER BY injection_date DESC, injection_time DESC, created_at DESC, id DESC
  LIMIT 1;

  -- The payload is the complete set for this date, not an append operation.
  -- SECURITY INVOKER plus owner RLS scopes both this delete and the inserts.
  DELETE FROM zepbound_symptom_logs
  WHERE user_id = v_user_id
    AND log_date = p_log_date;

  INSERT INTO zepbound_symptom_logs (
    user_id,
    injection_id,
    log_date,
    symptom_time,
    symptom_type,
    severity,
    notes
  )
  SELECT
    v_user_id,
    v_injection_id,
    p_log_date,
    TIME '12:00',
    btrim(item->>'symptom_type'),
    (item->>'severity')::SMALLINT,
    NULLIF(btrim(item->>'notes'), '')
  FROM jsonb_array_elements(p_symptoms) item;
END;
$$;

REVOKE ALL ON FUNCTION save_zepbound_symptoms_for_date(DATE, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION save_zepbound_symptoms_for_date(DATE, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION save_zepbound_symptoms_for_date(DATE, JSONB) TO authenticated;
