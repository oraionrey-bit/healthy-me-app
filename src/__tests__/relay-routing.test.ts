const {
  buildTelegramNotificationPayload,
  shouldNotifyOraion,
} = require('../relay/routing');

describe('relay notification routing', () => {
  test('routes manual fallback notifications to Tina chat without an old thread by default', () => {
    const payload = buildTelegramNotificationPayload({
      messageId: 'msg-123',
      messageType: 'food_analysis',
      description: 'needs review',
    });

    expect(payload.chat_id).toBe('5052308275');
    expect(payload.message_thread_id).toBeUndefined();
    expect(payload.text).toContain('Chat Message ID: msg-123');
    expect(payload.text).toContain('needs review');
  });

  test('does not notify Oraion when AI auto-processing succeeded', () => {
    expect(shouldNotifyOraion({ aiProcessed: true })).toBe(false);
  });

  test('notifies Oraion when AI processing failed and manual response is needed', () => {
    expect(shouldNotifyOraion({ aiProcessed: false })).toBe(true);
  });
});
