import { test, expect } from '@playwright/test';

test.describe('Health Tab', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const healthTab = page.getByText('Health', { exact: true }).first();
    if (await healthTab.isVisible()) {
      await healthTab.click();
    }
    await page.waitForTimeout(2000);
  });

  test('Shows Health Dashboard', async ({ page }) => {
    await expect(page.getByText(/Health|Dashboard/)).toBeVisible({ timeout: 10_000 });
  });

  test('Shows weight entry section', async ({ page }) => {
    await expect(page.getByText(/Weight/i)).toBeVisible({ timeout: 10_000 });
  });

  test('Shows supplement consistency section', async ({ page }) => {
    await expect(page.getByText(/Supplement Consistency/)).toBeVisible({ timeout: 10_000 });
  });

  test('Shows My Supplements tracker', async ({ page }) => {
    await expect(page.getByText(/My Supplements/)).toBeVisible({ timeout: 10_000 });
  });

  test('Shows Add Supplement button', async ({ page }) => {
    await expect(page.getByText('+ Add Supplement')).toBeVisible({ timeout: 10_000 });
  });

  test('Shows mood/energy section', async ({ page }) => {
    const hasMood = await page.getByText(/Mood|mood/).first().isVisible().catch(() => false);
    const hasEnergy = await page.getByText(/Energy|energy/).first().isVisible().catch(() => false);
    expect(hasMood || hasEnergy).toBeTruthy();
  });
});
