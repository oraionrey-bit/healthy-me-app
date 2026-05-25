const DEFAULT_ORAION_CHAT_ID = '5052308275';

function configuredTelegramTarget(env = process.env) {
  return {
    chatId: env.ORAION_TELEGRAM_CHAT_ID || env.TELEGRAM_ANALYSIS_CHAT_ID || DEFAULT_ORAION_CHAT_ID,
    threadId: env.ORAION_TELEGRAM_THREAD_ID || env.TELEGRAM_ANALYSIS_THREAD_ID || '',
  };
}

function buildTelegramNotificationPayload({ messageId, messageType, description }, env = process.env) {
  const { chatId, threadId } = configuredTelegramTarget(env);
  const text = [
    '📸 [Photo Analysis Request]',
    `Type: ${messageType}`,
    `Description: "${description || '(no description)'}"`,
    `Chat Message ID: ${messageId}`,
    '',
    'Oraion: respond in-app only if manual follow-up is needed.',
  ].join('\n');

  const payload = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (threadId) payload.message_thread_id = threadId;
  return payload;
}

function shouldNotifyOraion({ aiProcessed }) {
  return aiProcessed !== true;
}

module.exports = {
  DEFAULT_ORAION_CHAT_ID,
  configuredTelegramTarget,
  buildTelegramNotificationPayload,
  shouldNotifyOraion,
};
