"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Bell, Camera, Lightbulb, RotateCcw, Sun } from "lucide-react";
import { Leaf, LogoMark } from "@/components/brand";
import { EASE_OUT, Reveal, SectionHeading } from "@/components/motion/reveal";
import { useLanguage } from "@/lib/i18n/language-context";
import { formatNumber, type Lang } from "@/lib/i18n/dictionary";

// Short labels used only inside the phone mock-ups.
const MOCK: Record<Lang, { phone: string; signup: string; plants: string[]; sun: string; ask: string; reply: string; shoot: string; tasks: string[] }> = {
  bn: {
    phone: "you@example.com",
    signup: "নিবন্ধন করুন",
    plants: ["টমেটো", "মরিচ", "লেবু", "পুদিনা", "বেগুন", "লাউ"],
    sun: "রোদ: ৬ ঘণ্টা",
    ask: "লাউ গাছে ফুল ঝরে যাচ্ছে কেন?",
    reply: "পরাগায়নের ঘাটতি হতে পারে…",
    shoot: "পাতা ফ্রেমের ভেতরে রাখুন",
    tasks: ["সকাল ৭টা · পানি", "বিকেল ৫টা · সার"],
  },
  en: {
    phone: "you@example.com",
    signup: "Sign up",
    plants: ["Tomato", "Chilli", "Lemon", "Mint", "Brinjal", "Gourd"],
    sun: "Sun: 6 hours",
    ask: "Why are my gourd flowers dropping?",
    reply: "It may be poor pollination…",
    shoot: "Keep the leaf inside the frame",
    tasks: ["7 AM · Water", "5 PM · Feed"],
  },
};

