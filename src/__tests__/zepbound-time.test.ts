import {
  currentPacificTime,
  formatDatabaseTime,
  fromDatabaseTime,
  toDatabaseTime,
} from '../utils/zepbound-time';

describe('Zepbound Pacific 12-hour time boundary', () => {
  it.each([
    [{ hour: '12', minute: '00', period: 'AM' as const }, '00:00'],
    [{ hour: '12', minute: '00', period: 'PM' as const }, '12:00'],
    [{ hour: '1', minute: '05', period: 'PM' as const }, '13:05'],
    [{ hour: '11', minute: '59', period: 'PM' as const }, '23:59'],
  ])('converts %j to database time %s', (input, expected) => {
    expect(toDatabaseTime(input)).toBe(expected);
    expect(fromDatabaseTime(`${expected}:00`)).toEqual(input);
  });

  it('pads a one-digit minute and rejects incomplete or invalid fields', () => {
    expect(toDatabaseTime({ hour: '9', minute: '5', period: 'AM' })).toBe('09:05');
    expect(toDatabaseTime({ hour: '', minute: '05', period: 'AM' })).toBeNull();
    expect(toDatabaseTime({ hour: '0', minute: '05', period: 'AM' })).toBeNull();
    expect(toDatabaseTime({ hour: '13', minute: '05', period: 'PM' })).toBeNull();
    expect(toDatabaseTime({ hour: '9', minute: '', period: 'AM' })).toBeNull();
    expect(toDatabaseTime({ hour: '9', minute: '60', period: 'AM' })).toBeNull();
  });

  it('formats existing database values without timezone or date conversion', () => {
    expect(formatDatabaseTime('00:00:00')).toBe('12:00 AM');
    expect(formatDatabaseTime('09:07:00.123456')).toBe('9:07 AM');
    expect(formatDatabaseTime('12:30:00')).toBe('12:30 PM');
    expect(formatDatabaseTime('23:59:00')).toBe('11:59 PM');
    expect(formatDatabaseTime('bad')).toBe('Time unavailable');
  });

  it('uses America/Los_Angeles daylight-saving semantics, not a fixed offset', () => {
    expect(currentPacificTime(new Date('2026-01-15T20:30:00Z'))).toEqual({ hour: '12', minute: '30', period: 'PM' });
    expect(currentPacificTime(new Date('2026-07-15T19:30:00Z'))).toEqual({ hour: '12', minute: '30', period: 'PM' });
  });
});
