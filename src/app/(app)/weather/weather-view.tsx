"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Droplets, Lightbulb, MapPin, RefreshCw, Sun, Sunrise, Sunset, Umbrella, Wind } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Card, secondaryButton } from "@/components/app/ui";
import { EASE_OUT } from "@/components/motion/reveal";
import { conditionLabel, formatDay, formatHour, formatTemp, formatTime, placeName } from "@/components/weather/format";
import { WeatherGlyph, WeatherScene, sceneIsDark } from "@/components/weather/weather-art";
import { formatNumber, type Lang } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/language-context";
import { useWeather } from "@/lib/weather/client";
import { comingDays, conditionOf, pastDays, seasonOf, todayOf, weatherTips, type DailyWeather, type WeatherReport } from "@/lib/weather/model";

export function WeatherView() {
  const { t } = useLanguage();
  const { status, report, retry } = useWeather();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader title={(t) => t.appNav.weather} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 sm:py-10">
        {!report ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-[28px] bg-gradient-to-br from-sky-100 to-moss text-center ring-1 ring-line">
            {status === "error" ? (
              <>
                <p className="text-ink-soft">{t.weather.unavailable}</p>
                <button type="button" onClick={retry} className={secondaryButton}>
                  <RefreshCw className="h-4 w-4" /> {t.weather.retry}
                </button>
              </>
            ) : (
              <p role="status" className="animate-pulse font-medium text-forest">
                {t.weather.loading}
              </p>
            )}
          </div>
        ) : (
          <Report report={report} />
        )}
      </main>
    </div>
  );
}

