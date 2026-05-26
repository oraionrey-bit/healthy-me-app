const { ERROR_STATUS, isTerminalErrorStatus } = require('../relay/status');

describe('relay status helpers', () => {
  test('uses the database-supported error status instead of invalid failed status', () => {
    expect(ERROR_STATUS).toBe('error');
  });

  test('treats legacy failed and current error statuses as terminal failures for clients', () => {
    expect(isTerminalErrorStatus('error')).toBe(true);
    expect(isTerminalErrorStatus('failed')).toBe(true);
    expect(isTerminalErrorStatus('pending')).toBe(false);
    expect(isTerminalErrorStatus('complete')).toBe(false);
  });
});
