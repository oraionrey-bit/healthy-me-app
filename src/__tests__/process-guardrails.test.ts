import { readFileSync } from 'fs';
import path from 'path';

describe('process guardrails', () => {
  const packageJson = JSON.parse(
    readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
  );
  const ciWorkflow = readFileSync(path.join(process.cwd(), '.github/workflows/ci.yml'), 'utf8');

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
});
