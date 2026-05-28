const {
  buildTelegramNotificationPayload,
  resolveMessageUserId,
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

  test('routes relay-created messages to the signed-in app user when supplied', () => {
    expect(resolveMessageUserId(
      { user_id: '11111111-2222-4333-8444-555555555555' },
      'fallback-user-id',
    )).toBe('11111111-2222-4333-8444-555555555555');
  });

  test('falls back to Tina legacy user id when no valid app user is supplied', () => {
    expect(resolveMessageUserId({ user_id: 'not-a-uuid' }, 'fallback-user-id')).toBe('fallback-user-id');
    expect(resolveMessageUserId({}, 'fallback-user-id')).toBe('fallback-user-id');
  });
});
