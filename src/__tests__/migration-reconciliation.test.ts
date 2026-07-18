import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Supabase migration reconciliation guardrails', () => {
  const migrationDir = path.join(root, 'supabase/migrations');
  const reconciliation = read('supabase/migrations/009_reconcile_legacy_schema.sql');
  const zepboundMigration = read('supabase/migrations/010_zepbound_tracking.sql');
  const zepboundAtomicSymptoms = read('supabase/migrations/011_zepbound_atomic_daily_symptoms.sql');
  const zepboundSymptomReplacement = read('supabase/migrations/012_zepbound_replace_daily_symptoms.sql');
  const zepboundDailyCheckin = read('supabase/migrations/013_zepbound_daily_checkins.sql');
  const zepboundUnifiedDailyLog = read('supabase/migrations/014_zepbound_unified_daily_log.sql');

  it('orders reconciliation before Zepbound schema creation', () => {
    const files = fs.readdirSync(migrationDir);
    expect(files).toContain('009_reconcile_legacy_schema.sql');
    expect(files).toContain('010_zepbound_tracking.sql');
    expect(files).not.toContain('009_zepbound_tracking.sql');
  });

  it('codifies the reviewed canonical legacy schema', () => {
    expect(reconciliation).toMatch(/ALTER COLUMN serving_size TYPE TEXT/);
    expect(reconciliation).toMatch(/ALTER COLUMN meal_time TYPE TIME/);
    expect(reconciliation).toMatch(/ALTER COLUMN user_supplement_id DROP NOT NULL/);
    expect(reconciliation).toMatch(/ON DELETE SET NULL/);
    expect(reconciliation).toContain('Legacy baseline columns are missing');
  });

  it('removes only audited broad photo policies and enforces owner folders', () => {
    expect(reconciliation).toContain('DROP POLICY IF EXISTS "Authenticated upload food-photos"');
    expect(reconciliation).toContain('DROP POLICY IF EXISTS "Public read food-photos"');
    expect(reconciliation).not.toContain('DROP POLICY IF EXISTS "Service delete food-photos"');
    expect(reconciliation).not.toContain('ALTER TABLE storage.objects');
    expect(reconciliation.match(/TO authenticated/g)).toHaveLength(3);
    expect(reconciliation.match(/storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::TEXT/g)).toHaveLength(3);
  });

  it('keeps private photo upload and analysis compatible', () => {
    const foodHook = read('src/hooks/use-food-log.ts');
    const analyzer = read('supabase/functions/analyze-food/index.ts');
    expect(foodHook).toContain('.createSignedUrl(filePath, FOOD_PHOTO_URL_TTL_SECONDS)');
    expect(foodHook).not.toContain('.getPublicUrl(filePath)');
    expect(analyzer).toContain('.split("?")[0]');
    expect(analyzer).toContain('.from("food-photos").download(filePath)');
    expect(analyzer).not.toContain('/public/food-photos/');
  });

  it('documents the verified ledger state and migration 012 deployment order', () => {
    const runbook = read('docs/supabase-migration-reconciliation.md');
    expect(runbook).toContain('local and remote versions 001–011 to be aligned');
    expect(runbook).toContain('only `012_zepbound_replace_daily_symptoms.sql` to be pending');
    expect(runbook).toContain('supabase db push --linked --dry-run');
    expect(runbook).toContain('Apply migration 012 once with `supabase db push --linked`');
    expect(runbook).toContain('Do not use `migration repair` for migration 012');
    expect(runbook).toContain('Do not run this casually');
    expect(runbook).toContain('SHARE ROW EXCLUSIVE');
    expect(runbook).toContain('allows ordinary reads');
    expect(runbook).toContain('brief write pause');
  });

  it('keeps Zepbound values constrained and user-owned', () => {
    expect(zepboundMigration).toMatch(/user_id UUID REFERENCES user_profiles\(id\) ON DELETE CASCADE NOT NULL/g);
    expect(zepboundMigration).toContain('injection_date DATE NOT NULL');
    expect(zepboundMigration).toContain('injection_time TIME NOT NULL');
    expect(zepboundMigration).toContain('dose_mg NUMERIC(5,2) NOT NULL CHECK (dose_mg > 0)');
    expect(zepboundMigration).toContain('injection_id UUID REFERENCES zepbound_injections(id) ON DELETE SET NULL');
    expect(zepboundMigration).toContain('log_date DATE NOT NULL');
    expect(zepboundMigration).toContain('symptom_time TIME NOT NULL');
    expect(zepboundMigration).toContain("CHECK (injection_site IN ('abdomen', 'thigh', 'upper_arm', 'other'))");
    expect(zepboundMigration).toContain("CHECK (btrim(symptom_type) <> '')");
    expect(zepboundMigration).toContain('CHECK (severity BETWEEN 1 AND 5)');
    expect(zepboundMigration).toContain('ALTER TABLE zepbound_injections ENABLE ROW LEVEL SECURITY');
    expect(zepboundMigration).toContain('ALTER TABLE zepbound_symptom_logs ENABLE ROW LEVEL SECURITY');
    expect(zepboundMigration.match(/auth\.uid\(\) = user_id/g)?.length).toBeGreaterThanOrEqual(8);
    expect(zepboundMigration).toMatch(/SELECT 1 FROM zepbound_injections\s+WHERE id = injection_id AND user_id = auth\.uid\(\)/);
    expect(zepboundMigration).toContain('CREATE INDEX IF NOT EXISTS idx_zepbound_injections_user_date');
    expect(zepboundMigration).toContain('CREATE INDEX IF NOT EXISTS idx_zepbound_symptom_logs_user_date');
  });

  it('atomically reconciles None and real symptoms in both directions for the authenticated owner', () => {
    expect(zepboundAtomicSymptoms).toContain('save_zepbound_symptoms_for_date');
    expect(zepboundAtomicSymptoms).toContain('SECURITY INVOKER');
    expect(zepboundAtomicSymptoms).toContain('auth.uid()');
    expect(zepboundAtomicSymptoms).not.toMatch(/p_user_id/i);
    expect(zepboundAtomicSymptoms).toMatch(/pg_advisory_xact_lock/);
    expect(zepboundAtomicSymptoms).toMatch(/DELETE FROM zepbound_symptom_logs[\s\S]+symptom_type <> 'None'/);
    expect(zepboundAtomicSymptoms).toMatch(/DELETE FROM zepbound_symptom_logs[\s\S]+symptom_type = 'None'/);
    expect(zepboundAtomicSymptoms).toMatch(/ORDER BY injection_date DESC, injection_time DESC/);
    expect(zepboundAtomicSymptoms).toContain('REVOKE ALL ON FUNCTION save_zepbound_symptoms_for_date(DATE, JSONB) FROM PUBLIC');
    expect(zepboundAtomicSymptoms).toContain('GRANT EXECUTE ON FUNCTION save_zepbound_symptoms_for_date(DATE, JSONB) TO authenticated');
  });

  it('guards direct writes and reconciles legacy contradictory dates', () => {
    expect(zepboundAtomicSymptoms).toContain('enforce_zepbound_symptom_none_exclusivity');
    expect(zepboundAtomicSymptoms).toContain('BEFORE INSERT OR UPDATE');
    expect(zepboundAtomicSymptoms).toMatch(/DELETE FROM zepbound_symptom_logs none_log[\s\S]+real_log\.symptom_type <> 'None'/);
  });

  it('captures the migration 011 append regression and replaces the complete owner/date set in 012', () => {
    // Migration 011 only removed all rows for None; real-symptom edits removed
    // the None sentinel and then appended, which persisted duplicate types.
    expect(zepboundAtomicSymptoms).toMatch(/ELSE[\s\S]+DELETE FROM zepbound_symptom_logs[\s\S]+symptom_type = 'None'[\s\S]+END IF/);
    expect(zepboundAtomicSymptoms).not.toMatch(/DELETE FROM zepbound_symptom_logs\s+WHERE user_id = v_user_id\s+AND log_date = p_log_date;\s+\n\s+INSERT/);

    expect(zepboundSymptomReplacement).toContain('CREATE OR REPLACE FUNCTION save_zepbound_symptoms_for_date');
    expect(zepboundSymptomReplacement).toMatch(/pg_advisory_xact_lock/);
    expect(zepboundSymptomReplacement).toMatch(/DELETE FROM zepbound_symptom_logs\s+WHERE user_id = v_user_id\s+AND log_date = p_log_date;/);
    expect(zepboundSymptomReplacement).not.toMatch(/DELETE FROM zepbound_symptom_logs[\s\S]+symptom_type\s*(?:=|<>)\s*'None'/);
    expect(zepboundSymptomReplacement.indexOf('DELETE FROM zepbound_symptom_logs')).toBeLessThan(
      zepboundSymptomReplacement.lastIndexOf('INSERT INTO zepbound_symptom_logs'),
    );
  });

  it('deduplicates only exact owner/date/type collisions, retaining the newest row, then prevents recurrence', () => {
    expect(zepboundSymptomReplacement).toMatch(/ROW_NUMBER\(\) OVER \(\s*PARTITION BY user_id, log_date, symptom_type\s*ORDER BY created_at DESC, id DESC/);
    expect(zepboundSymptomReplacement).toMatch(/DELETE FROM zepbound_symptom_logs[\s\S]+duplicate_rank > 1/);
    expect(zepboundSymptomReplacement).toContain('CREATE UNIQUE INDEX zepbound_symptom_logs_user_date_type_key');
    expect(zepboundSymptomReplacement).toContain('ON zepbound_symptom_logs (user_id, log_date, symptom_type)');
    expect(zepboundSymptomReplacement).not.toMatch(/PARTITION BY user_id, log_date\s*(?:\)|ORDER)/);
  });

  it('blocks concurrent symptom writes before cleanup until the unique index is created', () => {
    const beginPosition = zepboundSymptomReplacement.indexOf('BEGIN;');
    const lock = 'LOCK TABLE zepbound_symptom_logs IN SHARE ROW EXCLUSIVE MODE;';
    const lockPosition = zepboundSymptomReplacement.indexOf(lock);
    const cleanupPosition = zepboundSymptomReplacement.indexOf('WITH ranked_symptoms AS');
    const indexPosition = zepboundSymptomReplacement.indexOf(
      'CREATE UNIQUE INDEX zepbound_symptom_logs_user_date_type_key',
    );

    expect(beginPosition).toBeGreaterThanOrEqual(0);
    expect(beginPosition).toBeLessThan(lockPosition);
    expect(lockPosition).toBeLessThan(cleanupPosition);
    expect(cleanupPosition).toBeLessThan(indexPosition);
    expect(zepboundSymptomReplacement.slice(lockPosition, indexPosition)).not.toMatch(
      /\b(?:COMMIT|ROLLBACK)\b/i,
    );
    expect(zepboundSymptomReplacement.lastIndexOf('COMMIT;')).toBeGreaterThan(indexPosition);
  });

  it('preserves RPC authentication, owner isolation, association, None validation, and execute grants', () => {
    expect(zepboundSymptomReplacement).toContain('SECURITY INVOKER');
    expect(zepboundSymptomReplacement).toContain('v_user_id UUID := auth.uid()');
    expect(zepboundSymptomReplacement).not.toMatch(/p_user_id/i);
    expect(zepboundSymptomReplacement).toMatch(/WHERE user_id = v_user_id\s+AND injection_date <= p_log_date/);
    expect(zepboundSymptomReplacement).toMatch(/ORDER BY injection_date DESC, injection_time DESC, created_at DESC, id DESC/);
    expect(zepboundSymptomReplacement).toContain('None cannot be saved with other symptoms');
    expect(zepboundSymptomReplacement).toContain("TIME '12:00'");
    expect(zepboundSymptomReplacement).not.toMatch(/p_symptom_time|item->>'symptom_time'/);
    expect(zepboundSymptomReplacement).toContain('REVOKE ALL ON FUNCTION save_zepbound_symptoms_for_date(DATE, JSONB) FROM PUBLIC');
    expect(zepboundSymptomReplacement).toContain('REVOKE ALL ON FUNCTION save_zepbound_symptoms_for_date(DATE, JSONB) FROM anon');
    expect(zepboundSymptomReplacement).toContain('GRANT EXECUTE ON FUNCTION save_zepbound_symptoms_for_date(DATE, JSONB) TO authenticated');
  });

  it('creates one owner/date Zepbound manual check-in with nullable answers', () => {
    expect(zepboundDailyCheckin).toContain('CREATE TABLE zepbound_daily_checkins');
    expect(zepboundDailyCheckin).toMatch(/user_id UUID REFERENCES user_profiles\(id\) ON DELETE CASCADE NOT NULL/);
    expect(zepboundDailyCheckin).toContain('log_date DATE NOT NULL');
    expect(zepboundDailyCheckin).toContain('worked_out BOOLEAN');
    expect(zepboundDailyCheckin).toContain('workout_duration_minutes SMALLINT');
    expect(zepboundDailyCheckin).toContain('pooped BOOLEAN');
    expect(zepboundDailyCheckin).toContain('UNIQUE (user_id, log_date)');
  });

  it('enforces answered and duration consistency constraints', () => {
    expect(zepboundDailyCheckin).toMatch(/worked_out IS NOT NULL OR pooped IS NOT NULL/);
    // PostgreSQL CHECK accepts UNKNOWN, so BETWEEN alone permits a NULL
    // duration. Keep this explicit guard adjacent to the true branch.
    expect(zepboundDailyCheckin).toMatch(
      /worked_out IS TRUE\s+AND workout_duration_minutes IS NOT NULL\s+AND workout_duration_minutes BETWEEN 1 AND 1440/,
    );
    expect(zepboundDailyCheckin).toMatch(/worked_out IS FALSE[\s\S]+workout_duration_minutes IS NULL/);
    expect(zepboundDailyCheckin).toMatch(/worked_out IS NULL[\s\S]+workout_duration_minutes IS NULL/);
  });

  it('enables owner-only RLS for select, insert, update, and delete', () => {
    expect(zepboundDailyCheckin).toContain('ALTER TABLE zepbound_daily_checkins ENABLE ROW LEVEL SECURITY');
    expect(zepboundDailyCheckin.match(/CREATE POLICY/g)).toHaveLength(4);
    expect(zepboundDailyCheckin.match(/TO authenticated/g)).toHaveLength(4);
    expect(zepboundDailyCheckin.match(/auth\.uid\(\) = user_id/g)).toHaveLength(5);
    expect(zepboundDailyCheckin).toMatch(/FOR INSERT[\s\S]+WITH CHECK \(auth\.uid\(\) = user_id\)/);
    expect(zepboundDailyCheckin).toMatch(/FOR UPDATE[\s\S]+USING \(auth\.uid\(\) = user_id\)[\s\S]+WITH CHECK \(auth\.uid\(\) = user_id\)/);
  });

  it('adds migration 014 in an explicit transaction without top-level data mutation', () => {
    expect(zepboundUnifiedDailyLog.trimStart().indexOf('BEGIN;')).toBeGreaterThanOrEqual(0);
    expect(zepboundUnifiedDailyLog.trimEnd().endsWith('COMMIT;')).toBe(true);
    const withoutFunctionBody = zepboundUnifiedDailyLog.replace(/AS \$\$[\s\S]*?\$\$;/, '');
    expect(withoutFunctionBody).not.toMatch(/\b(?:DELETE|UPDATE|INSERT)\s+(?:FROM|INTO)?\s*zepbound_/i);
    expect(zepboundUnifiedDailyLog).not.toMatch(/ALTER TABLE|DROP TABLE|TRUNCATE/i);
    expect(zepboundUnifiedDailyLog).not.toContain('CREATE OR REPLACE FUNCTION save_zepbound_symptoms_for_date');
  });

  it('validates the complete unified payload before locking or mutation', () => {
    const lock = zepboundUnifiedDailyLog.indexOf('pg_advisory_xact_lock');
    const symptomDelete = zepboundUnifiedDailyLog.indexOf('DELETE FROM zepbound_symptom_logs');
    expect(zepboundUnifiedDailyLog).toContain("jsonb_typeof(p_symptoms) <> 'array'");
    expect(zepboundUnifiedDailyLog).toMatch(/jsonb_array_length\(p_symptoms\) = 0[\s\S]+p_worked_out IS NULL[\s\S]+p_pooped IS NULL/);
    expect(zepboundUnifiedDailyLog).toContain('p_workout_duration_minutes NOT BETWEEN 1 AND 1440');
    expect(zepboundUnifiedDailyLog).toContain('None cannot be saved with other symptoms');
    expect(zepboundUnifiedDailyLog).toContain('A symptom type can only be saved once per date');
    expect(lock).toBeGreaterThan(zepboundUnifiedDailyLog.indexOf('A symptom type can only be saved once per date'));
    expect(symptomDelete).toBeGreaterThan(lock);
  });

  it('atomically replaces symptoms and upserts or deletes the manual check-in', () => {
    expect(zepboundUnifiedDailyLog).toContain('CREATE OR REPLACE FUNCTION save_zepbound_daily_log');
    expect(zepboundUnifiedDailyLog).toMatch(/DELETE FROM zepbound_symptom_logs[\s\S]+INSERT INTO zepbound_symptom_logs/);
    expect(zepboundUnifiedDailyLog).toMatch(/p_worked_out IS NULL AND p_pooped IS NULL[\s\S]+DELETE FROM zepbound_daily_checkins/);
    expect(zepboundUnifiedDailyLog).toMatch(/INSERT INTO zepbound_daily_checkins[\s\S]+ON CONFLICT \(user_id, log_date\) DO UPDATE/);
    expect(zepboundUnifiedDailyLog).toMatch(/WHERE user_id = v_user_id\s+AND injection_date <= p_log_date/);
    expect(zepboundUnifiedDailyLog).toContain("TIME '12:00'");
  });

  it('uses invoker RLS, owner identity, shared lock, and least-privilege grants', () => {
    expect(zepboundUnifiedDailyLog).toContain('SECURITY INVOKER');
    expect(zepboundUnifiedDailyLog).toContain('v_user_id UUID := auth.uid()');
    expect(zepboundUnifiedDailyLog).not.toMatch(/p_user_id/i);
    expect(zepboundUnifiedDailyLog).toMatch(/hashtextextended\(v_user_id::TEXT \|\| ':' \|\| p_log_date::TEXT, 0\)/);
    expect(zepboundUnifiedDailyLog).toContain('REVOKE ALL ON FUNCTION save_zepbound_daily_log(DATE, JSONB, BOOLEAN, INTEGER, BOOLEAN) FROM PUBLIC');
    expect(zepboundUnifiedDailyLog).toContain('REVOKE ALL ON FUNCTION save_zepbound_daily_log(DATE, JSONB, BOOLEAN, INTEGER, BOOLEAN) FROM anon');
    expect(zepboundUnifiedDailyLog).toContain('GRANT EXECUTE ON FUNCTION save_zepbound_daily_log(DATE, JSONB, BOOLEAN, INTEGER, BOOLEAN) TO authenticated');
  });
});
