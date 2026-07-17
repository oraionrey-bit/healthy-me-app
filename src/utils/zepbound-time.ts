export const PACIFIC_TIME_ZONE = 'America/Los_Angeles';

export type Meridiem = 'AM' | 'PM';

export interface TwelveHourTime {
  hour: string;
  minute: string;
  period: Meridiem;
}

const DATABASE_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/;

/** Returns the current Pacific civil time, independent of the device timezone. */
export function currentPacificTime(now = new Date()): TwelveHourTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';

  return {
    hour: part('hour'),
    minute: part('minute'),
    period: part('dayPeriod').toUpperCase() === 'PM' ? 'PM' : 'AM',
  };
}

/** Converts user-facing 12-hour fields to PostgreSQL's local TIME representation. */
export function toDatabaseTime(value: TwelveHourTime): string | null {
  if (!/^(?:[1-9]|1[0-2])$/.test(value.hour)) return null;
  if (!/^\d{1,2}$/.test(value.minute)) return null;

  const minute = Number(value.minute);
  if (minute < 0 || minute > 59) return null;

  const hour12 = Number(value.hour);
  const hour24 = value.period === 'AM' ? hour12 % 12 : (hour12 % 12) + 12;
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Parses an existing PostgreSQL TIME without applying a timezone or date shift. */
export function fromDatabaseTime(value: string): TwelveHourTime | null {
  const match = DATABASE_TIME_PATTERN.exec(value);
  if (!match) return null;

  const hour24 = Number(match[1]);
  return {
    hour: String(hour24 % 12 || 12),
    minute: match[2],
    period: hour24 >= 12 ? 'PM' : 'AM',
  };
}

export function formatDatabaseTime(value: string): string {
  const parsed = fromDatabaseTime(value);
  return parsed ? `${parsed.hour}:${parsed.minute} ${parsed.period}` : 'Time unavailable';
}
