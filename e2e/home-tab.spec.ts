import { test, expect } from '@playwright/test';

test.describe('Home Tab', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
  });

  test('Shows today\'s date', async ({ page }) => {
    const today = new Date();
    const month = today.toLocaleString('en-US', { month: 'long' });
    await expect(page.getByText(new RegExp(month))).toBeVisible({ timeout: 10_000 });
  });

  test('Shows character image', async ({ page }) => {
    const img = page.locator('img[src*="character"]').first();
    await expect(img).toBeVisible({ timeout: 10_000 });
  });

  test('Shows Today\'s Checklist section', async ({ page }) => {
    await expect(page.getByText(/Checklist|checklist/)).toBeVisible({ timeout: 10_000 });
  });

  test('Shows supplement items in checklist', async ({ page }) => {
    const hasOvasitol = await page.getByText(/Ovasitol/).first().isVisible().catch(() => false);
    const hasMagnesium = await page.getByText(/Magnesium/).first().isVisible().catch(() => false);
    expect(hasOvasitol || hasMagnesium).toBeTruthy();
  });

  test('Shows Today\'s Food section', async ({ page }) => {
    await expect(page.getByText(/Today's Food|Food/)).toBeVisible({ timeout: 10_000 });
  });

  test('Tab bar is visible with all tabs', async ({ page }) => {
    await expect(page.getByText('Home', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Food', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Move', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Skin', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Health', { exact: true }).first()).toBeVisible();
  });
});
