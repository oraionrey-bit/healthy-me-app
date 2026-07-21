import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/015_distinct_supplement_schedules.sql'),
  'utf8',
);

describe('distinct supplement schedule migration contract', () => {
  it('runs the data rewrite and index creation transactionally', () => {
    expect(migration).toMatch(/\bBEGIN;/);
    expect(migration).toMatch(/COMMIT;\s*$/);
  });

  it('keeps original rows and clones historical completion records', () => {
    expect(migration).toMatch(/SET time_of_day = 'morning'/);
    expect(migration).toMatch(/INSERT INTO public\.supplement_logs/);
    expect(migration).toMatch(/JOIN public\.supplement_logs AS log\s+ON log\.user_supplement_id = split\.source_id/);
    expect(migration).toMatch(/log\.taken_at/);
    expect(migration).toMatch(/log\.notes/);
    expect(migration).not.toMatch(/DELETE FROM public\.(?:user_supplements|supplement_logs)/);
  });

  it('uses deterministic collision-free new sort orders', () => {
    expect(migration).toMatch(/max_sort_order\s*\+\s*row_number\(\)/);
    expect(migration).toMatch(/ORDER BY dual\.sort_order, dual\.created_at, dual\.id/);
    expect(migration).not.toMatch(/sort_order\s*\+\s*1[,\s]/);
  });

  it('enforces canonical identity without narrowing legitimate schedule text', () => {
    expect(migration).toMatch(/CREATE UNIQUE INDEX user_supplements_user_name_time_canonical_key/);
    expect(migration).toMatch(/lower\(btrim\(supplement_name\)\)/);
    expect(migration).toMatch(/lower\(btrim\(time_of_day\)\)/);
    expect(migration).not.toMatch(/CHECK\s*\([^;]*time_of_day/i);
  });
});
