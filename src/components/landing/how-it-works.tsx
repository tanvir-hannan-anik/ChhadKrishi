"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { BrainCircuit, Camera, HeartHandshake } from "lucide-react";
import { SectionHeading, StaggerGroup, staggerItem } from "@/components/motion/reveal";
import { useLanguage } from "@/lib/i18n/language-context";
import { formatNumber } from "@/lib/i18n/dictionary";

const ICONS = [Camera, BrainCircuit, HeartHandshake];

export function HowItWorks() {
  const { t, lang } = useLanguage();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start 0.85", "end 0.55"] });
  const growth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <SectionHeading eyebrow={t.how.eyebrow} title={t.how.title} subtitle={t.how.subtitle} />

      <div ref={trackRef} className="relative mt-16">
        {/* A vine that grows as the reader scrolls: horizontal on desktop, vertical on mobile */}
        <div aria-hidden className="absolute top-7 right-[16.66%] left-[16.66%] hidden h-1 rounded-full bg-moss md:block">
          <motion.div style={{ scaleX: growth }} className="h-full origin-left rounded-full bg-gradient-to-r from-forest via-leaf to-lime" />
        </div>
        <div aria-hidden className="absolute top-7 bottom-7 left-7 w-1 rounded-full bg-moss md:hidden">
          <motion.div style={{ scaleY: growth }} className="h-full origin-top rounded-full bg-gradient-to-b from-forest via-leaf to-lime" />
        </div>

        <StaggerGroup as="ol" className="relative grid gap-10 md:grid-cols-3 md:gap-8">
          {t.how.steps.map((step, i) => {
            const Icon = ICONS[i];
            return (
              <motion.li key={i} variants={staggerItem} className="flex gap-5 md:flex-col md:items-center md:text-center">
                <span className="relative z-10 inline-flex h-15 w-15 shrink-0 items-center justify-center rounded-full bg-paper font-display text-2xl text-forest shadow-soft ring-4 ring-paper">
                  <span className="absolute inset-0 rounded-full bg-moss" />
                  <span className="relative">{formatNumber(i + 1, lang)}</span>
                </span>
                <div className="pt-1 md:pt-0">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-leaf shadow-soft ring-1 ring-line md:mt-2">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 font-display text-xl text-ink">{step.title}</h3>
                  <p className="mt-1.5 max-w-xs text-ink-soft md:mx-auto">{step.desc}</p>
                </div>
              </motion.li>
            );
          })}
        </StaggerGroup>
      </div>
    </section>
  );
}
