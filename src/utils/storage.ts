// Format date for display
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

// Get YYYY-MM-DD string
export function toDateKey(date: Date): string {
  // Use local date to avoid UTC timezone shift
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get Monday and Sunday date keys for the current week.
 * Week starts on Monday (ISO 8601).
 */
export function getCurrentWeekRange(): { mondayKey: string; sundayKey: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { mondayKey: toDateKey(monday), sundayKey: toDateKey(sunday) };
}
