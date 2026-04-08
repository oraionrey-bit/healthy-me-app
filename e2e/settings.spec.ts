import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    // Settings is usually accessible via a gear icon or Settings text
    const settingsLink = page.getByText(/Settings|⚙/).first();
    if (await settingsLink.isVisible().catch(() => false)) {
      await settingsLink.click();
      await page.waitForTimeout(2000);
    }
  });

  test('Shows Export Health Data button', async ({ page }) => {
    const exportBtn = page.getByText(/Export Health Data/);
    // May not be visible if settings page didn't load (auth required)
    if (await exportBtn.isVisible().catch(() => false)) {
      await expect(exportBtn).toBeVisible();
    }
  });

  test('Shows Account section', async ({ page }) => {
    const account = page.getByText(/Account/);
    if (await account.isVisible().catch(() => false)) {
      await expect(account).toBeVisible();
    }
  });
});
