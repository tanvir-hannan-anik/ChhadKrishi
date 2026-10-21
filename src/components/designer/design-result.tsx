"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  AlertTriangle,
  BookOpenText,
  CalendarCheck,
  Download,
  Hammer,
  ImagePlus,
  LayoutGrid,
  Lightbulb,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Sprout,
  Sun,
  Wallet,
} from "lucide-react";
import { Reveal, StaggerGroup, staggerItem } from "@/components/motion/reveal";
import type { AiErrorCode } from "@/lib/ai/errors";
import type { DesignPlan, PlanEvidence, Requirements } from "@/lib/designer/schema";
import type { Lang } from "@/lib/i18n/dictionary";
import { formatNumber } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/language-context";
import { BeforeAfter } from "./before-after";
import { formatTaka } from "./client";
import { GeneratingSteps, RenderingPreview } from "./generating";

export type RenderState = { status: "loading" } | { status: "done"; url: string; test: boolean } | { status: "error"; code: AiErrorCode };

interface ResultProps {
  plan: DesignPlan;
  requirements: Requirements;
  photoUrl: string;
  render: RenderState;
  onRetryRender: () => void;
  onCancelRender: () => void;
  onEdit: () => void;
  onAsk: () => void;
  onReset: () => void;
}

const SUN_TONE = { full: "bg-[#fbe7b4] text-[#7a5a12]", partial: "bg-sprout/70 text-forest", shade: "bg-moss text-ink-soft" } as const;
const BAR_COLORS = ["bg-forest", "bg-leaf", "bg-lime", "bg-[#a9cf6f]", "bg-sprout", "bg-clay/70"];

