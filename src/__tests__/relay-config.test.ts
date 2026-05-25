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

  test('chooses best available AI provider without old Claude thread dependency', () => {
    expect(chooseAiProvider({ clawRouterApiKey: 'claw', geminiApiKey: 'gemini', openRouterApiKey: 'openrouter' })).toBe('clawrouter');
    expect(chooseAiProvider({ geminiApiKey: 'gemini', openRouterApiKey: 'openrouter' })).toBe('gemini');
    expect(chooseAiProvider({ openRouterApiKey: 'openrouter' })).toBe('openrouter');
    expect(chooseAiProvider({})).toBe('manual');
  });
});
