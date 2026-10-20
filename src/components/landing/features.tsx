"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { ArrowRight, CalendarCheck, Check, MessageCircle, Package, ScanSearch, ShoppingBasket, Sprout as SproutIcon, Wheat } from "lucide-react";
import { Leaf } from "@/components/brand";
import { EASE_OUT, Reveal, SectionHeading } from "@/components/motion/reveal";
import { useAuthGate } from "@/lib/auth/flow";
import { useLanguage } from "@/lib/i18n/language-context";
import { formatNumber, type FeatureKey, type ShopCategory } from "@/lib/i18n/dictionary";

const TABS: { key: FeatureKey; icon: typeof MessageCircle }[] = [
  { key: "chat", icon: MessageCircle },
  { key: "scan", icon: ScanSearch },
  { key: "care", icon: CalendarCheck },
  { key: "shop", icon: ShoppingBasket },
];

const DESTINATIONS = {
  chat: { href: "/chat", reason: "protected" },
  scan: { href: "/analyze", reason: "analyze" },
  care: { href: "/care", reason: "protected" },
  shop: { href: "/shop", reason: "shop" },
} as const;

export function Features() {
  const { t } = useLanguage();
  const [active, setActive] = useState<FeatureKey>("chat");
  const gate = useAuthGate();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    const delta = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!delta) return;
    event.preventDefault();
    const next = TABS[(index + delta + TABS.length) % TABS.length].key;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="features" className="relative bg-cream/70 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow={t.features.eyebrow} title={t.features.title} subtitle={t.features.subtitle} />

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
          <Reveal className="min-w-0">
            <div
              role="tablist"
              aria-orientation="vertical"
              aria-label={t.features.title}
              className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
            >
              {TABS.map(({ key, icon: Icon }, index) => {
                const selected = key === active;
                return (
                  <button
                    key={key}
                    ref={(el) => {
                      tabRefs.current[key] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`feature-tab-${key}`}
                    aria-selected={selected}
                    aria-controls="feature-panel"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(key)}
                    onKeyDown={(event) => onTabKeyDown(event, index)}
                    className={`relative flex min-w-[15rem] shrink-0 snap-start items-start gap-4 rounded-2xl p-4 text-left transition-colors lg:min-w-0 ${
                      selected ? "text-ink" : "text-ink-soft hover:bg-white/60"
                    }`}
                  >
                    {selected && (
                      <motion.span
                        layoutId="feature-tab-bg"
                        className="absolute inset-0 -z-0 rounded-2xl bg-white shadow-soft ring-1 ring-line"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span
                      className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        selected ? "bg-forest text-paper" : "bg-moss text-forest"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="relative">
                      <span className="block font-semibold text-ink">{t.features.tabs[key].title}</span>
                      <span className="mt-0.5 block text-sm leading-snug">{t.features.tabs[key].desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Reveal>

          <Reveal delay={0.1} className="min-w-0">
            <div
              id="feature-panel"
              role="tabpanel"
              aria-labelledby={`feature-tab-${active}`}
              className="relative min-h-[26rem] overflow-hidden rounded-[28px] bg-white p-5 shadow-lift ring-1 ring-line sm:p-8"
            >
              <span className="absolute top-5 right-5 z-10 rounded-full bg-moss px-2.5 py-0.5 text-xs font-semibold text-forest">
                {t.features.exampleBadge}
              </span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                  className="h-full"
                >
                  {active === "chat" && <ChatPreview />}
                  {active === "scan" && <ScanPreview />}
                  {active === "care" && <CarePreview />}
                  {active === "shop" && <ShopPreview />}
                </motion.div>
              </AnimatePresence>
              <div className="mt-6 flex justify-end border-t border-line pt-5">
                <motion.button
                  type="button"
                  onClick={() => gate({ kind: "navigate", ...DESTINATIONS[active] })}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-paper shadow-soft transition-colors hover:bg-canopy"
                >
                  {t.landingCta[active]} <ArrowRight className="h-4 w-4" />
                </motion.button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** Steps 0 → 1 → 2 on a timer once visible; reduced-motion users see the final state immediately. */
function useStagedReveal(delays: number[]) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const timers = delays.map((ms, i) => window.setTimeout(() => setStage(i + 1), ms));
    return () => timers.forEach(window.clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- delays are static per preview
  }, [inView, reduce]);

  return { ref, stage: reduce ? delays.length : stage };
}

function ChatPreview() {
  const { t } = useLanguage();
  const { ref, stage } = useStagedReveal([500, 1900]);
  const c = t.features.chat;

  return (
    <div ref={ref} className="flex min-h-[22rem] flex-col justify-end gap-4 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="ml-auto max-w-[85%]"
      >
        <p className="mb-1 text-right text-xs text-ink-faint">{c.you}</p>
        <p className="rounded-3xl rounded-br-md bg-forest px-4 py-3 text-paper">{c.question}</p>
      </motion.div>

      <div className="flex max-w-[92%] items-start gap-3">
        <span className="mt-6 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moss">
          <Leaf tone="leaf" className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="mb-1 text-xs text-ink-faint">{c.assistant}</p>
          <AnimatePresence mode="wait">
            {stage === 1 && (
              <motion.div
                key="typing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center gap-1.5 rounded-3xl rounded-tl-md bg-cream px-4 py-3.5"
                aria-label={c.typing}
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-2 w-2 rounded-full bg-leaf"
                    animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </motion.div>
            )}
            {stage >= 2 && (
              <motion.p
                key="answer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE_OUT }}
                className="rounded-3xl rounded-tl-md bg-cream px-4 py-3 text-ink"
              >
                {c.answer}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ScanPreview() {
  const { t, lang } = useLanguage();
  const { ref, stage } = useStagedReveal([2200]);
  const done = stage >= 1;
  const s = t.features.scan;

  return (
    <div ref={ref} className="grid min-h-[22rem] items-center gap-6 pt-6 sm:grid-cols-2">
      <div className="relative mx-auto aspect-square w-full max-w-[16rem] overflow-hidden rounded-3xl bg-gradient-to-br from-moss to-sprout">
        <svg viewBox="0 0 200 200" aria-hidden className="absolute inset-0 h-full w-full p-6">
          <path d="M30 175C18 105 60 35 172 22c6 92-48 153-142 153Z" fill="var(--leaf)" />
          <path d="M36 168C70 120 104 82 150 44" stroke="var(--paper)" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
          {[
            [92, 98, 9],
            [118, 76, 6],
            [74, 128, 7],
            [128, 108, 5],
          ].map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#8a5a2b" opacity="0.85" />
          ))}
        </svg>
        {/* Viewfinder corners */}
        {["top-3 left-3 border-t-2 border-l-2", "top-3 right-3 border-t-2 border-r-2", "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"].map(
          (pos) => (
            <span key={pos} aria-hidden className={`absolute h-6 w-6 rounded-sm border-paper ${pos}`} />
          ),
        )}
        {!done && (
          <span
            aria-hidden
            className="absolute inset-x-4 h-0.5 animate-scan rounded-full bg-lime shadow-[0_0_16px_4px_rgb(122_194_26/0.6)]"
          />
        )}
        <AnimatePresence>
          {done && (
            <motion.span
              aria-hidden
              initial={{ opacity: 0, scale: 1.2 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-[40%] left-[30%] h-[30%] w-[38%] rounded-xl border-2 border-dashed border-clay"
            />
          )}
        </AnimatePresence>
      </div>

      <div aria-live="polite">
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.p key="analyzing" exit={{ opacity: 0 }} className="flex items-center gap-2 text-ink-soft">
              <ScanSearch className="h-5 w-5 animate-pulse text-leaf" />
              {s.analyzing}
            </motion.p>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, ease: EASE_OUT }}>
              <p className="font-display text-2xl text-ink">{s.result}</p>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-ink-soft">
                  <span>{s.confidence}</span>
                  <span className="font-semibold text-forest">{formatNumber(92, lang)}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-moss">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-leaf to-lime"
                    initial={{ width: 0 }}
                    animate={{ width: "92%" }}
                    transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.15 }}
                  />
                </div>
              </div>
              <p className="mt-5 rounded-2xl bg-cream p-4 text-sm text-ink-soft">{s.tip}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CarePreview() {
  const { t, lang } = useLanguage();
  const c = t.features.care;
  const [done, setDone] = useState<boolean[]>(() => c.tasks.map((_, i) => i === 0));
  const count = done.filter(Boolean).length;
  const ratio = count / c.tasks.length;
  const circumference = 2 * Math.PI * 26;

  return (
    <div className="min-h-[22rem] pt-6">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden>
            <circle cx="32" cy="32" r="26" fill="none" stroke="var(--moss)" strokeWidth="6" />
            <motion.circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke="var(--leaf)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: circumference * (1 - ratio) }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-forest">
            {formatNumber(Math.round(ratio * 100), lang)}%
          </span>
        </div>
        <div>
          <p className="font-display text-2xl text-ink">{c.title}</p>
          <p className="text-sm text-ink-soft" aria-live="polite">
            {count === c.tasks.length ? c.allDone : c.progress(formatNumber(count, lang), formatNumber(c.tasks.length, lang))}
          </p>
        </div>
      </div>

      <ul className="mt-6 space-y-2.5">
        {c.tasks.map((task, i) => (
          <li key={task}>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-cream/70 px-4 py-3 transition-colors hover:bg-moss/70">
              <input
                type="checkbox"
                checked={done[i]}
                onChange={() => setDone((prev) => prev.map((v, j) => (j === i ? !v : v)))}
                className="peer sr-only"
              />
              <motion.span
                animate={done[i] ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-leaf ${
                  done[i] ? "border-leaf bg-leaf text-paper" : "border-ink-faint/40 bg-white"
                }`}
              >
                {done[i] && <Check className="h-4 w-4" strokeWidth={3} />}
              </motion.span>
              <span className={`transition-colors ${done[i] ? "text-ink-faint line-through" : "text-ink"}`}>{task}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SHOP_ICONS = { seed: SproutIcon, pot: Package, fertilizer: Wheat } as const;
const SHOP_TINTS = { seed: "bg-sprout text-forest", pot: "bg-clay/15 text-clay", fertilizer: "bg-moss text-leaf" } as const;

function ShopPreview() {
  const { t, lang } = useLanguage();
  const s = t.features.shop;
  const [filter, setFilter] = useState<ShopCategory>("all");
  const items = s.items.filter((item) => filter === "all" || item.category === filter);

  return (
    <div className="min-h-[22rem] pt-6">
      <div role="radiogroup" aria-label={t.features.tabs.shop.title} className="flex flex-wrap gap-2 pr-16">
        {(Object.keys(s.filters) as ShopCategory[]).map((key) => {
          const selected = key === filter;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setFilter(key)}
              className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selected ? "text-paper" : "text-ink-soft hover:text-forest"
              }`}
            >
              {selected && (
                <motion.span layoutId="shop-filter" className="absolute inset-0 rounded-full bg-forest" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              <span className="relative">{s.filters[key]}</span>
            </button>
          );
        })}
      </div>

      <motion.ul layout className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((item) => {
            const Icon = SHOP_ICONS[item.category];
            return (
              <motion.li
                key={item.name}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className="rounded-2xl bg-cream/70 p-3 ring-1 ring-line"
              >
                <span className={`flex aspect-[4/3] items-center justify-center rounded-xl ${SHOP_TINTS[item.category]}`}>
                  <Icon className="h-8 w-8" />
                </span>
                <p className="mt-2.5 text-sm leading-snug font-medium text-ink">{item.name}</p>
                <p className="mt-0.5 text-sm font-semibold text-forest">৳{formatNumber(item.price, lang)}</p>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ul>
      <p className="mt-5 text-xs text-ink-faint">{s.comingSoon}</p>
    </div>
  );
}
