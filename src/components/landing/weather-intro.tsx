"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { ArrowRight, BellRing, Bot, CloudSunRain, LockKeyhole, MapPin } from "lucide-react";
import { Leaf } from "@/components/brand";
import { EASE_OUT, Reveal, SectionHeading, StaggerGroup, staggerItem } from "@/components/motion/reveal";
import { conditionLabel } from "@/components/weather/format";
import { WeatherGlyph, WeatherScene, sceneIsDark } from "@/components/weather/weather-art";
import { useAuthGate } from "@/lib/auth/flow";
import { formatNumber } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/language-context";
import { notificationText } from "@/lib/notifications/messages";
import type { AlertKind, Condition, Season, TipKey } from "@/lib/weather/model";

const STEP_ICONS = [MapPin, CloudSunRain, Bot, BellRing];

/** Example skies the demo cycles through — the same scenes signed-in gardeners see. */
const DEMO: { condition: Condition; isDay: boolean; season: Season; temp: number; alert: AlertKind; tip: TipKey; value: number }[] = [
  { condition: "rain", isDay: true, season: "borsha", temp: 29, alert: "heavyRain", tip: "heavyRain", value: 32 },
  { condition: "clear", isDay: true, season: "grishmo", temp: 37, alert: "heat", tip: "heat", value: 37 },
  { condition: "storm", isDay: true, season: "borsha", temp: 27, alert: "storm", tip: "storm", value: 18 },
  { condition: "clear", isDay: false, season: "boshonto", temp: 24, alert: "wind", tip: "windy", value: 42 },
];
const FRAME_MS = 4500;

/** Landing explainer: how the (signed-in) weather feature works, with a live demo card. */
export function WeatherIntro() {
  const { t, lang } = useLanguage();
  const lw = t.landingWeather;
  const gate = useAuthGate();
  const demoRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(demoRef, { amount: 0.4 });
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!inView || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setFrame((f) => (f + 1) % DEMO.length), FRAME_MS);
    return () => window.clearInterval(timer);
  }, [inView]);

  const demo = DEMO[frame];
  const dark = sceneIsDark(demo.condition, demo.isDay);
  const alert = notificationText("weather", { alert: demo.alert, value: demo.value, date: "d", today: "d", place: lw.demoPlace }, lang);

  return (
    <section id="weather" className="relative overflow-hidden py-14 sm:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_50%_at_80%_20%,rgb(14_165_233/0.10),transparent)]" />
      <Leaf tone="lime" className="pointer-events-none absolute top-10 -right-6 hidden w-24 rotate-12 opacity-30 sm:block" />
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <div>
          <SectionHeading eyebrow={lw.eyebrow} title={lw.title} subtitle={lw.subtitle} align="left" />
          <StaggerGroup as="ol" className="mt-6 space-y-2.5 sm:mt-8 sm:space-y-3">
            {lw.steps.map((step, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <motion.li key={step.title} variants={staggerItem} className="flex items-start gap-3 rounded-2xl bg-white/80 p-3.5 shadow-soft ring-1 ring-line sm:gap-4 sm:p-4">
                  <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                    <Icon className="h-5 w-5" />
                    <span className="absolute -top-1.5 -left-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-forest text-[11px] font-bold text-paper">
                      {formatNumber(i + 1, lang)}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{step.title}</span>
                    <span className="mt-0.5 block text-sm text-ink-soft">{step.desc}</span>
                  </span>
                </motion.li>
              );
            })}
          </StaggerGroup>
          <Reveal className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center">
            <motion.button
              type="button"
              onClick={() => gate({ kind: "navigate", href: "/weather", reason: "protected" })}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-forest px-6 py-3 font-semibold text-paper shadow-soft transition-colors hover:bg-canopy"
            >
              {lw.cta} <ArrowRight className="h-4 w-4" />
            </motion.button>
            <p className="inline-flex items-center justify-center gap-1.5 text-sm text-ink-faint">
              <LockKeyhole className="h-4 w-4" /> {lw.loginNote}
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div ref={demoRef} className="relative mx-auto max-w-md">
            <div className={`relative isolate h-64 overflow-hidden rounded-[28px] shadow-lift ring-1 ring-line sm:h-72 ${dark ? "text-white" : "text-ink"}`}>
              <AnimatePresence initial={false}>
                <motion.div key={frame} className="absolute inset-0 -z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}>
                  <WeatherScene condition={demo.condition} isDay={demo.isDay} season={demo.season} />
                </motion.div>
              </AnimatePresence>
              {/* Bottom padding leaves room for the sample alert overlapping the card. */}
              <div className="flex h-full flex-col justify-between p-5 pb-10">
                <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 text-sm font-medium ring-1 ring-white/40 backdrop-blur">
                  <MapPin className="h-4 w-4" /> {lw.demoPlace}
                </p>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={frame} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.4, ease: EASE_OUT }}>
                    <p className="font-display text-6xl leading-none">{formatNumber(demo.temp, lang)}°</p>
                    <p className="mt-1 text-lg font-semibold">{conditionLabel(t, demo.condition, demo.isDay)}</p>
                    <p className="mt-2 inline-flex rounded-full bg-white/25 px-3 py-1 text-xs font-semibold ring-1 ring-white/40 backdrop-blur">
                      {t.weather.seasonLabel}: {t.weather.seasons[demo.season].name} · {t.weather.seasons[demo.season].months}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* A sample alert, as it arrives on the phone. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={frame}
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.5 }}
                className="relative z-10 mx-3 -mt-7 flex items-start gap-3 rounded-2xl bg-white/95 p-3 shadow-lift ring-1 ring-line backdrop-blur sm:mx-6"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50">
                  <WeatherGlyph condition={demo.condition} isDay={demo.isDay} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm leading-snug font-semibold text-ink">{alert.title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{alert.body}</span>
                </span>
              </motion.div>
            </AnimatePresence>

            {/* What the AI would add to an answer in this weather. */}
            <div className="mx-3 mt-3 flex items-start gap-2.5 rounded-2xl rounded-tl-md bg-cream px-3.5 py-3 text-sm text-ink ring-1 ring-line sm:mx-6">
              <Bot className="mt-0.5 h-4 w-4 shrink-0 text-leaf" /> {t.weather.tips[demo.tip](formatNumber(demo.value, lang))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
