const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.5-flash';

function looksLikePlaceholder(value) {
  const normalized = value.toLowerCase();
  return normalized.includes('your_') || normalized.includes('_here') || normalized.includes('replace_before_use');
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed && !looksLikePlaceholder(trimmed)) return trimmed;
  }
  return '';
}

function loadRelayConfig(env = process.env) {
  const supabaseServiceRoleKey = firstNonEmpty(env.SUPABASE_SERVICE_ROLE_KEY);
  const supabaseAnonKey = firstNonEmpty(env.SUPABASE_ANON_KEY, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

  return {
    port: Number.parseInt(env.PORT || '7700', 10),
    chatToken: firstNonEmpty(env.CHAT_TOKEN, env.EXPO_PUBLIC_CHAT_TOKEN),
    supabaseUrl: firstNonEmpty(env.SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_URL),
    supabaseServiceRoleKey,
    supabaseAnonKey,
    supabaseKey: firstNonEmpty(supabaseServiceRoleKey, supabaseAnonKey),
    telegramBotToken: firstNonEmpty(env.TELEGRAM_BOT_TOKEN),
    clawRouterApiKey: firstNonEmpty(env.CLAWROUTER_API_KEY),
    geminiApiKey: firstNonEmpty(env.GEMINI_API_KEY, env.GOOGLE_API_KEY),
    openRouterApiKey: firstNonEmpty(env.OPENROUTER_API_KEY),
    openRouterModel: firstNonEmpty(env.OPENROUTER_VISION_MODEL, env.OPENROUTER_MODEL) || DEFAULT_OPENROUTER_MODEL,
  };
}

function chooseAiProvider(config) {
  if (config.clawRouterApiKey) return 'clawrouter';
  if (config.geminiApiKey) return 'gemini';
  if (config.openRouterApiKey) return 'openrouter';
  if (config.supabaseUrl && config.supabaseServiceRoleKey) return 'supabase';
  return 'manual';
}

module.exports = {
  DEFAULT_OPENROUTER_MODEL,
  firstNonEmpty,
  loadRelayConfig,
  chooseAiProvider,
};
