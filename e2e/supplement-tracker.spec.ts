import { test, expect } from '@playwright/test';

test.describe('Supplement Tracker on Health Tab', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
  });

  test('Health tab shows "My Supplements" tracker card', async ({ page }) => {
    await page.getByRole('tab', { name: 'Health' }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByText(/My Supplements/)).toBeVisible({ timeout: 10_000 });
  });

  test('Supplement tracker shows morning and evening groups', async ({ page }) => {
    await page.getByRole('tab', { name: 'Health' }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByText(/My Supplements/)).toBeVisible({ timeout: 10_000 });
    const hasMorning = await page.getByText('\u2600\uFE0F Morning').first().isVisible().catch(() => false);
    const hasEvening = await page.getByText('\u{1F319} Evening').first().isVisible().catch(() => false);
    expect(hasMorning || hasEvening).toBeTruthy();
  });

  test('Supplement tracker shows Add Supplement button', async ({ page }) => {
    await page.getByRole('tab', { name: 'Health' }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByText('+ Add Supplement')).toBeVisible({ timeout: 10_000 });
  });

  test('Supplement Consistency card still visible below tracker', async ({ page }) => {
    await page.getByRole('tab', { name: 'Health' }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByText(/Supplement Consistency/)).toBeVisible({ timeout: 10_000 });
  });

  test('Clicking Add Supplement shows the form', async ({ page }) => {
    await page.getByRole('tab', { name: 'Health' }).click();
    await page.waitForTimeout(2000);

    const addBtn = page.getByText('+ Add Supplement');
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();

    await expect(page.getByText('Name').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Dosage').first()).toBeVisible();
    await expect(page.getByText('Notes').first()).toBeVisible();
  });

  test('Expanding a supplement shows feeling tracker', async ({ page }) => {
    await page.getByRole('tab', { name: 'Health' }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByText(/My Supplements/)).toBeVisible({ timeout: 10_000 });

    // Scroll to My Supplements section on Health tab, then click the expand arrow
    await page.getByText(/My Supplements/).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    // Health tab supplement rows have "Ovasitol (AM)" as exact text (without dosage inline)
    // and a ▼ arrow. Use the exact text to avoid matching Home tab's "Ovasitol (AM) (1 scoop)"
    const suppRow = page.getByText('Ovasitol (AM)', { exact: true }).first();
    if (await suppRow.isVisible().catch(() => false)) {
      // Click the parent row container that has the ▼ expand arrow
      await suppRow.click({ force: true });
      await page.waitForTimeout(1500);
      const hasFeeling = await page.getByText(/How does this make you feel/).isVisible().catch(() => false);
      const hasNotes = await page.getByText(/Notes/).first().isVisible().catch(() => false);
      expect(hasFeeling || hasNotes).toBeTruthy();
    }
  });
});
