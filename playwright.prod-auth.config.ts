import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://app.withluna.dev';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'prod-auth.smoke.spec.ts',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  use: {
    baseURL,
    browserName: 'chromium',
    storageState: 'e2e/.auth/prod-state.json',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  outputDir: 'test-results/prod-auth',
  reporter: 'line',
});
