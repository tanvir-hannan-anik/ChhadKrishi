"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/language-context";
import { useWeather } from "@/lib/weather/client";
import { conditionOf } from "@/lib/weather/model";
import { conditionLabel, formatTemp, placeName } from "./format";
import { WeatherGlyph } from "./weather-art";

/**
 * Compact live weather in the top bar of every signed-in page except the dashboard (which has
 * the full card) and the weather page itself. Opens the weather page.
 */
export function WeatherChip() {
  const pathname = usePathname();
  const hidden = pathname === "/dashboard" || pathname.startsWith("/weather");
  const { t, lang } = useLanguage();
  const { status, report } = useWeather(!hidden);

  if (hidden) return null;
  if (!report) {
    return status === "loading" ? <span aria-hidden className="inline-block h-9 w-16 animate-pulse rounded-full bg-moss sm:w-24" /> : null;
  }

  const condition = conditionOf(report.current.code);
  const label = conditionLabel(t, condition, report.current.isDay);
  const place = placeName(t, report.place);
  return (
    <Link
      href="/weather"
      aria-label={t.weather.chipLabel(formatTemp(report.current.temperature, lang).replace("°", ""), label, place)}
      title={`${place} · ${label}`}
      className="group inline-flex h-9 animate-rise items-center gap-1.5 rounded-full bg-white/80 pr-3 pl-2 text-sm font-semibold text-ink shadow-soft ring-1 ring-line transition-colors hover:bg-moss"
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-50 transition-transform group-hover:scale-110">
        <WeatherGlyph condition={condition} isDay={report.current.isDay} className="h-4 w-4" />
      </span>
      <span>{formatTemp(report.current.temperature, lang)}</span>
      <span className="hidden max-w-28 truncate font-normal text-ink-faint md:inline">{place}</span>
    </Link>
  );
}
