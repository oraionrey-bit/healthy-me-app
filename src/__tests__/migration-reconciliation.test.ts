import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Supabase migration reconciliation guardrails', () => {
  const migrationDir = path.join(root, 'supabase/migrations');
  const reconciliation = read('supabase/migrations/009_reconcile_legacy_schema.sql');
  const zepboundMigration = read('supabase/migrations/010_zepbound_tracking.sql');

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

  it('documents the exact one-time ledger repair and migration order', () => {
    const runbook = read('docs/supabase-migration-reconciliation.md');
    expect(runbook).toContain('for version in 001 002 003 004 005 006 007 008; do');
    expect(runbook).toContain('migration repair "$version" --status applied --linked');
    expect(runbook).toContain('supabase db push --linked --dry-run');
    expect(runbook).toContain('supabase db push --linked`');
    expect(runbook).toContain('009_reconcile_legacy_schema.sql');
    expect(runbook).toContain('010_zepbound_tracking.sql');
    expect(runbook).toContain('Do not run this casually');
  });

  it('keeps Zepbound values constrained and user-owned', () => {
    expect(zepboundMigration).toContain("CHECK (injection_site IN ('abdomen', 'thigh', 'upper_arm', 'other'))");
    expect(zepboundMigration).toContain("CHECK (btrim(symptom_type) <> '')");
    expect(zepboundMigration).toContain('CHECK (severity BETWEEN 1 AND 5)');
    expect(zepboundMigration).toContain('ALTER TABLE zepbound_injections ENABLE ROW LEVEL SECURITY');
    expect(zepboundMigration).toContain('ALTER TABLE zepbound_symptom_logs ENABLE ROW LEVEL SECURITY');
    expect(zepboundMigration.match(/auth\.uid\(\) = user_id/g)?.length).toBeGreaterThanOrEqual(8);
  });
});
