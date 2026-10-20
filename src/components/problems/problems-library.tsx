"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BookOpenText, ScanSearch, WandSparkles } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { EASE_OUT, Reveal } from "@/components/motion/reveal";
import { formatNumber } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/language-context";
import { PROBLEMS, type GardenProblem, type ProblemCategory } from "@/lib/problems/data";
import { SEVERITY_TONE } from "./severity";

const CATEGORIES: ProblemCategory[] = ["health", "water", "pests", "environment", "space"];

/** Grid of common gardening problems with topic filters; each card opens its detail page. */
export function ProblemsLibrary() {
  const { t, lang } = useLanguage();
  const p = t.problems;
  const [category, setCategory] = useState<ProblemCategory | "all">("all");
  const visible = category === "all" ? PROBLEMS : PROBLEMS.filter((problem) => problem.category === category);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader title={(t) => t.appNav.problems} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-12">
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-moss via-cream to-paper px-6 py-10 ring-1 ring-line sm:px-10 sm:py-14">
          <span aria-hidden className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-sprout/60 blur-3xl" />
          <span aria-hidden className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-lime/20 blur-3xl" />
          <motion.div className="relative max-w-2xl" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_OUT }}>
            <p className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-leaf">
              <BookOpenText className="h-4 w-4" /> {p.eyebrow}
            </p>
            <h1 className="mt-3 font-display text-3xl leading-tight text-ink text-balance sm:text-5xl">{p.title}</h1>
            <p className="mt-4 text-ink-soft text-pretty sm:text-lg">{p.subtitle}</p>
          </motion.div>
        </section>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label={p.filterLabel} className="-mx-1 flex flex-wrap gap-2 px-1">
            {(["all", ...CATEGORIES] as const).map((key) => {
              const active = key === category;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  aria-pressed={active}
                  className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? "text-paper" : "bg-white text-ink-soft ring-1 ring-line hover:bg-moss hover:text-forest"}`}
                >
                  {active && <motion.span layoutId="problem-filter" aria-hidden className="absolute inset-0 rounded-full bg-forest" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                  <span className="relative">{key === "all" ? p.all : p.categories[key]}</span>
                </button>
              );
            })}
          </div>
          <p className="text-sm text-ink-faint" aria-live="polite">
            {p.count(formatNumber(visible.length, lang))}
          </p>
        </div>

        <motion.ul layout className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((problem, index) => (
              <motion.li
                key={problem.slug}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "0px 0px -8% 0px" }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                transition={{ duration: 0.55, ease: EASE_OUT, delay: (index % 3) * 0.07 }}
              >
                <ProblemCard problem={problem} priority={index < 3} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>

        <Reveal className="mt-14">
          <section className="grid gap-4 rounded-[28px] bg-forest p-6 text-paper shadow-lift sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="font-display text-2xl">{p.analyzeTitle}</h2>
              <p className="mt-2 max-w-xl text-paper/80">{p.analyzeBody}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/analyze" className="inline-flex items-center justify-center gap-2 rounded-full bg-paper px-5 py-2.5 font-semibold text-forest transition-transform hover:-translate-y-0.5">
                <ScanSearch className="h-4 w-4" /> {p.analyzeCta}
              </Link>
              <Link href="/designer" className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-semibold text-paper ring-1 ring-paper/40 transition-colors hover:bg-paper/10">
                <WandSparkles className="h-4 w-4" /> {p.designerCta}
              </Link>
            </div>
          </section>
        </Reveal>
      </main>
    </div>
  );
}

export function ProblemCard({ problem, priority = false, compact = false }: { problem: GardenProblem; priority?: boolean; compact?: boolean }) {
  const { t, lang } = useLanguage();
  const content = problem.content[lang];
  return (
    <Link
      href={`/problems/${problem.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-soft ring-1 ring-line transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-lift focus-visible:-translate-y-1"
    >
      <div className={`relative overflow-hidden bg-moss ${compact ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
        <Image
          src={problem.image.src}
          alt={problem.image.alt[lang]}
          fill
          priority={priority}
          sizes={compact ? "(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-canopy/55 via-canopy/0 to-canopy/0 opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="absolute top-3 left-3 rounded-full bg-paper/90 px-3 py-1 text-xs font-semibold text-forest backdrop-blur">{t.problems.categories[problem.category]}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        {!compact && (
          <span className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_TONE[problem.severity]}`}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            {t.problems.severity[problem.severity]}
          </span>
        )}
        <h3 className={`font-display text-xl leading-snug text-ink ${compact ? "" : "mt-2"}`}>{content.title}</h3>
        {!compact && <p className="mt-2 flex-1 text-sm text-ink-soft">{content.summary}</p>}
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-forest">
          {t.problems.readMore}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
