import { test as setup, expect } from '@playwright/test';
import { execFileSync } from 'child_process';
import { accessSync, constants } from 'fs';

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
  const envBySecretName: Record<string, string | undefined> = {
    'supabase-project-url': process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL,
    'supabase-service-role-key': process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const envValue = envBySecretName[name];
  if (envValue) return envValue;

  const vaultScript = findVaultScript();
  if (!vaultScript) return '';

  try {
    return execFileSync(vaultScript, ['get', name], { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

function findVaultScript(): string {
  const candidates = [
    process.env.VAULT_SCRIPT,
    process.env.HERMES_VAULT_SCRIPT,
    process.env.OPENCLAW_VAULT_SCRIPT,
  ];

  for (const candidate of candidates) {
    if (candidate && isExecutableFile(candidate)) return candidate;
  }

  try {
    return execFileSync('which', ['vault'], { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

function isExecutableFile(filePath: string): boolean {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
