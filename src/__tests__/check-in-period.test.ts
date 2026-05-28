import {
  dailyLogPeriodToPeriodStatus,
  periodStatusToPeriodLogFlow,
  periodStatusToDailyLogPeriod,
} from '../constants/check-in';

describe('check-in period persistence mapping', () => {
  it('stores the UI "on" period state as a DB-valid flow value', () => {
    expect(periodStatusToDailyLogPeriod('on')).toBe('medium');
  });

  it('clears daily_logs period when the UI period state is off', () => {
    expect(periodStatusToDailyLogPeriod('off')).toBeNull();
  });

  it('keeps spotting as the DB-compatible spotting value', () => {
    expect(periodStatusToDailyLogPeriod('spotting')).toBe('spotting');
  });

  it('maps UI period states to synced period log flow values', () => {
    expect(periodStatusToPeriodLogFlow('on')).toBe('medium');
    expect(periodStatusToPeriodLogFlow('spotting')).toBe('spotting');
    expect(periodStatusToPeriodLogFlow('off')).toBeNull();
  });

  it('maps historical daily_log flow values back to the compact UI states', () => {
    expect(dailyLogPeriodToPeriodStatus('medium')).toBe('on');
    expect(dailyLogPeriodToPeriodStatus('light')).toBe('on');
    expect(dailyLogPeriodToPeriodStatus('heavy')).toBe('on');
    expect(dailyLogPeriodToPeriodStatus('spotting')).toBe('spotting');
    expect(dailyLogPeriodToPeriodStatus(null)).toBe('off');
  });
});
