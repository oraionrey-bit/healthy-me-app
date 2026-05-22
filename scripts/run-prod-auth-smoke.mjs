#!/usr/bin/env node
import { rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const AUTH_STATE_PATH = 'e2e/.auth/prod-state.json';
const PROD_AUTH_OUTPUT_DIR = 'test-results/prod-auth';

const createAuthStatus = await run('node', ['scripts/create-prod-auth-state.mjs']);
if (createAuthStatus !== 0) {
  await cleanup();
  process.exit(createAuthStatus);
}

const playwrightStatus = await run('playwright', ['test', '-c', 'playwright.prod-auth.config.ts']);
await cleanup();
process.exit(playwrightStatus);

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('close', (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });

    child.on('error', (error) => {
      console.error(error.message);
      resolve(1);
    });
  });
}

async function cleanup() {
  await Promise.all([
    rm(AUTH_STATE_PATH, { force: true }),
    rm(PROD_AUTH_OUTPUT_DIR, { recursive: true, force: true }),
  ]);
}