function Report({ report }: { report: WeatherReport }) {
  const { t, lang } = useLanguage();
  const w = t.weather;
  const c = report.current;
  const condition = conditionOf(c.code);
  const season = seasonOf(report.today);
  const today = todayOf(report);
  const tips = weatherTips(report);
  const past = pastDays(report);
  const coming = comingDays(report).slice(0, 7);
  const dark = sceneIsDark(condition, c.isDay);
  const pill = dark ? "bg-white/15 ring-white/20" : "bg-white/70 ring-white/60";
  const rainyDays = past.filter((day) => day.rain >= 1).length;
  const pastRain = past.reduce((sum, day) => sum + day.rain, 0);

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        aria-label={w.now}
        className={`relative isolate overflow-hidden rounded-[28px] shadow-lift ring-1 ring-line ${dark ? "text-white" : "text-ink"}`}
      >
        <WeatherScene condition={condition} isDay={c.isDay} season={season} className="-z-10" />
        <div className="flex min-h-64 flex-col justify-between gap-6 p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ring-1 backdrop-blur ${pill}`}>
              <MapPin className="h-4 w-4" /> {placeName(t, report.place)}
            </p>
            <Link href="/profile" className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 backdrop-blur hover:underline ${pill}`}>
              {report.place.isDefault ? w.setLocation : w.changeLocation}
            </Link>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="font-display text-7xl leading-none sm:text-8xl">{formatTemp(c.temperature, lang)}</p>
              <p className="mt-2 text-xl font-semibold">{conditionLabel(t, condition, c.isDay)}</p>
              <p className={dark ? "text-white/80" : "text-ink-soft"}>
                {w.feelsLike(formatNumber(Math.round(c.feelsLike), lang))}
                {today && ` · ${w.high} ${formatTemp(today.max, lang)} · ${w.low} ${formatTemp(today.min, lang)}`}
              </p>
            </div>
            <div className={`rounded-2xl px-4 py-3 ring-1 backdrop-blur ${pill}`}>
              <p className="text-xs opacity-80">{w.seasonLabel}</p>
              <p className="font-display text-xl">{w.seasons[season].name}</p>
              <p className="text-xs opacity-80">{w.seasons[season].months}</p>
            </div>
          </div>
        </div>
      </motion.section>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric icon={<Droplets className="h-4 w-4" />} label={w.humidity} value={`${formatNumber(c.humidity, lang)}%`} />
        <Metric icon={<Wind className="h-4 w-4" />} label={w.wind} value={w.kmh(formatNumber(Math.round(c.windSpeed), lang))} />
        <Metric icon={<Umbrella className="h-4 w-4" />} label={w.rainToday} value={w.mm(formatNumber(Math.round((today?.rain ?? 0) * 10) / 10, lang))} />
        <Metric icon={<Sun className="h-4 w-4" />} label={w.uv} value={today?.uvMax != null ? formatNumber(Math.round(today.uvMax), lang) : "—"} />
        <Metric icon={<Sunrise className="h-4 w-4" />} label={w.sunrise} value={today ? formatTime(today.sunrise, lang) : "—"} />
        <Metric icon={<Sunset className="h-4 w-4" />} label={w.sunset} value={today ? formatTime(today.sunset, lang) : "—"} />
      </ul>

      <Card title={w.tipsTitle} className="bg-gradient-to-br from-white to-cream">
        <ul className="space-y-2">
          {tips.map((tip) => (
            <li key={tip.key} className="flex items-start gap-2.5 rounded-2xl bg-white px-4 py-3 text-sm text-ink ring-1 ring-line">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-clay" /> {w.tips[tip.key](formatNumber(tip.value ?? 0, lang))}
            </li>
          ))}
          <li className="flex items-start gap-2.5 rounded-2xl bg-moss/60 px-4 py-3 text-sm text-forest">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>{w.seasons[season].name}:</strong> {w.seasons[season].desc} {w.seasonTips[season]}
            </span>
          </li>
        </ul>
      </Card>

      <Card title={w.next24}>
        {/* Every third hour: eight slots that fit any screen without sideways scrolling. */}
        <ol className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {report.hourly
            .filter((_, i) => i % 3 === 0)
            .map((hour) => (
              <li key={hour.time} className="flex flex-col items-center gap-1 rounded-2xl bg-cream/70 px-1 py-3 text-center">
                <span className="text-xs text-ink-faint">{formatHour(hour.time, lang)}</span>
                <WeatherGlyph condition={conditionOf(hour.code)} isDay={hour.isDay} className="h-6 w-6" />
                <span className="font-semibold text-ink">{formatTemp(hour.temperature, lang)}</span>
                <span className="text-[11px] text-sky-700">{hour.rainChance != null ? w.chance(formatNumber(hour.rainChance, lang)) : ""}</span>
              </li>
            ))}
        </ol>
      </Card>

      <Card title={w.chartTitle}>
        <TrendChart days={[...past, ...coming]} today={report.today} lang={lang} />
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        <Card title={w.past7}>
          <p className="mb-3 text-sm text-ink-soft">{w.lastWeekRain(formatNumber(Math.round(pastRain * 10) / 10, lang), formatNumber(rainyDays, lang))}</p>
          <DayList days={[...past].reverse()} report={report} />
        </Card>
        <Card title={w.next7}>
          <DayList days={coming} report={report} />
        </Card>
      </div>

      <p className="text-center text-xs text-ink-faint">
        {w.updated(formatTime(c.time, lang))} · {w.source}
      </p>
    </>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <li className="rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-line">
      <p className="flex items-center gap-1.5 text-xs text-ink-faint">
        <span className="text-leaf">{icon}</span> {label}
      </p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </li>
  );
}

function DayList({ days, report }: { days: DailyWeather[]; report: WeatherReport }) {
  const { t, lang } = useLanguage();
  const w = t.weather;
  const lo = Math.min(...report.daily.map((day) => day.min));
  const hi = Math.max(...report.daily.map((day) => day.max));
  const span = Math.max(1, hi - lo);
  return (
    <ul className="divide-y divide-line">
      {days.map((day) => {
        const condition = conditionOf(day.code);
        return (
          <li key={day.date} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2.5 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto]">
            <div className="flex min-w-0 items-center gap-2">
              <WeatherGlyph condition={condition} className="h-5 w-5 shrink-0" />
              <span className={`truncate text-sm ${day.date === report.today ? "font-semibold text-forest" : "text-ink"}`}>{formatDay(day.date, report.today, lang, t)}</span>
            </div>
            <span className="text-right text-xs text-sky-700 sm:order-last">
              <Umbrella className="mr-1 inline h-3 w-3" />
              {w.mm(formatNumber(Math.round(day.rain * 10) / 10, lang))}
            </span>
            <div className="col-span-2 flex items-center gap-2 text-sm sm:col-span-1">
              <span className="w-9 text-right text-ink-faint">{formatTemp(day.min, lang)}</span>
              <span className="relative h-1.5 flex-1 rounded-full bg-moss">
                <span
                  className="absolute inset-y-0 rounded-full bg-gradient-to-r from-sky-400 via-amber-300 to-orange-500"
                  style={{ left: `${((day.min - lo) / span) * 100}%`, right: `${100 - ((day.max - lo) / span) * 100}%` }}
                />
              </span>
              <span className="w-9 font-semibold text-ink">{formatTemp(day.max, lang)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Daily highs/lows as lines and rain as bars, with today marked. Scales to any width. */
function TrendChart({ days, today, lang }: { days: DailyWeather[]; today: string; lang: Lang }) {
  const { t } = useLanguage();
  const w = t.weather;
  // A narrow drawing scales up on phones, keeping the day labels readable.
  const W = 480;
  const H = 200;
  const pad = { top: 16, bottom: 30, x: 14 };
  const lo = Math.floor(Math.min(...days.map((d) => d.min)) - 2);
  const hi = Math.ceil(Math.max(...days.map((d) => d.max)) + 2);
  const maxRain = Math.max(10, ...days.map((d) => d.rain));
  const step = (W - pad.x * 2) / Math.max(1, days.length - 1);
  const x = (i: number) => pad.x + i * step;
  const y = (temp: number) => pad.top + ((hi - temp) / (hi - lo)) * (H - pad.top - pad.bottom);
  const line = (key: "max" | "min") => days.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
  const todayIndex = days.findIndex((d) => d.date === today);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={w.chartTitle}>
        {todayIndex >= 0 && <rect x={x(todayIndex) - step / 2} y={0} width={step} height={H - pad.bottom + 6} rx={10} fill="var(--moss)" opacity={0.7} />}
        {days.map((d, i) => {
          const h = (d.rain / maxRain) * (H - pad.top - pad.bottom) * 0.6;
          return <rect key={d.date} x={x(i) - 6} y={H - pad.bottom - h} width={12} height={h} rx={3} fill="rgb(14 165 233 / 0.45)" />;
        })}
        <path d={line("max")} fill="none" stroke="var(--clay)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <path d={line("min")} fill="none" stroke="var(--leaf)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 7" />
        {days.map((d, i) => (
          <g key={d.date}>
            <circle cx={x(i)} cy={y(d.max)} r={3.5} fill="var(--clay)" />
            <circle cx={x(i)} cy={y(d.min)} r={3} fill="var(--leaf)" />
            {(i % 2 === 0 || i === todayIndex) && (
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="14" fill={i === todayIndex ? "var(--forest)" : "var(--ink-faint)"} fontWeight={i === todayIndex ? 700 : 400}>
                {i === todayIndex ? w.today : formatNumber(Number(d.date.slice(8)), lang)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-clay" /> {w.high}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded border-t-2 border-dotted border-leaf" /> {w.low}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-2 rounded-sm bg-sky-500/45" /> {w.rain}
        </span>
      </figcaption>
    </figure>
  );
}
