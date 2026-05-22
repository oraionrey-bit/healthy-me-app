import { readFileSync } from 'fs';
import path from 'path';

describe('process guardrails', () => {
  const packageJson = JSON.parse(
    readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
  );
  const ciWorkflow = readFileSync(path.join(process.cwd(), '.github/workflows/ci.yml'), 'utf8');
  const exportDataHook = readFileSync(path.join(process.cwd(), 'src/hooks/use-export-data.ts'), 'utf8');
  const skincareHook = readFileSync(path.join(process.cwd(), 'src/hooks/use-skincare.ts'), 'utf8');
  const skincareMigration = readFileSync(
    path.join(process.cwd(), 'supabase/migrations/006_skincare_logs.sql'),
    'utf8'
  );

  it('defines canonical verification and build scripts', () => {
    expect(packageJson.scripts).toMatchObject({
      'test:unit': 'jest --forceExit',
      typecheck: 'tsc --noEmit',
      'build:web': 'expo export --platform web',
      'build:web:pages': 'npm run build:web && node scripts/prepare-pages-build.mjs',
      verify: 'npm run typecheck && npm run test:unit && npm run build:web:pages',
      'verify:full': 'npm run verify && npm run test:e2e',
      'test:e2e': 'npm run test:e2e:smoke',
      'test:e2e:smoke': 'playwright test -c playwright.smoke.config.ts',
      'test:e2e:preview': 'PLAYWRIGHT_USE_EXTERNAL_SERVER=1 playwright test -c playwright.smoke.config.ts',
      'test:e2e:manual': 'playwright test -c playwright.config.ts',
      predeploy: 'bash scripts/pre-deploy-check.sh',
    });
  });

  it('keeps PR smoke CI bootable without repository secrets', () => {
    expect(ciWorkflow).toContain(
      "EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.EXPO_PUBLIC_SUPABASE_URL || 'https://example.supabase.co' }}"
    );
    expect(ciWorkflow).toContain(
      "EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key' }}"
    );
  });

  it('uses real skincare routine column names in source and migrations', () => {
    const checkedText = [exportDataHook, skincareHook, skincareMigration].join('\n');

    expect(checkedText).not.toContain('***');
    expect(checkedText).not.toContain('am_ste...eted');
    expect(checkedText).toContain('am_routine_done');
    expect(checkedText).toContain('am_steps_completed');
  });

  it('resets daily check-in state when the selected date has no saved data', () => {
    const homeScreen = readFileSync(path.join(process.cwd(), 'src/app/(tabs)/index.tsx'), 'utf8');

    expect(homeScreen).toContain('setMood(savedMood);');
    expect(homeScreen).toContain('setEnergy(savedEnergy);');
    expect(homeScreen).toContain('setSelectedSymptoms(map);');
    expect(homeScreen).toContain("setPeriodStatus('off');");
    expect(homeScreen).toContain("setLove(false);");
    expect(homeScreen).toContain("setNotes('');");
  });

});
