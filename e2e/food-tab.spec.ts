import { test, expect } from '@playwright/test';

test.describe('Food Tab', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const foodTab = page.getByRole('tab', { name: 'Food' });
    await foodTab.click();
    await page.waitForTimeout(2000);
  });

  test('Shows calorie and protein targets', async ({ page }) => {
    await expect(page.getByText(/Calories/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Protein/)).toBeVisible({ timeout: 5_000 });
  });

  test('Shows Add Meal button', async ({ page }) => {
    await expect(page.getByText('+ Add Meal')).toBeVisible({ timeout: 10_000 });
  });

  test('Shows Quick Add or empty state', async ({ page }) => {
    const hasQuickAdd = await page.getByText(/Quick Add/).isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/No meals logged/).isVisible().catch(() => false);
    expect(hasQuickAdd || hasEmpty).toBeTruthy();
  });
});
