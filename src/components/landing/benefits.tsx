"use client";

import { motion } from "motion/react";
import { CloudSunRain, Languages, Microscope, PiggyBank } from "lucide-react";
import { Leaf, Sprout } from "@/components/brand";
import { SectionHeading, StaggerGroup, staggerItem } from "@/components/motion/reveal";
import { useLanguage } from "@/lib/i18n/language-context";

const ICONS = [Languages, CloudSunRain, Microscope, PiggyBank];
// Bento placement: a tall feature card, two compact ones and a wide closer.
const LAYOUT = ["md:row-span-2", "", "", "md:col-span-2"];

export function Benefits() {
  const { t } = useLanguage();

  return (
    <section id="benefits" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-28">
      <SectionHeading eyebrow={t.benefits.eyebrow} title={t.benefits.title} subtitle={t.benefits.subtitle} />

      <StaggerGroup as="ul" className="mt-8 grid gap-3 sm:mt-14 sm:gap-4 md:grid-cols-3 md:grid-rows-2">
        {t.benefits.items.map((benefit, i) => {
          const Icon = ICONS[i];
          const featured = i === 0;
          return (
            <motion.li
              key={i}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className={`group relative flex items-start gap-4 overflow-hidden rounded-3xl p-5 ring-1 transition-shadow hover:shadow-lift sm:p-7 md:block ${LAYOUT[i]} ${
                featured ? "bg-forest text-paper ring-forest" : "bg-cream ring-line"
              }`}
            >
              <span
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:-rotate-6 sm:h-12 sm:w-12 ${
                  featured ? "bg-paper/10 text-lime" : "bg-white text-forest shadow-soft"
                }`}
              >
                <Icon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h3 className={`font-display text-xl sm:text-2xl md:mt-5 ${featured ? "text-paper" : "text-ink"}`}>{benefit.title}</h3>
                <p className={`mt-1 max-w-sm text-sm sm:mt-2 sm:text-base ${featured ? "text-paper/75" : "text-ink-soft"}`}>{benefit.desc}</p>
              </div>

              {featured && (
                <div aria-hidden className="pointer-events-none hidden items-end justify-between md:absolute md:inset-x-7 md:bottom-0 md:flex">
                  <Sprout className="w-24 translate-y-2 transition-transform duration-700 group-hover:-translate-y-1 md:w-28" />
                  <Leaf tone="lime" className="mb-8 w-12 origin-bottom-left animate-sway opacity-80" />
                </div>
              )}
              {i === 3 && (
                <Leaf
                  tone="leaf"
                  className="pointer-events-none absolute -right-4 -bottom-6 w-32 opacity-[0.08] transition-transform duration-700 group-hover:rotate-12"
                />
              )}
            </motion.li>
          );
        })}
      </StaggerGroup>
    </section>
  );
}
