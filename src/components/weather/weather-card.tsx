"use client";

import Link from "next/link";
import { ArrowRight, Droplets, MapPin, RefreshCw, Umbrella, Wind } from "lucide-react";
import { formatNumber } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/language-context";
import { useWeather } from "@/lib/weather/client";
import { conditionOf, seasonOf, todayOf, weatherTips } from "@/lib/weather/model";
import { conditionLabel, formatTemp, placeName } from "./format";
import { WeatherScene, sceneIsDark } from "./weather-art";

/** The dashboard's live weather: an animated scene for the sky and season, with today's tip. */
export function WeatherCard() {
  const { t, lang } = useLanguage();
  const w = t.weather;
  const { status, report, retry } = useWeather();

  if (!report) {
    return (
      <section aria-label={w.title} className="relative flex h-52 items-center justify-center overflow-hidden rounded-[28px] bg-gradient-to-br from-sky-200 to-moss ring-1 ring-line">
        {status === "error" ? (
          <div className="text-center">
            <p className="text-ink-soft">{w.unavailable}</p>
            <button type="button" onClick={retry} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-forest ring-1 ring-line">
              <RefreshCw className="h-4 w-4" /> {w.retry}
            </button>
          </div>
        ) : (
          <p role="status" className="animate-pulse text-sm font-medium text-forest">
            {w.loading}
          </p>
        )}
      </section>
    );
  }

  const c = report.current;
  const condition = conditionOf(c.code);
  const season = seasonOf(report.today);
  const today = todayOf(report);
  const tip = weatherTips(report)[0];
  const dark = sceneIsDark(condition, c.isDay);
  const text = dark ? "text-white" : "text-ink";
  const soft = dark ? "text-white/80" : "text-ink-soft";
  const pill = dark ? "bg-white/15 text-white ring-white/20" : "bg-white/70 text-ink ring-white/60";

  return (
    <section aria-label={w.title} className="group relative isolate overflow-hidden rounded-[28px] shadow-lift ring-1 ring-line">
      <WeatherScene condition={condition} isDay={c.isDay} season={season} className="-z-10" />
      {/* The whole card opens the weather page; inner links sit above this overlay. */}
      <Link href="/weather" aria-label={`${w.title}: ${w.viewDetails}`} className="absolute inset-0 z-0" />

      <div className={`pointer-events-none relative z-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6 ${text}`}>
        <div className="min-w-0">
          <p className={`flex items-center gap-1.5 text-sm font-medium ${soft}`}>
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{placeName(t, report.place)}</span>
          </p>
          <div className="mt-1 flex items-end gap-3">
            <span className="font-display text-6xl leading-none sm:text-7xl">{formatTemp(c.temperature, lang)}</span>
            <div className="pb-1">
              <p className="text-lg font-semibold">{conditionLabel(t, condition, c.isDay)}</p>
              <p className={`text-sm ${soft}`}>
                {w.feelsLike(formatNumber(Math.round(c.feelsLike), lang))}
                {today && ` · ${formatTemp(today.max, lang)} / ${formatTemp(today.min, lang)}`}
              </p>
            </div>
          </div>
          <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 backdrop-blur ${pill}`}>
            {w.seasonLabel}: {w.seasons[season].name} <span className="font-normal opacity-80">· {w.seasons[season].months}</span>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:w-72">
          <Stat icon={<Droplets className="h-4 w-4" />} label={w.humidity} value={`${formatNumber(c.humidity, lang)}%`} pill={pill} />
          <Stat icon={<Wind className="h-4 w-4" />} label={w.wind} value={w.kmh(formatNumber(Math.round(c.windSpeed), lang))} pill={pill} />
          <Stat icon={<Umbrella className="h-4 w-4" />} label={w.rainToday} value={w.mm(formatNumber(Math.round((today?.rain ?? 0) * 10) / 10, lang))} pill={pill} />
        </div>
      </div>

      <div className={`relative z-10 flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-sm backdrop-blur-sm sm:px-6 ${dark ? "border-white/15 bg-black/15 text-white/90" : "border-white/50 bg-white/45 text-ink"}`}>
        <p className="pointer-events-none min-w-0 flex-1">{tip ? w.tips[tip.key](formatNumber(tip.value ?? 0, lang)) : w.seasonTips[season]}</p>
        <span className="pointer-events-none inline-flex items-center gap-1 font-semibold">
          {w.viewDetails} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
        {report.place.isDefault && (
          <Link href="/profile" className={`relative w-full text-xs underline underline-offset-2 ${dark ? "text-white/85" : "text-forest"}`}>
            {w.setLocation}
          </Link>
        )}
      </div>
    </section>
  );
}

function Stat({ icon, label, value, pill }: { icon: React.ReactNode; label: string; value: string; pill: string }) {
  return (
    <div className={`rounded-2xl px-2.5 py-2 ring-1 backdrop-blur ${pill}`}>
      <p className="flex items-center gap-1 text-[11px] opacity-80">
        {icon} <span className="truncate">{label}</span>
      </p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
