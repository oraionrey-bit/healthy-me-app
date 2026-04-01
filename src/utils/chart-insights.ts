/**
 * Dynamic PCOS-relevant insights for health charts.
 * Takes data arrays and returns brief insight strings.
 */

interface DataPoint {
  value: number;
}

function avg(data: DataPoint[]): number {
  if (data.length === 0) return 0;
  return data.reduce((sum, d) => sum + d.value, 0) / data.length;
}

function trend(data: DataPoint[]): 'up' | 'down' | 'stable' {
  if (data.length < 3) return 'stable';
  const half = Math.floor(data.length / 2);
  const firstHalf = avg(data.slice(0, half));
  const secondHalf = avg(data.slice(half));
  const diff = secondHalf - firstHalf;
  const threshold = Math.abs(firstHalf) * 0.05 || 1;
  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'stable';
}

export function getSleepInsight(data: DataPoint[]): string {
  if (data.length === 0) return '';
  const average = Math.round(avg(data));
  const direction = trend(data);

  if (average >= 85) {
    return `Your sleep averaged ${average}/100 this week — great for hormone recovery! Consistent sleep supports cortisol regulation.`;
  } else if (average >= 70) {
    const trendNote =
      direction === 'up'
        ? ' and trending up!'
        : direction === 'down'
          ? ' but trending down — prioritize sleep hygiene.'
          : '.';
    return `Sleep averaging ${average}/100${trendNote} Aim for 85+ to optimize hormone balance.`;
  } else {
    return `Sleep averaging ${average}/100 — try consistent bedtimes and reducing screen time for better recovery.`;
  }
}

export function getHrvInsight(data: DataPoint[]): string {
  if (data.length === 0) return '';
  const average = Math.round(avg(data));
  const direction = trend(data);

  const trendText =
    direction === 'up'
      ? 'trending up'
      : direction === 'down'
        ? 'trending down'
        : 'stable';

  if (average >= 50) {
    return `HRV ${trendText} (avg ${average}ms) — this suggests good stress resilience and autonomic balance.`;
  } else if (average >= 30) {
    return `HRV ${trendText} (avg ${average}ms) — moderate range. Breathing exercises and sleep quality can help improve HRV.`;
  } else {
    return `HRV ${trendText} (avg ${average}ms) — lower HRV may indicate stress or fatigue. Focus on recovery and stress management.`;
  }
}

export function getTemperatureInsight(data: DataPoint[]): string {
  if (data.length === 0) return '';
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const average = avg(data);

  if (range < 0.3) {
    return `Temperature stable near baseline (${average >= 0 ? '+' : ''}${average.toFixed(2)}°) — no significant hormonal shifts detected this period.`;
  } else if (range < 0.6) {
    return `Temperature varying ${range.toFixed(2)}° — mild shifts may correlate with cycle phases. Track alongside period for patterns.`;
  } else {
    return `Temperature range of ${range.toFixed(2)}° — notable variation detected. This could indicate ovulation or hormonal changes worth monitoring.`;
  }
}

export function getWeightInsight(
  data: DataPoint[],
  unit: string,
): string {
  if (data.length < 2) return '';
  const first = data[0].value;
  const last = data[data.length - 1].value;
  const change = last - first;
  const direction = trend(data);

  const changeStr = `${change > 0 ? '+' : ''}${change.toFixed(1)} ${unit}`;

  if (Math.abs(change) < 0.5) {
    return `Weight stable (${changeStr}) — consistency is great for your health goals.`;
  } else if (direction === 'down') {
    return `Weight ${changeStr} — gradual loss supports your overall health.`;
  } else {
    return `Weight ${changeStr} — monitor alongside cycle phase. Hormonal fluctuations can cause temporary shifts.`;
  }
}
