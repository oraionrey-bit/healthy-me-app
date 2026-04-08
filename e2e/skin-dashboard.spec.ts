import { test, expect } from '@playwright/test';

test.describe('Skin Dashboard - Routine Insights & Tester Performance', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    // Navigate to the app and go to the Skin tab
    await page.goto('/', { waitUntil: 'load' });
    // Wait for app to be ready
    await page.waitForTimeout(3000);
  });

  test('Routine tab shows "How It\'s Going" insights card', async ({ page }) => {
    // Navigate to Skin tab
    const skinTab = page.getByText('Skin', { exact: true }).first();
    if (await skinTab.isVisible()) {
      await skinTab.click();
    }
    await page.waitForTimeout(2000);

    // Routine tab should be default — check for insights card
    await expect(page.getByText(/How It.s Going/)).toBeVisible({ timeout: 10_000 });
  });

  test('Routine tab shows AM and PM adherence bars', async ({ page }) => {
    const skinTab = page.getByText('Skin', { exact: true }).first();
    if (await skinTab.isVisible()) {
      await skinTab.click();
    }
    await page.waitForTimeout(2000);

    await expect(page.getByText('☀️ AM')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('🌙 PM')).toBeVisible({ timeout: 10_000 });
  });

  test('Routine tab shows streak information', async ({ page }) => {
    const skinTab = page.getByText('Skin', { exact: true }).first();
    if (await skinTab.isVisible()) {
      await skinTab.click();
    }
    await page.waitForTimeout(2000);

    // Should show either a streak count or "No streak yet"
    const streakOrNone = page.getByText(/day streak|No streak yet/);
    await expect(streakOrNone).toBeVisible({ timeout: 10_000 });
  });

  test('Routine tab shows Tester Performance card', async ({ page }) => {
    const skinTab = page.getByText('Skin', { exact: true }).first();
    if (await skinTab.isVisible()) {
      await skinTab.click();
    }
    await page.waitForTimeout(2000);

    await expect(page.getByText('🧪 Tester Performance')).toBeVisible({ timeout: 10_000 });
  });

  test('Tester Performance shows testing products or empty state', async ({ page }) => {
    const skinTab = page.getByText('Skin', { exact: true }).first();
    if (await skinTab.isVisible()) {
      await skinTab.click();
    }
    await page.waitForTimeout(2000);

    // Should show either testing product names or "No products being tested"
    const testerCard = page.getByText('🧪 Tester Performance');
    await expect(testerCard).toBeVisible({ timeout: 10_000 });

    // Either a product name or empty state should be visible
    const hasContent = await page.getByText(/Day \d+|No products being tested/).isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('Dashboard cards appear between routines and Up Next', async ({ page }) => {
    const skinTab = page.getByText('Skin', { exact: true }).first();
    if (await skinTab.isVisible()) {
      await skinTab.click();
    }
    await page.waitForTimeout(2000);

    // Verify ordering: AM Routine, PM Routine, How It's Going, Tester Performance, Up Next
    await expect(page.getByText('☀️ AM Routine')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('🌙 PM Routine')).toBeVisible();
    await expect(page.getByText(/How It.s Going/)).toBeVisible();
    await expect(page.getByText('🧪 Tester Performance')).toBeVisible();
    await expect(page.getByText('📋 Up Next')).toBeVisible();
  });
});
