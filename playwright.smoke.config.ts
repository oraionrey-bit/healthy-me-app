import { defineConfig } from '@playwright/test';

const externalServer = process.env.PLAYWRIGHT_USE_EXTERNAL_SERVER === '1' || Boolean(process.env.PLAYWRIGHT_BASE_URL);
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const localBaseURL = `http://127.0.0.1:${port}`;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? localBaseURL;

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.smoke\.spec\.ts/,
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'on-first-retry',
  },
  webServer: externalServer
    ? undefined
    : {
        command: `npm run build:web:pages && python3 -m http.server ${port} --directory dist`,
        url: localBaseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
