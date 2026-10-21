import { formatNumber, type Dictionary, type Lang } from "@/lib/i18n/dictionary";
import type { Condition } from "@/lib/weather/model";

/** Weather times are Bangladesh local time without an offset ("2026-10-21T09:45" or a date). */
function dhaka(value: string): Date {
  return new Date(value.length === 10 ? `${value}T12:00:00+06:00` : `${value}:00+06:00`);
}

const locale = (lang: Lang) => (lang === "bn" ? "bn-BD" : "en-GB");

export function formatTime(value: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), { hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(dhaka(value));
}

export function formatHour(value: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), { hour: "numeric", timeZone: "Asia/Dhaka" }).format(dhaka(value));
}

/** "Today" / "Tomorrow" / "Yesterday", otherwise a short weekday and date. */
export function formatDay(date: string, today: string, lang: Lang, t: Dictionary): string {
  const gap = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (gap === 0) return t.weather.today;
  if (gap === 1) return t.weather.tomorrow;
  if (gap === -1) return t.weather.yesterday;
  return new Intl.DateTimeFormat(locale(lang), { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Dhaka" }).format(dhaka(date));
}

export function formatTemp(value: number, lang: Lang): string {
  return `${formatNumber(Math.round(value), lang)}°`;
}

export function conditionLabel(t: Dictionary, condition: Condition, isDay: boolean): string {
  return condition === "clear" && !isDay ? t.weather.clearNight : t.weather.conditions[condition];
}

export function placeName(t: Dictionary, place: { label: string; isDefault: boolean }): string {
  return place.label || t.weather.defaultPlace;
}
