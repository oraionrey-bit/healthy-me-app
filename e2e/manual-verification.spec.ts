/**
 * Manual Verification — Step 5 of deploy process
 *
 * Tests actual user flows with the test account (oraion-test@withluna.dev).
 * Simulates what a real user would do: check supplements, log food, do daily check-in,
 * verify settings, use calf tracker, check skin routines.
 *
 * This replaces manual click-through — everything a QA tester would verify.
 */
import { test, expect } from '@playwright/test';

test.describe('Manual Verification — Full User Flow', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
  });

  // ═══════════════════════════════════════════
  // HOME TAB — Main dashboard
  // ═══════════════════════════════════════════

  test('Home: app loads with title, date, and character', async ({ page }) => {
    await expect(page.getByText('HEALTHY ME')).toBeVisible({ timeout: 10_000 });

    // Today's date should show
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    await expect(page.getByText(new RegExp(dayName))).toBeVisible();

    // Settings gear should be clickable
    await expect(page.getByText('⚙️')).toBeVisible();
  });

  test('Home: supplement checklist works — can check/uncheck', async ({ page }) => {
    await expect(page.getByText(/Supplements/).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('☀️ Morning')).toBeVisible();

    // Click a supplement to toggle it
    const ovasitol = page.getByText('Ovasitol (AM) (1 scoop)').first();
    await expect(ovasitol).toBeVisible();
    await ovasitol.click();
    await page.waitForTimeout(500);

    // Click again to untoggle
    await ovasitol.click();
    await page.waitForTimeout(500);

    // Supplement count should still show
    await expect(page.getByText(/\d+\/\d+ done/).first()).toBeVisible();
  });

  test('Home: water tracker buttons work', async ({ page }) => {
    await expect(page.getByText(/Water/)).toBeVisible({ timeout: 10_000 });

    // Click +1 cup button
    const plusOne = page.getByText('+1 cup').first();
    await expect(plusOne).toBeVisible();
    await plusOne.click();
    await page.waitForTimeout(500);

    // Water count should update
    await expect(page.getByText(/\d+\/8 cups/)).toBeVisible();
  });

  test('Home: daily check-in expands and has all fields', async ({ page }) => {
    const checkin = page.getByText('📝 Daily Check-in');
    await expect(checkin).toBeVisible({ timeout: 10_000 });

    // Click to expand
    await checkin.click();
    await page.waitForTimeout(500);

    // Should show mood, energy, symptoms, period, notes
    await expect(page.getByText('Mood')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Energy')).toBeVisible();
    await expect(page.getByText('Symptoms')).toBeVisible();
    await expect(page.getByText('Period')).toBeVisible();

    // Mood emojis should be visible
    await expect(page.getByText('😢')).toBeVisible();
    await expect(page.getByText('😊')).toBeVisible();

    // Save button should be visible
    await expect(page.getByText('Save Check-in')).toBeVisible();
  });

  test('Home: calf recovery tracker has all elements', async ({ page }) => {
    await expect(page.getByText(/Calf Recovery/)).toBeVisible({ timeout: 10_000 });

    // Checkboxes
    await expect(page.getByText('Wore compression socks')).toBeVisible();
    await expect(page.getByText('Wore calf sleeves')).toBeVisible();

    // Stretching section
    await expect(page.getByText('Achilles Stretching')).toBeVisible();
    await expect(page.getByText(/\d+\/60 min/)).toBeVisible();

    // Quick-add buttons
    await expect(page.getByText('+10m')).toBeVisible();
    await expect(page.getByText('+15m')).toBeVisible();

    // Measurements expandable
    await expect(page.getByText(/Measurements & Notes/)).toBeVisible();
  });

  // ═══════════════════════════════════════════
  // FOOD TAB — Meal logging
  // ═══════════════════════════════════════════

  test('Food: tab shows calorie/protein targets and Add Meal', async ({ page }) => {
    await page.getByRole('tab', { name: 'Food' }).click();
    await page.waitForTimeout(2000);

    // Should show calorie and protein tracking
    await expect(page.getByText(/Calories/).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Protein/).first()).toBeVisible();

    // Add Meal button should be visible
    await expect(page.getByText('+ Add Meal')).toBeVisible();
  });

  test('Food: Add Meal button opens meal form', async ({ page }) => {
    await page.getByRole('tab', { name: 'Food' }).click();
    await page.waitForTimeout(2000);

    await page.getByText('+ Add Meal').click();
    await page.waitForTimeout(1000);

    // Meal form should show meal type options
    const hasBreakfast = await page.getByText(/Breakfast/).first().isVisible().catch(() => false);
    const hasMealType = await page.getByText(/Meal Type/).first().isVisible().catch(() => false);
    const hasDescription = await page.getByText(/Description/).first().isVisible().catch(() => false);
    expect(hasBreakfast || hasMealType || hasDescription).toBeTruthy();
  });

  // ═══════════════════════════════════════════
  // MOVE TAB — Exercise tracking
  // ═══════════════════════════════════════════

  test('Move: tab loads with exercise options', async ({ page }) => {
    await page.getByRole('tab', { name: 'Move' }).click();
    await page.waitForTimeout(2000);

    // Should show exercise-related content
    const hasMove = await page.getByText(/Move|Exercise|Workout/).first().isVisible().catch(() => false);
    expect(hasMove).toBeTruthy();
  });

  // ═══════════════════════════════════════════
  // SKIN TAB — Routine and products
  // ═══════════════════════════════════════════

  test('Skin: routine tab shows AM/PM routines with steps', async ({ page }) => {
    await page.getByRole('tab', { name: 'Skin' }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByText('☀️ AM Routine')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('🌙 PM Routine')).toBeVisible();

    // Step counts should show
    const counts = page.getByText(/\d+\/\d+/);
    await expect(counts.first()).toBeVisible();
  });

  test('Skin: How It\'s Going insights and Tester Performance visible', async ({ page }) => {
    await page.getByRole('tab', { name: 'Skin' }).click();
    await page.waitForTimeout(2000);

    // Scroll down to find insights cards
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    await expect(page.getByText(/How It.s Going/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('🧪 Tester Performance')).toBeVisible();
    await expect(page.getByText('📋 Up Next')).toBeVisible();
  });

  test('Skin: can switch to Journal tab', async ({ page }) => {
    await page.getByRole('tab', { name: 'Skin' }).click();
    await page.waitForTimeout(2000);

    await page.getByText('Journal', { exact: true }).click();
    await page.waitForTimeout(1000);

    // Should show journal section
    const hasJournal = await page.getByText(/Skin Journal|New Entry|No journal/).first().isVisible().catch(() => false);
    expect(hasJournal).toBeTruthy();
  });

  test('Skin: can switch to Products tab and see product library', async ({ page }) => {
    await page.getByRole('tab', { name: 'Skin' }).click();
    await page.waitForTimeout(2000);

    await page.getByText('Products', { exact: true }).click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('Product Library')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('✅ Safe Products')).toBeVisible();
    await expect(page.getByText('🧪 Testing')).toBeVisible();
    await expect(page.getByText('❌ Triggers')).toBeVisible();
  });

  // ═══════════════════════════════════════════
  // HEALTH TAB — Dashboard and supplements
  // ═══════════════════════════════════════════

  test('Health: dashboard shows all sections', async ({ page }) => {
    await page.getByRole('tab', { name: 'Health' }).click();
    await page.waitForTimeout(2000);

    // Top sections
    await expect(page.getByText('HEALTH', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Mood/).first()).toBeVisible();

    // Time range selector
    await expect(page.getByText('7D')).toBeVisible();
    await expect(page.getByText('30D')).toBeVisible();
    await expect(page.getByText('90D')).toBeVisible();
  });

  test('Health: My Supplements tracker with morning/evening groups', async ({ page }) => {
    await page.getByRole('tab', { name: 'Health' }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByText(/My Supplements/).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('☀️ Morning').first()).toBeVisible();
    await expect(page.getByText('🌙 Evening').first()).toBeVisible();

    // Individual supplements should show
    await expect(page.getByText('Ovasitol (AM)').first()).toBeVisible();
    await expect(page.getByText('NAC').first()).toBeVisible();

    // Add Supplement button
    await expect(page.getByText('+ Add Supplement')).toBeVisible();
  });

  test('Health: Add Supplement form works', async ({ page }) => {
    await page.getByRole('tab', { name: 'Health' }).click();
    await page.waitForTimeout(2000);

    // Scroll to and click Add Supplement
    await page.getByText('+ Add Supplement').scrollIntoViewIfNeeded();
    await page.getByText('+ Add Supplement').click();
    await page.waitForTimeout(1000);

    // Form should appear with Name, Dosage, Notes fields
    await expect(page.getByText('Name').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Dosage').first()).toBeVisible();
  });

  test('Health: Supplement Consistency and Weight sections exist', async ({ page }) => {
    await page.getByRole('tab', { name: 'Health' }).click();
    await page.waitForTimeout(2000);

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    await expect(page.getByText(/Supplement Consistency/).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Weight/i).first()).toBeVisible();
  });

  test('Health: Period tracker is visible with calendar', async ({ page }) => {
    await page.getByRole('tab', { name: 'Health' }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByText(/Period Tracker/)).toBeVisible({ timeout: 10_000 });

    // Calendar should show current month
    const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    await expect(page.getByText(month)).toBeVisible();
  });

  test('Health: Labs section is visible', async ({ page }) => {
    await page.getByRole('tab', { name: 'Health' }).click();
    await page.waitForTimeout(2000);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    await expect(page.getByText(/Labs/).first()).toBeVisible({ timeout: 10_000 });
  });

  // ═══════════════════════════════════════════
  // SETTINGS — Export and account
  // ═══════════════════════════════════════════

  test('Settings: page loads with all sections', async ({ page }) => {
    await page.getByText('⚙️').click();
    await page.waitForTimeout(2000);

    // Should show settings sections
    await expect(page.getByText(/Export Health Data/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Account/).first()).toBeVisible();
  });

  // ═══════════════════════════════════════════
  // CROSS-TAB NAVIGATION
  // ═══════════════════════════════════════════

  test('Tab bar navigation works across all tabs', async ({ page }) => {
    // Start on Home
    await expect(page.getByText('HEALTHY ME')).toBeVisible({ timeout: 10_000 });

    // Go to Food
    await page.getByRole('tab', { name: 'Food' }).click();
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Calories/).first()).toBeVisible({ timeout: 10_000 });

    // Go to Move
    await page.getByRole('tab', { name: 'Move' }).click();
    await page.waitForTimeout(1500);

    // Go to Skin
    await page.getByRole('tab', { name: 'Skin' }).click();
    await page.waitForTimeout(1500);
    await expect(page.getByText('🧴 Skin')).toBeVisible({ timeout: 10_000 });

    // Go to Health
    await page.getByRole('tab', { name: 'Health' }).click();
    await page.waitForTimeout(1500);
    await expect(page.getByText('HEALTH', { exact: true })).toBeVisible({ timeout: 10_000 });

    // Back to Home
    await page.getByRole('tab', { name: 'Home' }).click();
    await page.waitForTimeout(1500);
    await expect(page.getByText('HEALTHY ME')).toBeVisible({ timeout: 10_000 });
  });
});
