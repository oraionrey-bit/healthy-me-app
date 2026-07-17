#!/usr/bin/env bash
set -euo pipefail

# Pre-deploy validation for Healthy Me (app.withluna.dev)
# Checks: TypeScript, tests, web export, Supabase schema/RLS/storage, static files

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

PASS="${GREEN}✓${NC}"
FAIL="${RED}✗${NC}"
WARN="${YELLOW}⚠${NC}"

FAILURES=0
WARNINGS=0

pass() { echo -e "  ${PASS} $1"; }
fail() { echo -e "  ${FAIL} $1"; FAILURES=$((FAILURES + 1)); }
warn() { echo -e "  ${WARN} $1"; WARNINGS=$((WARNINGS + 1)); }

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${BOLD}==============================${NC}"
echo -e "${BOLD} Healthy Me — Pre-Deploy Check${NC}"
echo -e "${BOLD}==============================${NC}"
echo ""

# ── Supabase credentials ──────────────────────────────────────────────
PROJECT_REF="xkdagrpbgyjsbnzbpkxb"

find_vault_script() {
  local candidate
  for candidate in "${VAULT_SCRIPT:-}" "${HERMES_VAULT_SCRIPT:-}" "${OPENCLAW_VAULT_SCRIPT:-}"; do
    if [ -n "$candidate" ] && [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  if command -v vault >/dev/null 2>&1; then
    command -v vault
  fi
}

vault_get() {
  local name="$1"
  local script
  script="$(find_vault_script)" || return 0
  [ -n "$script" ] || return 0
  "$script" get "$name" 2>/dev/null || true
}

SUPABASE_URL="${SUPABASE_URL:-${EXPO_PUBLIC_SUPABASE_URL:-}}"
SUPABASE_KEY="${SUPABASE_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}"
ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-${ACCESS_TOKEN:-}}"

SUPABASE_URL="${SUPABASE_URL:-$(vault_get supabase-project-url)}"
SUPABASE_KEY="${SUPABASE_KEY:-$(vault_get supabase-service-role-key)}"
ACCESS_TOKEN="${ACCESS_TOKEN:-$(vault_get supabase-access-token)}"

supabase_query() {
  local sql="$1"
  local body
  body=$(python3 -c "import json,sys; print(json.dumps({'query': sys.argv[1]}))" "$sql")
  curl -s -X POST "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$body"
}

# ── 1. TypeScript ──────────────────────────────────────────────────────
echo -e "${BOLD}[1/7] TypeScript${NC}"
if npx tsc --noEmit 2>/dev/null; then
  pass "TypeScript compiles cleanly"
else
  fail "TypeScript compilation errors"
fi
echo ""

# ── 2. Tests ───────────────────────────────────────────────────────────
echo -e "${BOLD}[2/7] Jest Tests${NC}"
if npm --silent run test:unit -- --silent 2>/dev/null; then
  pass "All tests pass"
else
  fail "Jest tests failed"
fi
echo ""

# ── 2b. Environment Variables ─────────────────────────────────────────
echo -e "${BOLD}[2b] Environment Variables${NC}"
if [ -f ".env" ]; then
  pass ".env file exists"
else
  warn ".env file missing — EXPO_PUBLIC_* vars may not be set at build time"
fi

if [ -n "${EXPO_PUBLIC_CHAT_TOKEN:-}" ]; then
  pass "EXPO_PUBLIC_CHAT_TOKEN is set"
elif grep -q "EXPO_PUBLIC_CHAT_TOKEN" .env 2>/dev/null; then
  pass "EXPO_PUBLIC_CHAT_TOKEN found in .env"
else
  fail "EXPO_PUBLIC_CHAT_TOKEN not set — product analysis will fail"
fi
echo ""

# ── 3. Web Export ──────────────────────────────────────────────────────
echo -e "${BOLD}[3/7] Web Export${NC}"
if npx expo export --platform web 2>/dev/null; then
  pass "Expo web export succeeded"
else
  fail "Expo web export failed"
fi

# Check dist output
if [ -d "dist" ] && [ "$(ls -A dist 2>/dev/null)" ]; then
  pass "dist/ folder exists and is non-empty"
else
  fail "dist/ folder missing or empty"
fi

# Static files
if [ -f "CNAME" ] || [ -f "dist/CNAME" ] || [ -f "public/CNAME" ]; then
  pass "CNAME file present"
else
  fail "CNAME file missing (needed for app.withluna.dev)"
fi

if [ -f ".nojekyll" ] || [ -f "dist/.nojekyll" ] || [ -f "public/.nojekyll" ]; then
  pass ".nojekyll file present"
else
  fail ".nojekyll file missing"
fi
echo ""

# ── 4. Supabase Tables ────────────────────────────────────────────────
echo -e "${BOLD}[4/7] Supabase Tables${NC}"
if [ -z "$ACCESS_TOKEN" ]; then
  warn "Supabase access token not found — skipping DB checks"
