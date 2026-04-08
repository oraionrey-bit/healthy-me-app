import { test, expect } from '@playwright/test';

test.describe('Health Tab', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    await page.getByRole('tab', { name: 'Health' }).click();
    await page.waitForTimeout(2000);
  });

  test('Shows Health Dashboard', async ({ page }) => {
    await expect(page.getByText(/Health|Dashboard/)).toBeVisible({ timeout: 10_000 });
  });

  test('Shows weight entry section', async ({ page }) => {
    // Weight section is at the bottom of the Health tab — scroll to it
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await expect(page.getByText(/Weight/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('Shows supplement consistency section', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await expect(page.getByText(/Supplement Consistency/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('Shows My Supplements tracker', async ({ page }) => {
    await expect(page.getByText(/My Supplements/)).toBeVisible({ timeout: 10_000 });
  });

  test('Shows Add Supplement button', async ({ page }) => {
    await expect(page.getByText('+ Add Supplement')).toBeVisible({ timeout: 10_000 });
  });

  test('Shows mood/energy section', async ({ page }) => {
    // Health tab shows "😊 Mood & Energy" as a combined section
    await expect(page.getByText(/Mood/).first()).toBeVisible({ timeout: 10_000 });
  });
});
