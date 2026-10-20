"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { AlertCircle, ArrowLeft, CheckCircle2, ExternalLink, Eye, ScanSearch, Search, ShieldCheck, WandSparkles } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { EASE_OUT, Reveal, StaggerGroup, staggerItem } from "@/components/motion/reveal";
import { formatNumber } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/language-context";
import { getProblem, type GardenProblem } from "@/lib/problems/data";
import { ProblemCard } from "./problems-library";
import { SEVERITY_TONE } from "./severity";

/** Full explanation of one problem: overview, signs, causes, prevention and a step-by-step fix. */
export function ProblemDetail({ problem }: { problem: GardenProblem }) {
  const { t, lang } = useLanguage();
  const p = t.problems;
  const c = problem.content[lang];
  const related = problem.related.map(getProblem).filter((x): x is GardenProblem => Boolean(x));
  const sections = [
    { id: "signs", label: p.signs },
    { id: "causes", label: p.causes },
    { id: "prevention", label: p.prevention },
    { id: "solution", label: p.solution },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader title={(t) => t.appNav.problems} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-10">
        <Link href="/problems" className="group inline-flex items-center gap-1.5 rounded-full px-1 py-1 text-sm font-semibold text-forest hover:underline">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> {p.back}
        </Link>

        <article>
          <header className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center lg:gap-10">
            <motion.figure
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
              className="overflow-hidden rounded-[28px] bg-moss shadow-lift ring-1 ring-line"
            >
              <div className="relative aspect-[4/3]">
                <Image src={problem.image.src} alt={problem.image.alt[lang]} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
              </div>
              <figcaption className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 bg-white px-4 py-2 text-xs text-ink-faint">
                <span>{p.photoBy(problem.image.credit.author)}</span>
                <span aria-hidden>·</span>
                <a href={problem.image.credit.licenseUrl} target="_blank" rel="noreferrer license" className="hover:text-forest hover:underline">
                  {problem.image.credit.license}
                </a>
                <span aria-hidden>·</span>
                <a href={problem.image.credit.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-forest hover:underline">
                  Wikimedia Commons <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </figcaption>
            </motion.figure>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-moss px-3 py-1 text-forest">{p.categories[problem.category]}</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${SEVERITY_TONE[problem.severity]}`}>
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" /> {p.severity[problem.severity]}
                </span>
              </div>
              <h1 className="mt-3 font-display text-3xl leading-tight text-ink text-balance sm:text-5xl">{c.title}</h1>
              <p className="mt-3 text-lg text-ink-soft text-pretty">{c.summary}</p>
              <nav aria-label={p.overview} className="mt-6 flex flex-wrap gap-2">
                {sections.map((s) => (
                  <a key={s.id} href={`#${s.id}`} className="rounded-full bg-white px-3.5 py-1.5 text-sm text-ink-soft ring-1 ring-line transition-colors hover:bg-moss hover:text-forest">
                    {s.label}
                  </a>
                ))}
              </nav>
            </motion.div>
          </header>

          <div className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-10">
            <div className="space-y-6">
              <Reveal>
                <section className="rounded-3xl bg-cream p-6 ring-1 ring-line sm:p-7">
                  <h2 className="font-display text-2xl text-ink">{p.overview}</h2>
                  <p className="mt-3 text-ink-soft">{c.overview}</p>
                </section>
              </Reveal>

              <div className="grid gap-6 md:grid-cols-2">
                <ListSection id="signs" title={p.signs} items={c.signs} icon={<Eye className="h-5 w-5" />} tone="bg-white" marker={<Search className="mt-1 h-4 w-4 shrink-0 text-leaf" />} />
                <ListSection id="causes" title={p.causes} items={c.causes} icon={<AlertCircle className="h-5 w-5" />} tone="bg-white" marker={<span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />} />
              </div>

              <ListSection
                id="prevention"
                title={p.prevention}
                items={c.prevention}
                icon={<ShieldCheck className="h-5 w-5" />}
                tone="bg-sprout/40"
                marker={<CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-leaf" />}
                columns
              />

              <Reveal>
                <section id="solution" className="scroll-mt-24 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line sm:p-7">
                  <h2 className="font-display text-2xl text-ink">{p.solution}</h2>
                  <StaggerGroup as="ol" className="relative mt-6 space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-0.5 before:bg-moss">
                    {c.steps.map((step, i) => (
                      <motion.li key={step.title} variants={staggerItem} className="relative flex gap-4">
                        <span className="relative z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest font-semibold text-paper shadow-soft ring-4 ring-white">
                          {formatNumber(i + 1, lang)}
                        </span>
                        <div className="pt-1">
                          <p className="text-xs font-semibold tracking-wide text-leaf uppercase">{p.stepLabel(formatNumber(i + 1, lang))}</p>
                          <h3 className="font-semibold text-ink">{step.title}</h3>
                          <p className="mt-1 text-ink-soft">{step.detail}</p>
                        </div>
                      </motion.li>
                    ))}
                  </StaggerGroup>
                </section>
              </Reveal>
            </div>

            <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
              <Reveal>
                <div className="rounded-3xl bg-forest p-6 text-paper shadow-lift">
                  <ScanSearch className="h-7 w-7 text-lime" aria-hidden />
                  <h2 className="mt-3 font-display text-xl">{p.analyzeTitle}</h2>
                  <p className="mt-2 text-sm text-paper/80">{p.analyzeBody}</p>
                  <Link href="/analyze" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-paper px-4 py-2.5 font-semibold text-forest transition-transform hover:-translate-y-0.5">
                    {p.analyzeCta}
                  </Link>
                  <Link href="/designer" className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-paper ring-1 ring-paper/30 transition-colors hover:bg-paper/10">
                    <WandSparkles className="h-4 w-4" /> {p.designerCta}
                  </Link>
                </div>
              </Reveal>
            </aside>
          </div>
        </article>

        {related.length > 0 && (
          <section className="mt-14" aria-labelledby="related-heading">
            <Reveal>
              <h2 id="related-heading" className="font-display text-2xl text-ink">
                {p.related}
              </h2>
            </Reveal>
            <StaggerGroup as="ul" className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <motion.li key={item.slug} variants={staggerItem}>
                  <ProblemCard problem={item} compact />
                </motion.li>
              ))}
            </StaggerGroup>
          </section>
        )}
      </main>
    </div>
  );
}

function ListSection({
  id,
  title,
  items,
  icon,
  marker,
  tone,
  columns = false,
}: {
  id: string;
  title: string;
  items: string[];
  icon: React.ReactNode;
  marker: React.ReactNode;
  tone: string;
  columns?: boolean;
}) {
  return (
    <Reveal>
      <section id={id} className={`h-full scroll-mt-24 rounded-3xl p-6 shadow-soft ring-1 ring-line sm:p-7 ${tone}`}>
        <h2 className="flex items-center gap-2.5 font-display text-2xl text-ink">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-moss text-forest">{icon}</span>
          {title}
        </h2>
        <ul className={`mt-4 gap-x-6 gap-y-2.5 ${columns ? "grid sm:grid-cols-2" : "space-y-2.5"}`}>
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-ink-soft">
              {marker}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </Reveal>
  );
}