else
  REQUIRED_TABLES=(
    "daily_logs"
    "food_logs"
    "weight_logs"
    "water_logs"
    "symptoms"
    "supplement_logs"
    "user_supplements"
    "calf_measurements"
    "skincare_logs"
    "zepbound_injections"
    "zepbound_symptom_logs"
  )

  EXISTING_TABLES=$(supabase_query "SELECT tablename FROM pg_tables WHERE schemaname = 'public'" 2>/dev/null) || true

  for table in "${REQUIRED_TABLES[@]}"; do
    if echo "$EXISTING_TABLES" | grep -q "\"$table\""; then
      pass "Table: $table"
    else
      fail "Table missing: $table"
    fi
  done

  # Check calf columns on daily_logs
  echo ""
  echo -e "${BOLD}[4b] Calf tracking columns on daily_logs${NC}"
  CALF_COLUMNS=(
    "wore_compression_socks"
    "wore_calf_sleeves"
    "stretched_minutes"
    "calf_notes"
  )

  DAILY_LOGS_COLS=$(supabase_query "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_logs'" 2>/dev/null) || true

  for col in "${CALF_COLUMNS[@]}"; do
    if echo "$DAILY_LOGS_COLS" | grep -q "\"$col\""; then
      pass "Column: daily_logs.$col"
    else
      fail "Column missing: daily_logs.$col"
    fi
  done
fi
echo ""

# ── 5. RLS Policies ───────────────────────────────────────────────────
echo -e "${BOLD}[5/7] Row-Level Security${NC}"
if [ -z "$ACCESS_TOKEN" ]; then
  warn "Skipping RLS checks (no access token)"
else
  RLS_STATUS=$(supabase_query "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('daily_logs','food_logs','weight_logs','water_logs','symptoms','supplement_logs','user_supplements','calf_measurements','skincare_logs','zepbound_injections','zepbound_symptom_logs')") || true

  for table in "${REQUIRED_TABLES[@]}"; do
    if echo "$RLS_STATUS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
found = any(row.get('tablename') == '$table' and row.get('rowsecurity') is True for row in data)
sys.exit(0 if found else 1)
"; then
      pass "RLS enabled: $table"
    else
      fail "RLS not enabled: $table"
    fi
  done
fi
echo ""

# ── 6. Storage Buckets ────────────────────────────────────────────────
echo -e "${BOLD}[6/7] Storage Buckets${NC}"
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  warn "Skipping storage checks (missing Supabase URL or service key)"
else
  BUCKETS=$(curl -s "${SUPABASE_URL}/storage/v1/bucket" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "apikey: ${SUPABASE_KEY}" 2>/dev/null) || true

  REQUIRED_BUCKETS=("food-photos" "skin-photos")
  for bucket in "${REQUIRED_BUCKETS[@]}"; do
    if echo "$BUCKETS" | grep -q "\"$bucket\""; then
      pass "Bucket: $bucket"
    else
      fail "Bucket missing: $bucket"
    fi
  done
fi
echo ""

# ── 7. Stub File Detection ───────────────────────────────────────────
echo -e "${BOLD}[7/7] Stub File Detection${NC}"
STUB_PATTERNS='not yet implemented|NOT_IMPLEMENTED|stub|STUB|todo.*implement|TODO.*implement'
STUB_FILES=$(grep -rlE "$STUB_PATTERNS" src/components/ src/screens/ src/services/ src/hooks/ 2>/dev/null || true)

if [ -n "$STUB_FILES" ]; then
  while IFS= read -r sfile; do
    warn "Possible stub: $sfile (contains stub/TODO pattern)"
  done <<< "$STUB_FILES"
fi

# Check for tiny components (< 10 lines with just View/Text)
TINY_STUBS=""
for cfile in $(find src/components/ -name '*.tsx' -o -name '*.ts' 2>/dev/null); do
  LINES=$(wc -l < "$cfile" | tr -d ' ')
  if [ "$LINES" -lt 10 ]; then
    if grep -qE '<View>|<Text>' "$cfile" 2>/dev/null; then
      TINY_STUBS="$TINY_STUBS $cfile"
      warn "Tiny component ($LINES lines): $cfile"
    fi
  fi
done

if [ -z "$STUB_FILES" ] && [ -z "$TINY_STUBS" ]; then
  pass "No stub files detected"
fi
echo ""

# ── Summary ───────────────────────────────────────────────────────────
echo -e "${BOLD}==============================${NC}"
if [ $FAILURES -eq 0 ]; then
  echo -e "${GREEN}${BOLD} ALL CHECKS PASSED${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e " (${WARNINGS} warning(s))"
  fi
  echo -e "${BOLD}==============================${NC}"
  exit 0
else
  echo -e "${RED}${BOLD} ${FAILURES} CHECK(S) FAILED${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e " (${WARNINGS} warning(s))"
  fi
  echo -e "${BOLD}==============================${NC}"
  exit 1
fi
