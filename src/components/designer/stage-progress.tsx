"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { formatNumber } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/language-context";

export const STAGES = ["photo", "consult", "confirm", "design"] as const;
export type Stage = (typeof STAGES)[number];

/** Four-step progress indicator for the designer workflow. */
export function StageProgress({ stage }: { stage: Stage }) {
  const { t, lang } = useLanguage();
  const current = STAGES.indexOf(stage);
  return (
    <ol className="flex items-center gap-1.5 sm:gap-3" aria-label={t.designer.title}>
      {STAGES.map((key, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={key} className="flex flex-1 items-center gap-1.5 sm:gap-3" aria-current={active ? "step" : undefined}>
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={`relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300 ${
                  done ? "bg-leaf text-paper" : active ? "bg-forest text-paper" : "bg-white text-ink-faint ring-1 ring-line"
                }`}
              >
                {active && <motion.span layoutId="designer-stage-ring" aria-hidden className="absolute -inset-1 rounded-full ring-2 ring-sprout" />}
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : formatNumber(i + 1, lang)}
              </span>
              <span className={`hidden truncate text-sm sm:inline ${active ? "font-semibold text-ink" : "text-ink-soft"}`}>{t.designer.stages[key]}</span>
            </span>
            {i < STAGES.length - 1 && (
              <span aria-hidden className="h-0.5 flex-1 overflow-hidden rounded-full bg-moss">
                <motion.span className="block h-full bg-leaf" initial={false} animate={{ width: done ? "100%" : "0%" }} transition={{ duration: 0.5 }} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
