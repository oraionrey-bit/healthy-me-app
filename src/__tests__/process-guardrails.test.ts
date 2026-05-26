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
      'test:unit': 'jest',
      typecheck: 'tsc --noEmit',
      'build:web': 'expo export --platform web',
      'build:web:pages': 'npm run build:web && node scripts/prepare-pages-build.mjs',
      verify: 'npm run typecheck && npm run test:unit && npm run build:web:pages',
      'verify:full': 'npm run verify && npm run test:e2e',
      'test:e2e': 'npm run test:e2e:smoke',
      'test:e2e:smoke': 'playwright test -c playwright.smoke.config.ts',
      'test:e2e:preview': 'PLAYWRIGHT_USE_EXTERNAL_SERVER=1 playwright test -c playwright.smoke.config.ts',
      'test:e2e:manual': 'playwright test -c playwright.config.ts',
      'test:e2e:prod:auth': 'node scripts/run-prod-auth-smoke.mjs',
      predeploy: 'bash scripts/pre-deploy-check.sh',
    });
  });

  it('keeps pre-deploy checks aligned with canonical test scripts', () => {
    const preDeployCheck = readFileSync(
      path.join(process.cwd(), 'scripts/pre-deploy-check.sh'),
      'utf8'
    );

    expect(preDeployCheck).toContain('npm --silent run test:unit -- --silent');
    expect(preDeployCheck).not.toContain('--forceExit');
  });

  it('keeps vault-backed maintenance helpers portable and env-first', () => {
    const preDeployCheck = readFileSync(
      path.join(process.cwd(), 'scripts/pre-deploy-check.sh'),
      'utf8'
    );
    const authSetup = readFileSync(path.join(process.cwd(), 'e2e/auth.setup.ts'), 'utf8');

    for (const helper of [preDeployCheck, authSetup]) {
      expect(helper).not.toContain('.openclaw/workspace/scripts/vault');
    }
    expect(preDeployCheck).toContain('SUPABASE_URL="${SUPABASE_URL:-${EXPO_PUBLIC_SUPABASE_URL:-}}"');
    expect(preDeployCheck).toContain('SUPABASE_KEY="${SUPABASE_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}"');
    expect(preDeployCheck).toContain('find_vault_script()');
    expect(authSetup).toContain('process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL');
    expect(authSetup).toContain('process.env.SUPABASE_SERVICE_ROLE_KEY');
    expect(authSetup).toContain('findVaultScript()');
  });

  it('defines a reusable production authenticated smoke check', () => {
    const prodAuthConfig = readFileSync(
      path.join(process.cwd(), 'playwright.prod-auth.config.ts'),
      'utf8'
    );
    const prodAuthSpec = readFileSync(
      path.join(process.cwd(), 'e2e/prod-auth.smoke.spec.ts'),
      'utf8'
    );
    const createAuthStateScript = readFileSync(
      path.join(process.cwd(), 'scripts/create-prod-auth-state.mjs'),
      'utf8'
    );
    const runProdAuthScript = readFileSync(
      path.join(process.cwd(), 'scripts/run-prod-auth-smoke.mjs'),
      'utf8'
    );

    expect(prodAuthConfig).toContain('prod-auth.smoke.spec.ts');
    expect(prodAuthConfig).toContain('e2e/.auth/prod-state.json');
    expect(prodAuthConfig).toContain('https://app.withluna.dev');
    expect(prodAuthConfig).toContain("trace: 'off'");
    expect(prodAuthConfig).toContain("video: 'off'");
    expect(prodAuthConfig).toContain("screenshot: 'off'");
    expect(prodAuthConfig).toContain("outputDir: 'test-results/prod-auth'");
    expect(prodAuthSpec).toContain("getByRole('tab', { name: 'Food' })");
    expect(prodAuthSpec).toContain('expect(consoleErrors.length).toBe(0)');
    expect(createAuthStateScript).toContain('admin/generate_link');
    expect(createAuthStateScript).toContain('/auth/v1/verify');
    expect(createAuthStateScript).toContain('storageState');
    expect(createAuthStateScript).not.toContain('SUPABASE_SERVICE_ROLE_KEY=');
    expect(createAuthStateScript).not.toContain('PROD_SMOKE_AUTH_STATE');
    expect(createAuthStateScript).not.toContain('PROD_SMOKE_BASE_URL');
    expect(runProdAuthScript).toContain('scripts/create-prod-auth-state.mjs');
    expect(runProdAuthScript).toContain('playwright.prod-auth.config.ts');
    expect(runProdAuthScript).toContain('e2e/.auth/prod-state.json');
    expect(runProdAuthScript).toContain('test-results/prod-auth');
    expect(runProdAuthScript).toContain('cleanup');
  });

  it('keeps production authenticated smoke out of the default PR smoke config', () => {
    const smokeConfig = readFileSync(
      path.join(process.cwd(), 'playwright.smoke.config.ts'),
      'utf8'
    );

    expect(smokeConfig).toContain('testIgnore');
    expect(smokeConfig).toContain('prod-auth.smoke.spec.ts');
  });

  it('keeps PR smoke CI bootable without repository secrets', () => {
    expect(ciWorkflow).toContain(
      "EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.EXPO_PUBLIC_SUPABASE_URL || 'https://example.supabase.co' }}"
    );
    expect(ciWorkflow).toContain(
      "EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key' }}"
    );
  });

  it('opts GitHub Actions JavaScript runtime into Node 24', () => {
    const deployWorkflow = readFileSync(
      path.join(process.cwd(), '.github/workflows/deploy-pages.yml'),
      'utf8'
    );

    for (const workflow of [ciWorkflow, deployWorkflow]) {
      expect(workflow).toContain('FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true');
    }
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


  it('gates GitHub Pages deployment behind manual main-branch verification', () => {
    const deployWorkflow = readFileSync(
      path.join(process.cwd(), '.github/workflows/deploy-pages.yml'),
      'utf8'
    );

    expect(deployWorkflow).toContain('workflow_dispatch:');
    expect(deployWorkflow).not.toContain('pull_request:');
    expect(deployWorkflow).not.toContain('push:');
    expect(deployWorkflow).toContain("github.ref == 'refs/heads/main'");
    expect(deployWorkflow).toContain('node-version: 22');
    expect(deployWorkflow).toContain('Validate production public config');
    expect(deployWorkflow).toContain('secrets.EXPO_PUBLIC_SUPABASE_URL');
    expect(deployWorkflow).toContain('secrets.EXPO_PUBLIC_SUPABASE_ANON_KEY');
    expect(deployWorkflow).not.toContain("secrets.EXPO_PUBLIC_SUPABASE_URL || 'https://example.supabase.co'");
    expect(deployWorkflow).not.toContain("secrets.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key'");
    expect(deployWorkflow).toContain('/auth/v1/settings');
    expect(deployWorkflow).toContain('Authorization: Bearer ${EXPO_PUBLIC_SUPABASE_ANON_KEY}');
    expect(deployWorkflow).toContain('curl --fail');
    expect(deployWorkflow).toContain('--connect-timeout 10');
    expect(deployWorkflow).toContain('--max-time 30');
    expect(deployWorkflow).toContain('npm run verify:full');
    expect(deployWorkflow).toContain('actions/upload-pages-artifact@v3');
    expect(deployWorkflow).toContain('actions/deploy-pages@v4');
  });

});
