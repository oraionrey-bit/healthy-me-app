import { expect, test } from '@playwright/test';

test.describe('production authenticated smoke', () => {
  test('loads the dashboard and Food tab without browser errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const requestFailures: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('requestfailed', (request) => {
      requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'unknown failure'}`);
    });

    await page.goto('/', { waitUntil: 'load' });

    await expect(page.getByText('HEALTHY ME')).toBeVisible({ timeout: 20_000 });

    const foodTab = page.getByRole('tab', { name: 'Food' });
    await expect(foodTab).toBeVisible({ timeout: 10_000 });
    await foodTab.click();

    await expect(page.getByText('+ Add Meal')).toBeVisible({ timeout: 15_000 });
    expect(consoleErrors.length).toBe(0);
    expect(requestFailures.length).toBe(0);
  });
});