/** The finished design: the rendered image beside the plan, plants, budget and build guide. */
export function DesignResult({ plan, requirements, photoUrl, render, onRetryRender, onCancelRender, onEdit, onAsk, onReset }: ResultProps) {
  const { t, lang } = useLanguage();
  const r = t.designer.result;
  const g = t.designer.generating;
  const total = Math.max(plan.budget.totalBdt, 1);
  const breakdownTotal = plan.budget.breakdown.reduce((sum, b) => sum + Math.max(b.amountBdt, 0), 0) || 1;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-8">
        <div>
          {render.status === "loading" && (
            <div className="space-y-4">
              <RenderingPreview src={photoUrl} alt={plan.title} />
              <GeneratingSteps title={g.renderTitle} steps={g.renderSteps} note={g.slowNote} onCancel={onCancelRender} interval={9000} />
            </div>
          )}
          {render.status === "done" && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
              <BeforeAfter before={photoUrl} after={render.url} alt={plan.title} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-ink-faint">{render.test ? r.testRender : r.dragHint}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={onRetryRender} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-forest ring-1 ring-line hover:bg-moss">
                    <RefreshCw className="h-4 w-4" /> {r.regenerate}
                  </button>
                  <a href={render.url} download="chhadkrishi-garden-design.png" className="inline-flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-2 text-sm font-semibold text-paper shadow-soft hover:bg-canopy">
                    <Download className="h-4 w-4" /> {r.download}
                  </a>
                </div>
              </div>
            </motion.div>
          )}
          {render.status === "error" && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[28px] bg-ink shadow-soft">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                <img src={photoUrl} alt={r.before} className="block w-full opacity-60" />
              </div>
              <div role="alert" className="rounded-3xl bg-clay/10 p-5">
                <p className="flex items-center gap-2 font-semibold text-clay">
                  <AlertTriangle className="h-5 w-5" /> {r.imageFailedTitle}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {t.aiErrors[render.code]} {r.imageFailedBody}
                </p>
                {render.code !== "AI_NOT_CONFIGURED" && render.code !== "UNAUTHORIZED" && (
                  <button type="button" onClick={onRetryRender} className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-forest ring-1 ring-line hover:bg-moss">
                    <RotateCcw className="h-4 w-4" /> {r.retryImage}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <Reveal>
          <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line">
            <p className="text-sm font-semibold text-leaf">{r.eyebrow}</p>
            <h2 className="mt-1 font-display text-3xl leading-tight text-ink text-balance">{plan.title}</h2>
            <h3 className="mt-5 text-sm font-semibold text-ink">{r.concept}</h3>
            <p className="mt-1 text-ink-soft">{plan.concept}</p>

            <BudgetSummary plan={plan} requirements={requirements} />

            <div className="mt-6 flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <button type="button" onClick={onAsk} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-forest px-4 py-2.5 font-semibold text-paper shadow-soft hover:bg-canopy">
                <MessageCircle className="h-4 w-4" /> {r.askInChat}
              </button>
              <button type="button" onClick={onEdit} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 font-semibold text-forest ring-1 ring-line hover:bg-moss">
                <SlidersHorizontal className="h-4 w-4" /> {r.editRequirements}
              </button>
            </div>
          </section>
        </Reveal>
      </div>

      {plan.layout.length > 0 && (
        <section>
          <SectionTitle icon={<LayoutGrid className="h-5 w-5" />} title={r.layout} />
          <StaggerGroup className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plan.layout.map((zone, i) => (
              <motion.div key={`${zone.zone}-${i}`} variants={staggerItem} className="rounded-3xl bg-cream p-5 ring-1 ring-line">
                <p className="text-xs font-semibold tracking-wide text-leaf uppercase">{zone.placement}</p>
                <h4 className="mt-1 font-semibold text-ink">{zone.zone}</h4>
                <p className="mt-1 text-sm text-ink-soft">{zone.items}</p>
              </motion.div>
            ))}
          </StaggerGroup>
        </section>
      )}

      <section>
        <SectionTitle icon={<Sprout className="h-5 w-5" />} title={r.plants} />
        <StaggerGroup as="ul" className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plan.plants.map((plant, i) => (
            <motion.li
              key={`${plant.name}-${i}`}
              variants={staggerItem}
              className="group flex flex-col rounded-3xl bg-white p-5 shadow-soft ring-1 ring-line transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-semibold text-ink">{plant.name}</h4>
                  {plant.localName && plant.localName !== plant.name && <p className="text-sm text-ink-faint">{plant.localName}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-moss px-2.5 py-0.5 text-sm font-semibold text-forest">{r.qty(formatNumber(plant.quantity, lang))}</span>
              </div>
              <p className="mt-2 flex-1 text-sm text-ink-soft">{plant.why}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${SUN_TONE[plant.sunlight]}`}>
                  <Sun className="h-3 w-3" /> {t.designer.values.sunlight[plant.sunlight]}
                </span>
                <span className="rounded-full bg-cream px-2.5 py-1 text-ink-soft ring-1 ring-line">{plant.potSize}</span>
                <span className="rounded-full bg-cream px-2.5 py-1 text-ink-soft ring-1 ring-line">{t.designer.values.care[plant.care]}</span>
              </div>
              <PlantBasis evidence={plan.evidence} index={i} lang={lang} />
              <p className="mt-3 text-sm font-semibold text-forest">{formatTaka(plant.estCostBdt, lang)}</p>
            </motion.li>
          ))}
        </StaggerGroup>
      </section>

      {plan.evidence && <EvidencePanel evidence={plan.evidence} lang={lang} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Reveal>
          <section className="h-full rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line">
            <SectionTitle icon={<Wallet className="h-5 w-5" />} title={r.budget} />
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-moss" aria-hidden>
              {plan.budget.breakdown.map((b, i) => (
                <motion.span
                  key={b.category}
                  className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(Math.max(b.amountBdt, 0) / breakdownTotal) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: i * 0.08 }}
                />
              ))}
            </div>
            <ul className="mt-4 space-y-2">
              {plan.budget.breakdown.map((b, i) => (
                <li key={b.category} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-ink-soft">
                    <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`} /> {b.category}
                  </span>
                  <span className="font-semibold text-ink">
                    {formatTaka(b.amountBdt, lang)} <span className="font-normal text-ink-faint">({formatNumber(Math.round((b.amountBdt / total) * 100), lang)}%)</span>
                  </span>
                </li>
              ))}
            </ul>
            {plan.materials.length > 0 && (
              <>
                <h4 className="mt-6 text-sm font-semibold text-ink">{r.materials}</h4>
                <ul className="mt-2 divide-y divide-line text-sm">
                  {plan.materials.map((m, i) => (
                    <li key={`${m.item}-${i}`} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-ink-soft">
                        {m.item} <span className="text-ink-faint">· {m.quantity}</span>
                      </span>
                      <span className="shrink-0 text-ink">{formatTaka(m.estCostBdt, lang)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {plan.budget.note && <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-ink-soft">{plan.budget.note}</p>}
          </section>
        </Reveal>

        <Reveal delay={0.08}>
          <section className="h-full rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line">
            <SectionTitle icon={<Hammer className="h-5 w-5" />} title={r.steps} />
            <ol className="relative mt-5 space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-0.5 before:bg-moss">
              {plan.steps.map((step, i) => (
                <li key={`${step.title}-${i}`} className="relative flex gap-3">
                  <span className="relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-sm font-semibold text-paper ring-4 ring-white">
                    {formatNumber(i + 1, lang)}
                  </span>
                  <div className="pt-0.5">
                    <h4 className="font-semibold text-ink">{step.title}</h4>
                    <p className="mt-0.5 text-sm text-ink-soft">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </Reveal>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {plan.maintenance.length > 0 && (
          <Reveal>
            <section className="h-full rounded-3xl bg-cream p-6 ring-1 ring-line">
              <SectionTitle icon={<CalendarCheck className="h-5 w-5" />} title={r.maintenance} />
              <ul className="mt-4 space-y-2.5">
                {plan.maintenance.map((m, i) => (
                  <li key={`${m.task}-${i}`} className="flex gap-3 text-sm">
                    <span className="w-24 shrink-0 rounded-full bg-white px-2.5 py-1 text-center text-xs font-semibold text-forest ring-1 ring-line">{m.frequency}</span>
                    <span className="pt-0.5 text-ink-soft">{m.task}</span>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        )}
        {plan.tips.length > 0 && (
          <Reveal delay={0.08}>
            <section className="h-full rounded-3xl bg-sprout/40 p-6 ring-1 ring-line">
              <SectionTitle icon={<Lightbulb className="h-5 w-5" />} title={r.tips} />
              <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-ink-soft marker:text-leaf">
                {plan.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
              <Link href="/problems" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline">
                <BookOpenText className="h-4 w-4" /> {r.learnProblems}
              </Link>
            </section>
          </Reveal>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <button type="button" onClick={onReset} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-forest ring-1 ring-line hover:bg-moss">
          <ImagePlus className="h-4 w-4" /> {r.startOver}
        </button>
        <p className="max-w-2xl text-xs text-ink-faint">{r.disclaimer}</p>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h3 className="flex items-center gap-2.5 font-display text-xl text-ink">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-moss text-forest">{icon}</span>
      {title}
    </h3>
  );
}

function BudgetSummary({ plan, requirements }: { plan: DesignPlan; requirements: Requirements }) {
  const { t, lang } = useLanguage();
  const r = t.designer.result;
  const fits = plan.budget.fitsBudget && (requirements.budgetBdt === null || plan.budget.totalBdt <= requirements.budgetBdt * 1.05);
  return (
    <div className="mt-5 flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-cream p-4 ring-1 ring-line">
      <div>
        <p className="text-xs text-ink-faint">{r.budget}</p>
        <p className="font-display text-2xl text-forest">{formatTaka(plan.budget.totalBdt, lang)}</p>
        {requirements.budgetBdt !== null && <p className="text-xs text-ink-faint">{r.yourBudget(formatTaka(requirements.budgetBdt, lang))}</p>}
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${fits ? "bg-sprout/70 text-forest" : "bg-clay/15 text-clay"}`}>{fits ? r.fitsBudget : r.overBudget}</span>
    </div>
  );
}

const EVIDENCE_TEXT = {
  bn: {
    title: "গাছ বাছাইয়ের প্রমাণ (Encyclopedia of Agriculture and Food Systems)",
    evidence: "বইয়ের প্রমাণে সমর্থিত",
    choice: "আপনার পছন্দ — বইয়ে যাচাই হয়নি",
    none: "এই জায়গা ও অবস্থার জন্য বইয়ে গাছ বাছাইয়ের প্রমাণ পাওয়া যায়নি; তাই শুধু আপনার পছন্দের গাছ রাখা হয়েছে।",
    removed: "প্রমাণ না থাকায় বাদ দেওয়া হয়েছে",
    constraints: "প্রমাণভিত্তিক নকশার শর্ত",
    limits: "সীমাবদ্ধতা",
  },
  en: {
    title: "Evidence behind the plant choices (Encyclopedia of Agriculture and Food Systems)",
    evidence: "Supported by the book",
    choice: "Your choice — not verified in the book",
    none: "The book has no plant-selection evidence for this space and conditions, so only your chosen plants are used.",
    removed: "Removed for lack of evidence",
    constraints: "Evidence-based design constraints",
    limits: "Limits of the evidence",
  },
} as const;

function PlantBasis({ evidence, index, lang }: { evidence?: PlanEvidence; index: number; lang: Lang }) {
  const entry = evidence?.plants[index];
  if (!entry) return null;
  const e = EVIDENCE_TEXT[lang];
  return entry.basis === "evidence" ? (
    <p className="mt-2 text-xs font-medium text-leaf">
      📖 {e.evidence} {entry.citations.map((n) => `[${n}]`).join("")}
    </p>
  ) : (
    <p className="mt-2 text-xs text-ink-faint">{e.choice}</p>
  );
}

function EvidencePanel({ evidence, lang }: { evidence: PlanEvidence; lang: Lang }) {
  const e = EVIDENCE_TEXT[lang];
  return (
    <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line">
      <SectionTitle icon={<BookOpenText className="h-5 w-5" />} title={e.title} />
      {evidence.status === "no_evidence" && <p className="mt-3 text-sm text-clay">{e.none}</p>}
      {evidence.constraints && (
        <>
          <h4 className="mt-4 text-sm font-semibold text-ink">{e.constraints}</h4>
          <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{evidence.constraints}</p>
        </>
      )}
      {evidence.removedPlants.length > 0 && (
        <p className="mt-3 text-xs text-ink-faint">
          {e.removed}: {evidence.removedPlants.join(", ")}
        </p>
      )}
      {evidence.uncertainty && (
        <p className="mt-3 text-xs text-ink-faint">
          <span className="font-semibold">{e.limits}:</span> {evidence.uncertainty}
        </p>
      )}
      {evidence.citations.length > 0 && (
        <ol className="mt-4 space-y-1.5 text-xs text-ink-soft">
          {evidence.citations.map((c) => (
            <li key={c.n} className="flex gap-2">
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-moss px-1 text-[10px] font-bold text-forest">{c.n}</span>
              <span className="min-w-0">
                <span className="font-medium text-ink">{c.article}</span> · {c.section} · <span className="font-medium text-leaf">{c.pageRef}</span>
                {c.quote && <span className="mt-0.5 block italic text-ink-faint">“{c.quote}”</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
