import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Supabase migration reconciliation guardrails', () => {
  const migrationDir = path.join(root, 'supabase/migrations');
  const reconciliation = read('supabase/migrations/009_reconcile_legacy_schema.sql');
  const zepboundMigration = read('supabase/migrations/010_zepbound_tracking.sql');
  const zepboundAtomicSymptoms = read('supabase/migrations/011_zepbound_atomic_daily_symptoms.sql');

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

  it('documents the verified ledger state and migration 011 deployment order', () => {
    const runbook = read('docs/supabase-migration-reconciliation.md');
    expect(runbook).toContain('local and remote versions 001–010 to be aligned');
    expect(runbook).toContain('only `011_zepbound_atomic_daily_symptoms.sql` to be pending');
    expect(runbook).toContain('supabase db push --linked --dry-run');
    expect(runbook).toContain('Apply migration 011 once with `supabase db push --linked`');
    expect(runbook).toContain('Do not use `migration repair` for migration 011');
    expect(runbook).toContain('Do not run this casually');
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
});
