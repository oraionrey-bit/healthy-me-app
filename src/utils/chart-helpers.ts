import { Colors } from '../constants/theme';

/**
 * Shared chart label style used across all health trend charts.
 */
export const chartLabelStyle = {
  fontSize: 10,
  color: Colors.textMuted,
} as const;

/**
 * Generic weekly aggregation for chart data.
 * Groups points into chunks of 7 and averages them using a provided reducer.
 */
export function aggregateWeekly<T>(
  points: T[],
  reducer: (week: T[]) => T,
): T[] {
  const weeks: T[][] = [];
  for (let i = 0; i < points.length; i += 7) {
    weeks.push(points.slice(i, i + 7));
  }
  return weeks.map(reducer);
}
