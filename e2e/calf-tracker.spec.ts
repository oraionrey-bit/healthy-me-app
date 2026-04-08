import { test, expect } from '@playwright/test';

test.describe('Calf Recovery Tracker on Home Tab', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
  });

  test('Home tab shows Calf Recovery card', async ({ page }) => {
    await expect(page.getByText(/Calf Recovery/)).toBeVisible({ timeout: 10_000 });
  });

  test('Shows compression socks checkbox', async ({ page }) => {
    await expect(page.getByText('Wore compression socks')).toBeVisible({ timeout: 10_000 });
  });

  test('Shows calf sleeves checkbox', async ({ page }) => {
    await expect(page.getByText('Wore calf sleeves')).toBeVisible({ timeout: 10_000 });
  });

  test('Shows Achilles Stretching section with goal', async ({ page }) => {
    await expect(page.getByText('Achilles Stretching')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/\/60 min/)).toBeVisible({ timeout: 5_000 });
  });

  test('Shows quick-add stretch buttons', async ({ page }) => {
    await expect(page.getByText('+10m')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('+15m')).toBeVisible();
    await expect(page.getByText('+20m')).toBeVisible();
    await expect(page.getByText('+30m')).toBeVisible();
  });

  test('Shows progress count', async ({ page }) => {
    await expect(page.getByText(/\d\/3 done/)).toBeVisible({ timeout: 10_000 });
  });

  test('Shows Measurements & Notes expandable section', async ({ page }) => {
    await expect(page.getByText(/Measurements & Notes/)).toBeVisible({ timeout: 10_000 });
  });

  test('Expanding shows Record Measurement button', async ({ page }) => {
    const toggle = page.getByText(/Measurements & Notes/);
    await expect(toggle).toBeVisible({ timeout: 10_000 });
    await toggle.click();
    await expect(page.getByText(/Record Measurement/)).toBeVisible({ timeout: 5_000 });
  });

  test('Record Measurement opens form with calf fields', async ({ page }) => {
    const toggle = page.getByText(/Measurements & Notes/);
    await expect(toggle).toBeVisible({ timeout: 10_000 });
    await toggle.click();

    const recordBtn = page.getByText(/Record Measurement/);
    await expect(recordBtn).toBeVisible({ timeout: 5_000 });
    await recordBtn.click();

    await expect(page.getByText('Left Calf (cm)')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Right Calf (cm)')).toBeVisible();
    await expect(page.getByText(/Ankle Flexion/)).toBeVisible();
  });
});
