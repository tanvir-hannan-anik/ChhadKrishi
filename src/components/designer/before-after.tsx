"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { MoveHorizontal } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

/**
 * Before/after comparison. A native range input drives the split, so it works with mouse,
 * touch and keyboard (arrow keys) and is announced by screen readers.
 */
export function BeforeAfter({ before, after, alt }: { before: string; after: string; alt: string }) {
  const { t } = useLanguage();
  const r = t.designer.result;
  const [split, setSplit] = useState(50);
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-ink shadow-lift select-none">
      {/* eslint-disable-next-line @next/next/no-img-element -- generated blob image */}
      <img src={after} alt={`${r.after}: ${alt}`} className="block w-full" draggable={false} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
        <img src={before} alt={r.before} className="h-full w-full object-cover" draggable={false} />
      </div>

      <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-ink/60 px-3 py-1 text-xs font-semibold text-paper backdrop-blur">{r.before}</span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-forest/85 px-3 py-1 text-xs font-semibold text-paper backdrop-blur">{r.after}</span>

      <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-paper shadow-[0_0_12px_rgb(0_0_0/0.4)]" style={{ left: `${split}%` }}>
        <motion.span
          className={`absolute top-1/2 left-1/2 inline-flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-forest shadow-lift transition-shadow ${focused ? "ring-4 ring-lime" : ""}`}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 18 }}
        >
          <MoveHorizontal className="h-5 w-5" />
        </motion.span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={split}
        onChange={(e) => setSplit(Number(e.target.value))}
        onFocus={(e) => setFocused(e.currentTarget.matches(":focus-visible"))}
        onBlur={() => setFocused(false)}
        aria-label={r.compareLabel}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
