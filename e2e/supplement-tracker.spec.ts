import { test, expect } from '@playwright/test';

test.describe('Supplement Tracker on Health Tab', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
  });

  test('Health tab shows "My Supplements" tracker card', async ({ page }) => {
    const healthTab = page.getByText('Health', { exact: true }).first();
    if (await healthTab.isVisible()) {
      await healthTab.click();
    }
    await page.waitForTimeout(2000);

    await expect(page.getByText(/My Supplements/)).toBeVisible({ timeout: 10_000 });
  });

  test('Supplement tracker shows morning and evening groups', async ({ page }) => {
    const healthTab = page.getByText('Health', { exact: true }).first();
    if (await healthTab.isVisible()) {
      await healthTab.click();
    }
    await page.waitForTimeout(2000);

    await expect(page.getByText(/My Supplements/)).toBeVisible({ timeout: 10_000 });
    const hasMorning = await page.getByText('\u2600\uFE0F Morning').first().isVisible().catch(() => false);
    const hasEvening = await page.getByText('\u{1F319} Evening').first().isVisible().catch(() => false);
    expect(hasMorning || hasEvening).toBeTruthy();
  });

  test('Supplement tracker shows Add Supplement button', async ({ page }) => {
    const healthTab = page.getByText('Health', { exact: true }).first();
    if (await healthTab.isVisible()) {
      await healthTab.click();
    }
    await page.waitForTimeout(2000);

    await expect(page.getByText('+ Add Supplement')).toBeVisible({ timeout: 10_000 });
  });

  test('Supplement Consistency card still visible below tracker', async ({ page }) => {
    const healthTab = page.getByText('Health', { exact: true }).first();
    if (await healthTab.isVisible()) {
      await healthTab.click();
    }
    await page.waitForTimeout(2000);

    await expect(page.getByText(/Supplement Consistency/)).toBeVisible({ timeout: 10_000 });
  });

  test('Clicking Add Supplement shows the form', async ({ page }) => {
    const healthTab = page.getByText('Health', { exact: true }).first();
    if (await healthTab.isVisible()) {
      await healthTab.click();
    }
    await page.waitForTimeout(2000);

    const addBtn = page.getByText('+ Add Supplement');
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();

    await expect(page.getByText('Name')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Dosage')).toBeVisible();
    await expect(page.getByText('Notes')).toBeVisible();
  });

  test('Expanding a supplement shows feeling tracker', async ({ page }) => {
    const healthTab = page.getByText('Health', { exact: true }).first();
    if (await healthTab.isVisible()) {
      await healthTab.click();
    }
    await page.waitForTimeout(2000);

    await expect(page.getByText(/My Supplements/)).toBeVisible({ timeout: 10_000 });

    const suppRow = page.locator('text=/Ovasitol|NAC|Vitamin|Omega/i').first();
    if (await suppRow.isVisible().catch(() => false)) {
      await suppRow.click();
      await expect(page.getByText(/How does this make you feel/)).toBeVisible({ timeout: 5_000 });
    }
  });
});
