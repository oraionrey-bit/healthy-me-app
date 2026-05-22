import { readFileSync } from 'fs';
import path from 'path';

describe('process guardrails', () => {
  const packageJson = JSON.parse(
    readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
  );

  it('defines canonical verification and build scripts', () => {
    expect(packageJson.scripts).toMatchObject({
      'test:unit': 'jest --forceExit',
      typecheck: 'tsc --noEmit',
      'build:web': 'expo export --platform web',
      'build:web:pages': 'npm run build:web && node scripts/prepare-pages-build.mjs',
      verify: 'npm run typecheck && npm run test:unit && npm run build:web:pages',
      'verify:full': 'npm run verify && npm run test:e2e',
      'test:e2e': 'playwright test',
      predeploy: 'bash scripts/pre-deploy-check.sh',
    });
  });
});
