-- Atomically save a selected date's Zepbound symptoms and enforce that an
-- explicit no-symptoms record cannot contradict real symptoms for that date.

-- Reconcile legacy contradictions conservatively: retain the real symptom
-- history and remove only the conflicting sentinel row.
DELETE FROM zepbound_symptom_logs none_log
USING zepbound_symptom_logs real_log
WHERE none_log.user_id = real_log.user_id
  AND none_log.log_date = real_log.log_date
  AND none_log.symptom_type = 'None'
  AND real_log.symptom_type <> 'None';

CREATE OR REPLACE FUNCTION enforce_zepbound_symptom_none_exclusivity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Serialize all writes for one owner's date, including calls outside the RPC.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.user_id::TEXT || ':' || NEW.log_date::TEXT, 0)
  );

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
  BEFORE INSERT OR UPDATE OF user_id, log_date, symptom_type
  ON zepbound_symptom_logs
  FOR EACH ROW
  EXECUTE FUNCTION enforce_zepbound_symptom_none_exclusivity();

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

  -- Validate every row before reconciling or inserting anything. An exception
  -- rolls back the entire function call, including deletes and prior inserts.
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

  IF v_none_count = 1 THEN
    DELETE FROM zepbound_symptom_logs
    WHERE user_id = v_user_id
      AND log_date = p_log_date;
  ELSE
    DELETE FROM zepbound_symptom_logs
    WHERE user_id = v_user_id
      AND log_date = p_log_date
      AND symptom_type = 'None';
  END IF;

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
GRANT EXECUTE ON FUNCTION save_zepbound_symptoms_for_date(DATE, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION enforce_zepbound_symptom_none_exclusivity() FROM PUBLIC;
