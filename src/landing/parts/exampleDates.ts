// Example dates for the mock app screens. They are always a few days ahead of today, so the
// screenshots never look stale, and they use the app's own formats.
//
// Built from the local date. toISOString() would give the UTC date, which in India is still
// "yesterday" until 5:30 in the morning.

export function daysFromToday(days: number, today: Date = new Date()): Date {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  date.setDate(date.getDate() + days);
  return date;
}

/** "5 Dec", as on the app's ride cards. */
export function shortDate(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

/** "2026-12-05", as in the app's date field. */
export function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
