#!/bin/bash
# Start script for Oraion Chat Tunnel relay server.
# Loads selected runtime config from local env files without shell-sourcing them
# (some Hermes env values contain spaces and are not valid shell assignments).

set -euo pipefail

APP_DIR="/Users/oraion/Projects/healthy-me-app"
HERMES_ENV="/Users/oraion/.hermes/.env"
APP_ENV="$APP_DIR/.env"

load_selected_env_file() {
  local file="$1"
  [ -f "$file" ] || return 0

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|'#'*) continue ;;
    esac
    case "$line" in
      *=*) ;;
      *) continue ;;
    esac

    local key="${line%%=*}"
    local value="${line#*=}"
    key="${key#export }"
    key="${key//[[:space:]]/}"

    case "$key" in
      CHAT_TOKEN|EXPO_PUBLIC_CHAT_TOKEN|SUPABASE_URL|EXPO_PUBLIC_SUPABASE_URL|SUPABASE_ANON_KEY|EXPO_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|TELEGRAM_BOT_TOKEN|CLAWROUTER_API_KEY|GEMINI_API_KEY|GOOGLE_API_KEY|OPENROUTER_API_KEY|OPENROUTER_VISION_MODEL|OPENROUTER_MODEL|ORAION_TELEGRAM_CHAT_ID|ORAION_TELEGRAM_THREAD_ID)
        value="${value%$'\r'}"
        if [[ "$value" == \"*\" && "$value" == *\" ]]; then
          value="${value:1:${#value}-2}"
        elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
          value="${value:1:${#value}-2}"
        fi
        export "$key=$value"
        ;;
    esac
  done < "$file"
}

load_selected_env_file "$HERMES_ENV"
load_selected_env_file "$APP_ENV"

export CHAT_TOKEN="${CHAT_TOKEN:-${EXPO_PUBLIC_CHAT_TOKEN:-}}"
export SUPABASE_URL="${SUPABASE_URL:-${EXPO_PUBLIC_SUPABASE_URL:-}}"
export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
export TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
export CLAWROUTER_API_KEY="${CLAWROUTER_API_KEY:-}"
export GEMINI_API_KEY="${GEMINI_API_KEY:-${GOOGLE_API_KEY:-}}"
export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-}"

# Route Healthy Me manual AI follow-up notifications to Tina's current Telegram DM.
# Successful AI auto-processing stays in-app and does not notify Telegram.
export ORAION_TELEGRAM_CHAT_ID="${ORAION_TELEGRAM_CHAT_ID:-5052308275}"
unset ORAION_TELEGRAM_THREAD_ID

missing=()
[ -n "$CHAT_TOKEN" ] || missing+=(CHAT_TOKEN)
[ -n "$SUPABASE_URL" ] || missing+=(SUPABASE_URL)
[ -n "${SUPABASE_SERVICE_ROLE_KEY:-$SUPABASE_ANON_KEY}" ] || missing+=(SUPABASE_KEY)
[ -n "$TELEGRAM_BOT_TOKEN" ] || missing+=(TELEGRAM_BOT_TOKEN)

if [ ${#missing[@]} -gt 0 ]; then
  printf '[relay] Missing required config: %s\n' "${missing[*]}" >&2
  exit 1
fi

exec /opt/homebrew/bin/node "$APP_DIR/src/relay/server.js"
