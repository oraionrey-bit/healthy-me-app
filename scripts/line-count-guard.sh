#!/usr/bin/env bash
set -euo pipefail

# Line-count guard for Healthy Me
# Prevents commits that dramatically shrink source files (stub replacements).
# Usage: scripts/line-count-guard.sh [--force]

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

PASS="${GREEN}✓${NC}"
FAIL="${RED}✗${NC}"
WARN="${YELLOW}⚠${NC}"

BLOCKED=0
CHECKED=0
FORCE=0

pass() { echo -e "  ${PASS} $1"; }
fail() { echo -e "  ${FAIL} $1"; BLOCKED=$((BLOCKED + 1)); }
warn() { echo -e "  ${WARN} $1"; }

# Parse flags
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
  esac
done

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${BOLD}================================${NC}"
echo -e "${BOLD} Healthy Me — Line Count Guard${NC}"
echo -e "${BOLD}================================${NC}"
echo ""

# Get staged files that are modified (not added/deleted), restricted to src/
# Status M = modified, filter to src/ only
STAGED_FILES=$(git diff --cached --name-only --diff-filter=M -- 'src/' 2>/dev/null || true)

if [ -z "$STAGED_FILES" ]; then
  # Fallback: if nothing is staged, compare working tree to HEAD (for manual runs)
  STAGED_FILES=$(git diff --name-only --diff-filter=M -- 'src/' 2>/dev/null || true)
  if [ -z "$STAGED_FILES" ]; then
    echo -e "  No modified src/ files to check."
    echo ""
    echo -e "${BOLD}================================${NC}"
    echo -e "${GREEN}${BOLD} NO FILES TO CHECK${NC}"
    echo -e "${BOLD}================================${NC}"
    exit 0
  fi
  DIFF_MODE="unstaged"
else
  DIFF_MODE="staged"
fi

echo -e "${BOLD}Checking modified src/ files...${NC}"
echo ""

while IFS= read -r file; do
  # Skip test and config files
  case "$file" in
    *.test.*|*.spec.*|*.config.*|*/package.json|*/__tests__/*|*/__mocks__/*)
      continue
      ;;
  esac

  # Skip if file doesn't exist in HEAD (new file)
  if ! git cat-file -e "HEAD:$file" 2>/dev/null; then
    continue
  fi

  CHECKED=$((CHECKED + 1))

  # Line count in HEAD
  BEFORE=$(git show "HEAD:$file" 2>/dev/null | wc -l | tr -d ' ')

  # Line count in staged/working version
  if [ "$DIFF_MODE" = "staged" ]; then
    AFTER=$(git show ":$file" 2>/dev/null | wc -l | tr -d ' ')
  else
    AFTER=$(wc -l < "$file" | tr -d ' ')
  fi

  # Skip if original is tiny (less than 20 lines — can't lose >20 lines)
  if [ "$BEFORE" -le 20 ]; then
    continue
  fi

  LOST=$((BEFORE - AFTER))
  if [ "$BEFORE" -gt 0 ]; then
    PCT=$((LOST * 100 / BEFORE))
  else
    PCT=0
  fi

  # Block if shrunk by >50% AND lost >20 lines
  if [ "$PCT" -gt 50 ] && [ "$LOST" -gt 20 ]; then
    fail "${file}"
    echo -e "       Before: ${BEFORE} lines → After: ${AFTER} lines (${RED}-${PCT}%${NC}, -${LOST} lines)"
  fi
done <<< "$STAGED_FILES"

echo ""
echo -e "${BOLD}================================${NC}"

if [ "$CHECKED" -eq 0 ]; then
  echo -e "${GREEN}${BOLD} NO FILES TO CHECK${NC}"
  echo -e "${BOLD}================================${NC}"
  exit 0
fi

if [ "$BLOCKED" -eq 0 ]; then
  echo -e "${GREEN}${BOLD} ALL CLEAR${NC} — ${CHECKED} file(s) checked"
  echo -e "${BOLD}================================${NC}"
  exit 0
fi

if [ "$FORCE" -eq 1 ]; then
  echo -e "${YELLOW}${BOLD} FORCED${NC} — ${BLOCKED} file(s) shrunk dramatically but --force was used"
  echo -e "${BOLD}================================${NC}"
  exit 0
fi

echo -e "${RED}${BOLD} BLOCKED${NC} — ${BLOCKED} file(s) shrunk by >50% (lost >20 lines)"
echo -e ""
echo -e "  This usually means working code was replaced with a stub."
echo -e "  If this is intentional, re-run with ${BOLD}--force${NC} or:"
echo -e "    git commit --no-verify"
echo -e "${BOLD}================================${NC}"
exit 1
