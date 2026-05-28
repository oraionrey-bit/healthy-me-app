const { loadRelayConfig, chooseAiProvider } = require('../relay/config');

describe('relay config', () => {
  test('maps Expo public env names to server runtime names', () => {
    const config = loadRelayConfig({
      EXPO_PUBLIC_CHAT_TOKEN: 'client-token',
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      TELEGRAM_BOT_TOKEN: 'telegram-token',
      OPENROUTER_API_KEY: 'openrouter-key',
    });

    expect(config.chatToken).toBe('client-token');
    expect(config.supabaseUrl).toBe('https://example.supabase.co');
    expect(config.supabaseKey).toBe('anon-key');
    expect(config.telegramBotToken).toBe('telegram-token');
    expect(config.openRouterApiKey).toBe('openrouter-key');
  });

  test('prefers server-only secrets over public fallbacks', () => {
    const config = loadRelayConfig({
      CHAT_TOKEN: 'server-token',
      EXPO_PUBLIC_CHAT_TOKEN: 'client-token',
      SUPABASE_URL: 'https://server.supabase.co',
      EXPO_PUBLIC_SUPABASE_URL: 'https://public.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      GOOGLE_API_KEY: 'google-key',
    });

    expect(config.chatToken).toBe('server-token');
    expect(config.supabaseUrl).toBe('https://server.supabase.co');
    expect(config.supabaseKey).toBe('service-key');
    expect(config.geminiApiKey).toBe('google-key');
  });

  test('ignores placeholder AI keys so the relay does not pick a broken provider', () => {
    const config = loadRelayConfig({
      GEMINI_API_KEY: 'your_gemini_api_key_here_replace_before_use',
      GOOGLE_API_KEY: 'your_google_api_key_here',
      OPENROUTER_API_KEY: 'openrouter-key',
    });

    expect(config.geminiApiKey).toBe('');
    expect(config.openRouterApiKey).toBe('openrouter-key');
    expect(chooseAiProvider(config)).toBe('openrouter');
  });

  test('chooses best available AI provider without old Claude thread dependency', () => {
    expect(chooseAiProvider({ clawRouterApiKey: 'claw', geminiApiKey: 'gemini', openRouterApiKey: 'openrouter' })).toBe('clawrouter');
    expect(chooseAiProvider({ geminiApiKey: 'gemini', openRouterApiKey: 'openrouter' })).toBe('gemini');
    expect(chooseAiProvider({ openRouterApiKey: 'openrouter' })).toBe('openrouter');
    expect(chooseAiProvider({ supabaseUrl: 'https://example.supabase.co', supabaseServiceRoleKey: 'service-key' })).toBe('supabase');
    expect(chooseAiProvider({})).toBe('manual');
  });
});
