import { expect, test } from '@playwright/test';

test.describe('public app smoke', () => {
  test('loads the unauthenticated shell without authenticated setup', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.getByPlaceholder('your@email.com')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('✨ Send Magic Link')).toBeVisible();
  });
});
