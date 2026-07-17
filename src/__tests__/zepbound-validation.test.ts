import {
  isValidDateKey,
  isValidTime,
  validateZepboundInjection,
  validateZepboundSymptom,
} from '../utils/zepbound-validation';

describe('Zepbound entry validation', () => {
  it('accepts real calendar dates and rejects malformed or impossible dates', () => {
    expect(isValidDateKey('2026-07-15')).toBe(true);
    expect(isValidDateKey('2024-02-29')).toBe(true);
    expect(isValidDateKey('2026-02-29')).toBe(false);
    expect(isValidDateKey('2026-13-01')).toBe(false);
    expect(isValidDateKey('07/15/2026')).toBe(false);
  });

  it('accepts only canonical database-boundary times', () => {
    expect(isValidTime('00:00')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('9:30')).toBe(false);
    expect(isValidTime('09:60')).toBe(false);
  });

  it('validates complete shot and symptom inputs', () => {
    expect(validateZepboundInjection({
      injectionDate: '2026-02-29',
      injectionTime: '09:30',
      doseMg: 2.5,
      injectionSite: 'abdomen',
    })).toMatch(/shot date/);

    expect(validateZepboundSymptom({
      logDate: '2026-07-15',
      symptomTime: '25:00',
      symptomType: 'Nausea',
      severity: 3,
    })).toMatch(/symptom time/);
  });
});
