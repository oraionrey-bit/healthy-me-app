-- Save the complete manual Zepbound day (symptoms, workout, and bowel answer)
-- in one transaction. This forward migration intentionally does not rewrite any
-- existing symptom, check-in, or injection row when it is applied.
BEGIN;

CREATE OR REPLACE FUNCTION save_zepbound_daily_log(
  p_log_date DATE,
  p_symptoms JSONB,
  p_worked_out BOOLEAN,
  p_workout_duration_minutes INTEGER,
  p_pooped BOOLEAN
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
  -- Validate the complete state before locking or mutating either table.
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_log_date IS NULL THEN
    RAISE EXCEPTION 'A log date is required' USING ERRCODE = 'not_null_violation';
  END IF;
  IF p_symptoms IS NULL OR jsonb_typeof(p_symptoms) <> 'array' THEN
    RAISE EXCEPTION 'Symptoms must be an array' USING ERRCODE = 'check_violation';
  END IF;
  IF jsonb_array_length(p_symptoms) = 0
    AND p_worked_out IS NULL
    AND p_pooped IS NULL
  THEN
    RAISE EXCEPTION 'Answer at least one daily check-in question'
      USING ERRCODE = 'check_violation';
  END IF;
  IF p_worked_out IS TRUE AND (
    p_workout_duration_minutes IS NULL
    OR p_workout_duration_minutes NOT BETWEEN 1 AND 1440
  ) THEN
    RAISE EXCEPTION 'Workout duration must be an integer from 1 to 1440'
      USING ERRCODE = 'check_violation';
  END IF;
  IF p_worked_out IS DISTINCT FROM TRUE
    AND p_workout_duration_minutes IS NOT NULL
  THEN
    RAISE EXCEPTION 'Workout duration is only allowed when worked out is true'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO v_none_count
  FROM jsonb_array_elements(p_symptoms) item
  WHERE btrim(item->>'symptom_type') = 'None';

  IF v_none_count > 0 AND jsonb_array_length(p_symptoms) <> 1 THEN
    RAISE EXCEPTION 'None cannot be saved with other symptoms'
      USING ERRCODE = 'check_violation';
  END IF;

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

  -- This is the same owner/date key used by the symptom direct-write trigger
  -- and legacy symptom RPC, so old and new clients cannot interleave.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_user_id::TEXT || ':' || p_log_date::TEXT, 0)
  );

  SELECT id INTO v_injection_id
  FROM zepbound_injections
  WHERE user_id = v_user_id
    AND injection_date <= p_log_date
  ORDER BY injection_date DESC, injection_time DESC, created_at DESC, id DESC
  LIMIT 1;

  -- Full-state replacement is safe here because every field above has already
  -- been validated. Any following failure rolls all statements back together.
  DELETE FROM zepbound_symptom_logs
  WHERE user_id = v_user_id AND log_date = p_log_date;

  INSERT INTO zepbound_symptom_logs (
    user_id, injection_id, log_date, symptom_time, symptom_type, severity, notes
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

  IF p_worked_out IS NULL AND p_pooped IS NULL THEN
    DELETE FROM zepbound_daily_checkins
    WHERE user_id = v_user_id AND log_date = p_log_date;
  ELSE
    INSERT INTO zepbound_daily_checkins (
      user_id, log_date, worked_out, workout_duration_minutes, pooped
    ) VALUES (
      v_user_id, p_log_date, p_worked_out, p_workout_duration_minutes, p_pooped
    )
    ON CONFLICT (user_id, log_date) DO UPDATE SET
      worked_out = EXCLUDED.worked_out,
      workout_duration_minutes = EXCLUDED.workout_duration_minutes,
      pooped = EXCLUDED.pooped;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION save_zepbound_daily_log(DATE, JSONB, BOOLEAN, INTEGER, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION save_zepbound_daily_log(DATE, JSONB, BOOLEAN, INTEGER, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION save_zepbound_daily_log(DATE, JSONB, BOOLEAN, INTEGER, BOOLEAN) TO authenticated;

COMMIT;
