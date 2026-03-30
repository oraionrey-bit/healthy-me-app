/**
 * Utility function tests
 */
import { formatDate, toDateKey, getCurrentWeekRange } from '../utils/storage';

describe('toDateKey', () => {
  it('formats date as YYYY-MM-DD', () => {
    const date = new Date(2026, 2, 15); // March 15, 2026
    expect(toDateKey(date)).toBe('2026-03-15');
  });

  it('pads single-digit months and days', () => {
    const date = new Date(2026, 0, 5); // Jan 5, 2026
    expect(toDateKey(date)).toBe('2026-01-05');
  });
});

describe('formatDate', () => {
  it('formats date with weekday, month, and day', () => {
    const date = new Date(2026, 2, 15); // March 15, 2026 (Sunday)
    const formatted = formatDate(date);
    expect(formatted).toContain('Mar');
    expect(formatted).toContain('15');
  });
});

describe('getCurrentWeekRange', () => {
  it('returns mondayKey and sundayKey as valid date strings', () => {
    const { mondayKey, sundayKey } = getCurrentWeekRange();
    expect(mondayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(sundayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns Sunday 6 days after Monday', () => {
    const { mondayKey, sundayKey } = getCurrentWeekRange();
    const monday = new Date(mondayKey + 'T12:00:00');
    const sunday = new Date(sundayKey + 'T12:00:00');
    const diffDays = Math.round((sunday.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(6);
  });

  it('Monday is actually a Monday (day 1)', () => {
    const { mondayKey } = getCurrentWeekRange();
    const monday = new Date(mondayKey + 'T12:00:00');
    expect(monday.getDay()).toBe(1);
  });
});