export function UserGuide() {
  const { t, lang } = useLanguage();
  const steps = t.guide.steps;
  const [[index, direction], setState] = useState<[number, number]>([0, 1]);
  const last = steps.length - 1;

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(last, next));
    if (clamped !== index) setState([clamped, clamped > index ? 1 : -1]);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") goTo(index + 1);
    if (event.key === "ArrowLeft") goTo(index - 1);
  };

  const step = steps[index];

  return (
    <section id="guide" className="relative overflow-hidden bg-cream/70 py-14 sm:py-28">
      <Leaf tone="leaf" className="pointer-events-none absolute -top-10 -left-10 w-48 opacity-[0.06]" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow={t.guide.eyebrow} title={t.guide.title} subtitle={t.guide.subtitle} />

        <Reveal className="mt-8 sm:mt-14">
          <div onKeyDown={onKeyDown} className="grid grid-cols-1 items-center gap-6 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            {/* Step list */}
            <ol className="order-2 space-y-2 lg:order-1">
              {steps.map((s, i) => {
                const active = i === index;
                const complete = i < index;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={active ? "step" : undefined}
                      className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-all sm:gap-4 sm:p-4 ${
                        active ? "bg-white shadow-soft ring-1 ring-line" : "hover:bg-white/60"
                      }`}
                    >
                      <span
                        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-lg transition-colors ${
                          active ? "bg-forest text-paper" : complete ? "bg-sprout text-forest" : "bg-moss text-ink-soft"
                        }`}
                      >
                        {formatNumber(i + 1, lang)}
                      </span>
                      <span className="min-w-0">
                        <span className={`block font-semibold ${active ? "text-ink" : "text-ink-soft"}`}>{s.title}</span>
                        <AnimatePresence initial={false}>
                          {active && (
                            <motion.span
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: EASE_OUT }}
                              className="block overflow-hidden"
                            >
                              <span className="block pt-1 text-ink-soft">{s.desc}</span>
                              <span className="mt-2 inline-flex items-center gap-1.5 text-sm text-leaf">
                                <Lightbulb className="h-4 w-4" />
                                {s.tip}
                              </span>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {/* Phone mock + controls */}
            <div className="order-1 flex flex-col items-center lg:order-2">
              <div className="relative h-[22rem] w-[13rem] rounded-[2.4rem] bg-ink p-2 shadow-lift sm:h-[29rem] sm:w-[16.5rem] sm:rounded-[2.6rem] sm:p-2.5">
                <div className="absolute top-4 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-ink" />
                <div className="relative h-full overflow-hidden rounded-[2.1rem] bg-paper">
                  <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                    <motion.div
                      key={index}
                      custom={direction}
                      variants={{
                        enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
                        center: { x: 0, opacity: 1 },
                        exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
                      }}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.4, ease: EASE_OUT }}
                      className="absolute inset-0 flex flex-col px-4 pt-10 pb-5"
                    >
                      <div className="flex items-center gap-2">
                        <LogoMark size={26} className="rounded-lg" />
                        <span className="font-display text-forest">{t.hero.brand}</span>
                      </div>
                      <p className="mt-4 font-display text-lg leading-snug text-ink">{step.title}</p>
                      <div className="mt-4 flex-1">
                        <PhoneScreen index={index} lang={lang} />
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-5 w-full max-w-xs sm:mt-7">
                <div className="flex items-center justify-between text-sm text-ink-soft">
                  <span aria-live="polite">{t.guide.stepOf(formatNumber(index + 1, lang), formatNumber(steps.length, lang))}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-moss">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-forest to-lime"
                    animate={{ width: `${((index + 1) / steps.length) * 100}%` }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <motion.button
                    type="button"
                    onClick={() => goTo(index - 1)}
                    disabled={index === 0}
                    aria-label={t.guide.prev}
                    whileTap={{ scale: 0.94 }}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-forest shadow-soft ring-1 ring-line transition-opacity disabled:opacity-40"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => (index === last ? setState([0, -1]) : goTo(index + 1))}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-forest px-5 font-semibold text-paper shadow-soft transition-colors hover:bg-canopy"
                  >
                    {index === last ? (
                      <>
                        <RotateCcw className="h-4 w-4" /> {t.guide.restart}
                      </>
                    ) : (
                      <>
                        {t.guide.next} <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PhoneScreen({ index, lang }: { index: number; lang: Lang }) {
  const m = MOCK[lang];
  switch (index) {
    case 0:
      return (
        <div className="space-y-3">
          <div className="rounded-xl bg-white px-3 py-2.5 text-sm text-ink-faint ring-1 ring-line">{m.phone}</div>
          <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-line">
            <span className="block h-2 w-24 rounded-full bg-moss" />
          </div>
          <div className="rounded-xl bg-forest py-2.5 text-center text-sm font-semibold text-paper">{m.signup}</div>
        </div>
      );
    case 1:
      return (
        <div>
          <div className="flex flex-wrap gap-1.5">
            {m.plants.map((plant, i) => (
              <span key={plant} className={`rounded-full px-2.5 py-1 text-xs ${i < 3 ? "bg-forest text-paper" : "bg-moss text-ink-soft"}`}>
                {plant}
              </span>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-white p-3 ring-1 ring-line">
            <p className="flex items-center gap-1.5 text-xs text-ink-soft">
              <Sun className="h-4 w-4 text-clay" /> {m.sun}
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-moss">
              <div className="h-full w-3/4 rounded-full bg-clay" />
            </div>
          </div>
        </div>
      );
    case 2:
      return (
        <div className="flex h-full flex-col justify-end gap-2 pb-2">
          <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-forest px-3 py-2 text-xs text-paper">{m.ask}</p>
          <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-cream px-3 py-2 text-xs text-ink">{m.reply}</p>
          <div className="mt-2 rounded-full bg-white px-3 py-2 text-xs text-ink-faint ring-1 ring-line">…</div>
        </div>
      );
    case 3:
      return (
        <div className="flex h-full flex-col items-center">
          <div className="relative flex aspect-square w-full items-center justify-center rounded-2xl bg-gradient-to-br from-moss to-sprout">
            <Leaf tone="leaf" className="w-24" />
            <span className="absolute inset-5 rounded-xl border-2 border-dashed border-paper" />
          </div>
          <p className="mt-3 text-center text-xs text-ink-soft">{m.shoot}</p>
          <span className="mt-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-forest text-paper ring-4 ring-moss">
            <Camera className="h-5 w-5" />
          </span>
        </div>
      );
    default:
      return (
        <ul className="space-y-2">
          {m.tasks.map((task) => (
            <li key={task} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs text-ink ring-1 ring-line">
              <Bell className="h-4 w-4 text-clay" /> {task}
            </li>
          ))}
          <li className="rounded-xl bg-sprout/60 px-3 py-2.5 text-xs text-forest">🌱 ✓ ✓ ✓</li>
        </ul>
      );
  }
}
