#!/usr/bin/env bash
set -euo pipefail

# E2E test runner for Healthy Me (app.withluna.dev)
# Runs Playwright tests from e2e/ against the live site

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

PASS="${GREEN}✓${NC}"
FAIL="${RED}✗${NC}"
WARN="${YELLOW}⚠${NC}"

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

BASE_URL="${BASE_URL:-https://app.withluna.dev}"

echo -e "${BOLD}=============================${NC}"
echo -e "${BOLD} Healthy Me — E2E Test Runner${NC}"
echo -e "${BOLD}=============================${NC}"
echo -e " Target: ${BASE_URL}"
echo ""

# ── 1. Check / Install Playwright ─────────────────────────────────────
echo -e "${BOLD}[1/3] Playwright Setup${NC}"

if npx playwright --version &>/dev/null; then
  PW_VERSION=$(npx playwright --version 2>/dev/null)
  echo -e "  ${PASS} Playwright installed (${PW_VERSION})"
else
  echo -e "  ${WARN} Playwright not found — installing..."
  npm install --save-dev @playwright/test 2>/dev/null
  if [ $? -eq 0 ]; then
    echo -e "  ${PASS} @playwright/test installed"
  else
    echo -e "  ${FAIL} Failed to install @playwright/test"
    exit 1
  fi
fi

# Check browsers
if npx playwright install --dry-run chromium &>/dev/null 2>&1; then
  echo -e "  ${PASS} Chromium browser available"
else
  echo -e "  ${WARN} Installing Chromium browser..."
  npx playwright install chromium 2>/dev/null
  if [ $? -eq 0 ]; then
    echo -e "  ${PASS} Chromium installed"
  else
    echo -e "  ${FAIL} Failed to install Chromium"
    exit 1
  fi
fi
echo ""

# ── 2. Verify target is reachable ─────────────────────────────────────
echo -e "${BOLD}[2/3] Site Reachability${NC}"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" 2>/dev/null) || true

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "  ${PASS} ${BASE_URL} is reachable (HTTP ${HTTP_STATUS})"
else
  echo -e "  ${FAIL} ${BASE_URL} returned HTTP ${HTTP_STATUS}"
  echo -e "  ${WARN} Tests may fail if the site is down"
fi
echo ""

# ── 3. Run Tests ──────────────────────────────────────────────────────
echo -e "${BOLD}[3/3] Running E2E Tests${NC}"
echo ""

# Check if e2e directory has test files
E2E_DIR="$PROJECT_DIR/e2e"
if [ ! -d "$E2E_DIR" ] || [ -z "$(ls "$E2E_DIR"/*.spec.ts 2>/dev/null)" ]; then
  echo -e "  ${FAIL} No test files found in e2e/"
  exit 1
fi

TEST_COUNT=$(ls "$E2E_DIR"/*.spec.ts 2>/dev/null | wc -l | tr -d ' ')
echo -e "  Found ${TEST_COUNT} test file(s)"
echo ""

# Create a minimal playwright config if none exists
PW_CONFIG="$PROJECT_DIR/playwright.config.ts"
if [ ! -f "$PW_CONFIG" ]; then
  echo -e "  ${WARN} No playwright.config.ts found — creating minimal config"
  cat > "$PW_CONFIG" << 'PWEOF'
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || 'https://app.withluna.dev',
    headless: true,
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  reporter: [['list']],
});
PWEOF
  echo -e "  ${PASS} Created playwright.config.ts"
fi

# Run Playwright
export BASE_URL
if npx playwright test --reporter=list 2>&1 | tee /tmp/pw-results.txt; then
  echo ""
  echo -e "${BOLD}=============================${NC}"
  echo -e "${GREEN}${BOLD} ALL E2E TESTS PASSED${NC}"
  echo -e "${BOLD}=============================${NC}"
  exit 0
else
  echo ""
  echo -e "${BOLD}=============================${NC}"
  echo -e "${RED}${BOLD} E2E TESTS FAILED${NC}"
  echo -e "${BOLD}=============================${NC}"
  echo ""
  echo -e "Full results: /tmp/pw-results.txt"
  echo -e "Run with UI:  npx playwright test --ui"
  exit 1
fi
