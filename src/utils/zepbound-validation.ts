import type { NewZepboundInjection, NewZepboundSymptom } from '../hooks/use-zepbound';

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidDateKey(value: string): boolean {
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function validateZepboundInjection(input: NewZepboundInjection): string | null {
  if (!isValidDateKey(input.injectionDate)) return 'Enter the shot date as YYYY-MM-DD.';
  if (!isValidTime(input.injectionTime)) return 'Enter the shot time as HH:MM (24-hour time).';
  if (!Number.isFinite(input.doseMg) || input.doseMg <= 0) return 'Choose a valid dose.';
  return null;
}

export function validateZepboundSymptom(input: NewZepboundSymptom): string | null {
  if (!input.symptomType.trim()) return 'Choose a symptom.';
  if (!Number.isInteger(input.severity) || input.severity < 1 || input.severity > 5) {
    return 'Choose a severity from 1 to 5.';
  }
  if (!isValidDateKey(input.logDate)) return 'Enter the symptom date as YYYY-MM-DD.';
  if (!isValidTime(input.symptomTime)) return 'Enter the symptom time as HH:MM (24-hour time).';
  return null;
}
