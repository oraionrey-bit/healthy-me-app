import { test, expect } from '@playwright/test';

test.describe('Food Tab', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const foodTab = page.getByText('Food', { exact: true }).first();
    if (await foodTab.isVisible()) {
      await foodTab.click();
    }
    await page.waitForTimeout(2000);
  });

  test('Shows Food Log header', async ({ page }) => {
    await expect(page.getByText(/Food Log/)).toBeVisible({ timeout: 10_000 });
  });

  test('Shows calorie summary', async ({ page }) => {
    await expect(page.getByText(/cal/i)).toBeVisible({ timeout: 10_000 });
  });

  test('Shows meal type options', async ({ page }) => {
    const hasBreakfast = await page.getByText(/Breakfast/i).first().isVisible().catch(() => false);
    const hasLunch = await page.getByText(/Lunch/i).first().isVisible().catch(() => false);
    const hasDinner = await page.getByText(/Dinner/i).first().isVisible().catch(() => false);
    expect(hasBreakfast || hasLunch || hasDinner).toBeTruthy();
  });
});
