#!/bin/bash
# Start script for Oraion Chat Tunnel relay server
# Loads secrets from vault at runtime

VAULT="/Users/oraion/.openclaw/workspace/scripts/vault"

export CHAT_TOKEN=$(bash "$VAULT" get withluna-chat-token)
export SUPABASE_URL="https://xkdagrpbgyjsbnzbpkxb.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY=$(bash "$VAULT" get supabase-service-role-key)
export SUPABASE_ANON_KEY=$(bash "$VAULT" get supabase-anon-key)
export TELEGRAM_BOT_TOKEN=$(bash "$VAULT" get telegram-bot-token)
export CLAWROUTER_API_KEY=$(bash "$VAULT" get clawrouter-api-key)

exec /opt/homebrew/bin/node /Users/oraion/.openclaw/workspace/healthy-me/src/relay/server.js
