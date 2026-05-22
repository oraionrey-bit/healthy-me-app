#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_BASE_URL = 'https://app.withluna.dev';
const DEFAULT_EMAIL = 'oraion-test@withluna.dev';
const DEFAULT_STATE_PATH = 'e2e/.auth/prod-state.json';

loadDotEnv();

const baseURL = normalizeBaseURL(process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_BASE_URL);
const email = process.env.PROD_SMOKE_EMAIL ?? DEFAULT_EMAIL;
const statePath = DEFAULT_STATE_PATH;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  fail('Missing SUPABASE_SERVICE_ROLE_KEY. Set it in the environment or local .env before running prod auth smoke.');
}

const { supabaseUrl, anonKey } = await readPublicSupabaseConfigFromDeployedBundle(baseURL);
const session = await createMagicLinkSession({ supabaseUrl, anonKey, serviceRoleKey, email });
const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

const storageState = {
  cookies: [],
  origins: [
    {
      origin: baseURL,
      localStorage: [
        {
          name: `sb-${projectRef}-auth-token`,
          value: JSON.stringify(session),
        },
      ],
    },
  ],
};

await mkdir(path.dirname(statePath), { recursive: true });
await writeFile(statePath, `${JSON.stringify(storageState, null, 2)}\n`);
console.log(`Wrote production smoke storageState to ${statePath} for ${baseURL}`);

async function readPublicSupabaseConfigFromDeployedBundle(appBaseURL) {
  const indexHtml = await fetchText(`${appBaseURL}/`);
  const scriptPaths = [...indexHtml.matchAll(/<script[^>]+src=["']([^"']+\.js)["']/g)]
    .map((match) => match[1])
    .filter((src) => src.includes('_expo/') || src.includes('/static/'));

  if (scriptPaths.length === 0) {
    fail(`Could not find deployed JavaScript bundle in ${appBaseURL}/`);
  }

  const bundles = await Promise.all(
    scriptPaths.map((scriptPath) => fetchText(new URL(scriptPath, `${appBaseURL}/`).toString())),
  );
  const bundleText = bundles.join('\n');

  const supabaseUrls = uniqueMatches(bundleText, /https:\/\/[a-z0-9]+\.supabase\.co/g);
  const anonKeys = uniqueMatches(bundleText, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+/g)
    .filter((candidate) => candidate.length > 180 && candidate.length < 320);

  if (supabaseUrls.length !== 1) {
    fail(`Expected exactly one Supabase URL in deployed bundle, found ${supabaseUrls.length}`);
  }
  if (anonKeys.length !== 1) {
    fail(`Expected exactly one public anon JWT in deployed bundle, found ${anonKeys.length}`);
  }

  return { supabaseUrl: supabaseUrls[0], anonKey: anonKeys[0] };
}

async function createMagicLinkSession({ supabaseUrl, anonKey, serviceRoleKey, email }) {
  const generated = await fetchJson(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      email,
      options: { redirectTo: baseURL },
    }),
  });

  const tokenHash = generated.hashed_token ?? generated.properties?.hashed_token;
  if (!tokenHash) {
    fail('Supabase did not return a magic-link token hash.');
  }

  const session = await fetchJson(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'magiclink', token_hash: tokenHash }),
  });

  if (!session.access_token || !session.refresh_token || !session.user?.id) {
    fail('Supabase verify response did not include a complete session.');
  }

  await fetchJson(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  return session;
}

async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    fail(`GET ${redact(url)} failed with ${response.status}`);
  }
  return response.text();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30_000) });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    fail(`${options.method ?? 'GET'} ${redact(url)} failed with ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
}

function loadDotEnv() {
  try {
    const envText = readFileSync('.env', 'utf8');
    for (const line of envText.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      if (process.env[key]) continue;
      process.env[key] = valueParts.join('=').replace(/^['"]|['"]$/g, '');
    }
  } catch {
    // Local .env is optional; CI/cron callers can provide environment variables directly.
  }
}

function uniqueMatches(text, regex) {
  return [...new Set([...text.matchAll(regex)].map((match) => match[0]))];
}

function normalizeBaseURL(url) {
  return url.replace(/\/+$/, '');
}

function redact(value) {
  return value.replace(/access_token=[^&]+/g, 'access_token=<redacted>');
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
