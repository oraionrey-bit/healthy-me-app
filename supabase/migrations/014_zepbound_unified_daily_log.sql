-- Save the complete manual Zepbound day (symptoms, workout, and bowel answer)
-- in one transaction. This forward migration intentionally does not rewrite any
-- existing symptom, check-in, or injection row when it is applied.
BEGIN;

-- Legacy clients can still write the symptom and check-in tables directly.
-- Coordinate those writes with save_zepbound_daily_log using the same
-- owner/date transaction advisory key. A row trigger can run while its statement
-- already owns a tuple lock, so it must never wait for an advisory lock: a
-- conflicting legacy write fails with retryable SQLSTATE 40001 and releases its
-- tuple lock. Key-moving updates try both keys in numeric order.
CREATE OR REPLACE FUNCTION lock_zepbound_daily_checkin_owner_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_key BIGINT;
  v_new_key BIGINT;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    v_old_key := hashtextextended(OLD.user_id::TEXT || ':' || OLD.log_date::TEXT, 0);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new_key := hashtextextended(NEW.user_id::TEXT || ':' || NEW.log_date::TEXT, 0);
  END IF;

  IF TG_OP = 'UPDATE' AND v_old_key <> v_new_key THEN
    IF pg_try_advisory_xact_lock(LEAST(v_old_key, v_new_key)) IS NOT TRUE THEN
      RAISE EXCEPTION 'Concurrent Zepbound daily check-in save; retry the transaction'
        USING ERRCODE = 'serialization_failure';
    END IF;
    IF pg_try_advisory_xact_lock(GREATEST(v_old_key, v_new_key)) IS NOT TRUE THEN
      RAISE EXCEPTION 'Concurrent Zepbound daily check-in save; retry the transaction'
        USING ERRCODE = 'serialization_failure';
    END IF;
  ELSE
    IF pg_try_advisory_xact_lock(COALESCE(v_new_key, v_old_key)) IS NOT TRUE THEN
      RAISE EXCEPTION 'Concurrent Zepbound daily check-in save; retry the transaction'
        USING ERRCODE = 'serialization_failure';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lock_zepbound_daily_checkin_writes
  BEFORE INSERT OR UPDATE OR DELETE ON zepbound_daily_checkins
  FOR EACH ROW EXECUTE FUNCTION lock_zepbound_daily_checkin_owner_date();

REVOKE ALL ON FUNCTION lock_zepbound_daily_checkin_owner_date() FROM PUBLIC;

-- Replace migration 011's blocking INSERT/UPDATE trigger. Direct symptom
-- UPDATE/DELETE statements may already own tuple locks, so every operation must
-- try (rather than wait for) the shared owner/date lock. The unified RPC takes
-- this lock before touching rows, making its trigger acquisitions reentrant.
CREATE OR REPLACE FUNCTION enforce_zepbound_symptom_none_exclusivity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_key BIGINT;
  v_new_key BIGINT;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    v_old_key := hashtextextended(OLD.user_id::TEXT || ':' || OLD.log_date::TEXT, 0);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new_key := hashtextextended(NEW.user_id::TEXT || ':' || NEW.log_date::TEXT, 0);
  END IF;

  IF TG_OP = 'UPDATE' AND v_old_key <> v_new_key THEN
    IF pg_try_advisory_xact_lock(LEAST(v_old_key, v_new_key)) IS NOT TRUE THEN
      RAISE EXCEPTION 'Concurrent Zepbound symptom save; retry the transaction'
        USING ERRCODE = 'serialization_failure';
    END IF;
    IF pg_try_advisory_xact_lock(GREATEST(v_old_key, v_new_key)) IS NOT TRUE THEN
      RAISE EXCEPTION 'Concurrent Zepbound symptom save; retry the transaction'
        USING ERRCODE = 'serialization_failure';
    END IF;
  ELSE
    IF pg_try_advisory_xact_lock(COALESCE(v_new_key, v_old_key)) IS NOT TRUE THEN
      RAISE EXCEPTION 'Concurrent Zepbound symptom save; retry the transaction'
        USING ERRCODE = 'serialization_failure';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM zepbound_symptom_logs existing
    WHERE existing.user_id = NEW.user_id
      AND existing.log_date = NEW.log_date
      AND existing.id <> NEW.id
      AND (
        (NEW.symptom_type = 'None' AND existing.symptom_type <> 'None')
        OR (NEW.symptom_type <> 'None' AND existing.symptom_type = 'None')
      )
  ) THEN
    RAISE EXCEPTION 'None cannot coexist with symptoms for the same date'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zepbound_symptom_none_exclusivity
  ON zepbound_symptom_logs;
CREATE TRIGGER zepbound_symptom_none_exclusivity
  BEFORE INSERT OR UPDATE OR DELETE ON zepbound_symptom_logs
  FOR EACH ROW
  EXECUTE FUNCTION enforce_zepbound_symptom_none_exclusivity();

REVOKE ALL ON FUNCTION enforce_zepbound_symptom_none_exclusivity() FROM PUBLIC;

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

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_user_id::TEXT || ':' || p_log_date::TEXT, 0)
  );

  SELECT id INTO v_injection_id
  FROM zepbound_injections
  WHERE user_id = v_user_id
    AND injection_date <= p_log_date
  ORDER BY injection_date DESC, injection_time DESC, created_at DESC, id DESC
  LIMIT 1;

  -- Apply a diff, deleting absent rows first so transitions to/from None satisfy
  -- the existing exclusivity trigger. Matching rows keep id, created_at,
  -- symptom_time, and injection_id; only their editable detail is updated.
  DELETE FROM zepbound_symptom_logs existing
  WHERE existing.user_id = v_user_id
    AND existing.log_date = p_log_date
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_symptoms) item
      WHERE btrim(item->>'symptom_type') = existing.symptom_type
    );

  UPDATE zepbound_symptom_logs existing
  SET
    severity = (item.value->>'severity')::SMALLINT,
    notes = NULLIF(btrim(item.value->>'notes'), '')
  FROM jsonb_array_elements(p_symptoms) item(value)
  WHERE existing.user_id = v_user_id
    AND existing.log_date = p_log_date
    AND existing.symptom_type = btrim(item.value->>'symptom_type');

  -- Association and noon are assigned only when a submitted type is new.
  INSERT INTO zepbound_symptom_logs (
    user_id, injection_id, log_date, symptom_time, symptom_type, severity, notes
  )
  SELECT
    v_user_id,
    v_injection_id,
    p_log_date,
    TIME '12:00',
    btrim(item.value->>'symptom_type'),
    (item.value->>'severity')::SMALLINT,
    NULLIF(btrim(item.value->>'notes'), '')
  FROM jsonb_array_elements(p_symptoms) item(value)
  WHERE NOT EXISTS (
    SELECT 1
    FROM zepbound_symptom_logs existing
    WHERE existing.user_id = v_user_id
      AND existing.log_date = p_log_date
      AND existing.symptom_type = btrim(item.value->>'symptom_type')
  );

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
