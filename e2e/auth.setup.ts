import { test as setup, expect } from '@playwright/test';
import { execSync } from 'child_process';

/**
 * Authenticate with the test account before running E2E tests.
 * Uses Supabase admin API to generate a magic link, then sets the session in localStorage.
 */
setup('authenticate', async ({ page }) => {
  const supabaseUrl = getVaultSecret('supabase-project-url');
  const serviceKey = getVaultSecret('supabase-service-role-key');

  if (!supabaseUrl || !serviceKey) {
    console.warn('Missing Supabase credentials — skipping auth setup');
    return;
  }

  // Generate a magic link for the test account using admin API
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      email: 'oraion-test@withluna.dev',
      options: {
        redirectTo: 'https://app.withluna.dev',
      },
    }),
  });

  const data = await response.json();

  const actionLink = data.properties?.action_link ?? data.action_link;
  if (!actionLink) {
    console.error('Failed to generate magic link:', JSON.stringify(data));
    return;
  }

  // Navigate to the magic link — this will authenticate and redirect
  await page.goto(actionLink, { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  // Verify we're logged in (no login form visible)
  const loginForm = page.getByText('Send Magic Link');
  await expect(loginForm).not.toBeVisible({ timeout: 10_000 });

  // Save auth state
  await page.context().storageState({ path: 'e2e/.auth/state.json' });
});

function getVaultSecret(name: string): string {
  try {
    return execSync(
      `bash ${process.env.HOME}/.openclaw/workspace/scripts/vault get ${name}`,
      { encoding: 'utf-8' },
    ).trim();
  } catch {
    return '';
  }
}
