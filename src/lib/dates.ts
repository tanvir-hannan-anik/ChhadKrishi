/** Calendar helpers. "Today" is always the date in Bangladesh, regardless of server timezone. */
export const APP_TIMEZONE = "Asia/Dhaka";

export function todayLocal(now = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** A task repeating every `everyDays` days from `startDate` is due on `date` when the gap divides evenly. */
export function isDueOn(task: { start_date: string; every_days: number }, date: string): boolean {
  const gap = daysBetween(task.start_date, date);
  return gap >= 0 && gap % task.every_days === 0;
}

/** Next date (on or after `from`) the task is due. */
export function nextDueDate(task: { start_date: string; every_days: number }, from: string): string {
  const gap = daysBetween(task.start_date, from);
  const offset = gap <= 0 ? -gap : (task.every_days - (gap % task.every_days)) % task.every_days;
  const next = new Date(Date.parse(`${from}T00:00:00Z`) + offset * 86_400_000);
  return next.toISOString().slice(0, 10);
}
