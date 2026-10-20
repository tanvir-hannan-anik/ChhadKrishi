"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Leaf, LogoMark, Sprout } from "@/components/brand";
import { Reveal } from "@/components/motion/reveal";
import { LANDING_EVENTS } from "@/lib/chat-draft";
import { useLanguage } from "@/lib/i18n/language-context";
import { formatNumber } from "@/lib/i18n/dictionary";

const LAUNCH_YEAR = 2026;

export function CallToAction() {
  const { t } = useLanguage();

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
      <Reveal>
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-forest px-6 py-14 text-center sm:px-12 sm:py-20">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_0%,rgb(122_194_26/0.35),transparent)]" />
          <Leaf tone="lime" className="pointer-events-none absolute -top-6 -left-6 w-28 origin-bottom-left animate-sway opacity-30" />
          <Leaf tone="leaf" className="pointer-events-none absolute -right-8 -bottom-8 w-40 -scale-x-100 opacity-40" />
          <Sprout className="mx-auto w-16" />
          <h2 className="mt-5 font-display text-3xl text-paper text-balance sm:text-5xl">{t.cta.title}</h2>
          <p className="mx-auto mt-4 max-w-lg text-paper/75 sm:text-lg">{t.cta.subtitle}</p>
          <motion.button
            type="button"
            onClick={() => window.dispatchEvent(new Event(LANDING_EVENTS.focusComposer))}
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-lime px-7 py-3.5 font-semibold text-canopy shadow-[0_10px_30px_-10px_rgb(122_194_26/0.8)] transition-colors hover:bg-[#8ad12a]"
          >
            {t.cta.button}
            <ArrowUpRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </motion.button>
        </div>
      </Reveal>
    </section>
  );
}

export function SiteFooter() {
  const { t, lang } = useLanguage();
  const links = [
    { href: "#benefits", label: t.nav.benefits },
    { href: "#features", label: t.nav.features },
    { href: "#how-it-works", label: t.nav.how },
    { href: "#guide", label: t.nav.guide },
  ];

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-xl text-forest">{t.hero.brand}</span>
          </div>
          <p className="mt-3 text-ink-soft">{t.footer.tagline}</p>
        </div>
        <nav aria-label={t.footer.explore}>
          <p className="text-sm font-semibold text-ink">{t.footer.explore}</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-ink-soft transition-colors hover:text-forest">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-sm text-ink-faint sm:flex-row sm:justify-between sm:px-6">
          <p>
            © {formatNumber(LAUNCH_YEAR, lang).replace(/[,٬]/g, "")} {t.hero.brand}. {t.footer.rights}
          </p>
          <p>{t.footer.madeFor} 🇧🇩</p>
        </div>
      </div>
    </footer>
  );
}
