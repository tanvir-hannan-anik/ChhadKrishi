"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

/** Step list that advances on a timer while a long AI call runs; the last step spins until done. */
export function GeneratingSteps({ title, steps, note, onCancel, interval = 2600 }: { title: string; steps: string[]; note?: string; onCancel?: () => void; interval?: number }) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setIndex((i) => Math.min(i + 1, steps.length - 1)), interval);
    return () => window.clearInterval(id);
  }, [steps.length, interval]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status" className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line">
      <p className="flex items-center gap-2 font-semibold text-forest">
        <Sparkles className="h-5 w-5 animate-pulse" /> {title}
      </p>
      <ul className="mt-4 space-y-3">
        {steps.map((step, i) => (
          <li key={step} className={`flex items-center gap-3 transition-colors ${i <= index ? "text-ink" : "text-ink-faint"}`}>
            {i < index ? (
              <CheckCircle2 className="h-5 w-5 text-leaf" />
            ) : i === index ? (
              <Loader2 className="h-5 w-5 animate-spin text-leaf" />
            ) : (
              <span className="h-5 w-5 rounded-full border-2 border-moss" />
            )}
            {step}
          </li>
        ))}
      </ul>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-moss">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-leaf to-lime" initial={{ width: "4%" }} animate={{ width: `${Math.round(((index + 1) / (steps.length + 1)) * 100)}%` }} transition={{ duration: 0.8 }} />
      </div>
      {(note || onCancel) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {note && <p className="text-xs text-ink-faint">{note}</p>}
          {onCancel && (
            <button type="button" onClick={onCancel} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-ink-soft ring-1 ring-line hover:bg-moss">
              <X className="h-4 w-4" /> {t.designer.generating.cancel}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

/** The gardener's photo with a soft "painting" sweep while the design image renders. */
export function RenderingPreview({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-ink shadow-lift">
      {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
      <img src={src} alt={alt} className="block w-full brightness-90 saturate-50" />
      <motion.span
        aria-hidden
        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-sprout/45 to-transparent"
        initial={{ left: "-50%" }}
        animate={{ left: "100%" }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-forest/40 to-transparent" />
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute h-2 w-2 rounded-full bg-lime shadow-[0_0_12px_4px_rgb(122_194_26/0.6)]"
          style={{ left: `${15 + i * 17}%`, top: `${30 + ((i * 23) % 50)}%` }}
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1.2, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.35 }}
        />
      ))}
    </div>
  );
}
