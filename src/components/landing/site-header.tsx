"use client";

import { useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { BookOpenText, LayoutDashboard, Menu, ShoppingBasket, X } from "lucide-react";
import { UserMenu } from "@/components/auth/user-menu";
import { LogoMark } from "@/components/brand";
import { authClient } from "@/lib/auth/client";
import { useAuthGate } from "@/lib/auth/flow";
import { LANDING_EVENTS } from "@/lib/chat-draft";
import { useLanguage } from "@/lib/i18n/language-context";
import type { Lang } from "@/lib/i18n/dictionary";

export function SiteHeader() {
  const { t } = useLanguage();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const gate = useAuthGate();
  const { data: session } = authClient.useSession();

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  // Section anchors exist only on the visitor home page; signed-in users get a clean workspace.
  const links = session
    ? []
    : [
        { href: "#benefits", label: t.nav.benefits, wide: true },
        { href: "#features", label: t.nav.features, wide: false },
        { href: "#how-it-works", label: t.nav.how, wide: true },
        { href: "#guide", label: t.nav.guide, wide: true },
      ];

  const openShop = () => {
    setMenuOpen(false);
    gate({ kind: "navigate", href: "/shop", reason: "shop" });
  };

  const openDashboard = (event: React.MouseEvent) => {
    setMenuOpen(false);
    if (session) return;
    event.preventDefault();
    gate({ kind: "navigate", href: "/dashboard", reason: "protected" });
  };

  const askNow = () => {
    setMenuOpen(false);
    window.dispatchEvent(new Event(LANDING_EVENTS.focusComposer));
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled || menuOpen
          ? "border-b border-line bg-paper/85 shadow-[0_6px_24px_-18px_rgb(11_77_53/0.35)] backdrop-blur-lg"
          : "border-b border-transparent"
      }`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-paper"
      >
        {t.meta.skipToContent}
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#top" className="group flex items-center gap-2.5" aria-label={t.hero.brand}>
          <LogoMark className="transition-transform duration-300 group-hover:-rotate-6" />
          <span className="font-display text-xl text-forest">{t.hero.brand}</span>
        </a>

        <nav className="hidden items-center gap-0.5 whitespace-nowrap lg:flex" aria-label="Primary">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-1.5 text-[15px] text-ink-soft transition-colors hover:bg-moss/70 hover:text-forest ${link.wide ? "hidden xl:inline-block" : ""}`}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/problems"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[15px] text-ink-soft transition-colors hover:bg-moss/70 hover:text-forest"
          >
            <BookOpenText className="h-4 w-4" />
            {t.appNav.problems}
          </Link>
          <button
            type="button"
            onClick={openShop}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[15px] text-ink-soft transition-colors hover:bg-moss/70 hover:text-forest"
          >
            <ShoppingBasket className="h-4 w-4" />
            {t.nav.shop}
          </button>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden sm:block">
            <LanguageToggle />
          </div>
          <Link
            href="/dashboard"
            onClick={openDashboard}
            aria-label={t.appNav.dashboard}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-forest ring-1 ring-forest/25 transition-colors hover:bg-moss sm:px-3.5"
          >
            <LayoutDashboard className="h-[18px] w-[18px]" /> <span className="hidden sm:inline">{t.appNav.dashboard}</span>
          </Link>
          <UserMenu />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-moss lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.nav
            id="mobile-nav"
            aria-label="Mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden lg:hidden"
          >
            <ul className="flex flex-col gap-1 px-4 pt-1 pb-4">
              <li className="flex pb-1 sm:hidden">
                <LanguageToggle />
              </li>
              <li>
                <Link
                  href="/dashboard"
                  onClick={openDashboard}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 font-semibold text-forest hover:bg-moss"
                >
                  <LayoutDashboard className="h-4 w-4" /> {t.appNav.dashboard}
                </Link>
              </li>
              <li>
                <Link
                  href="/problems"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-ink-soft transition-colors hover:bg-moss hover:text-forest"
                >
                  <BookOpenText className="h-4 w-4" /> {t.appNav.problems}
                </Link>
              </li>
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-ink-soft transition-colors hover:bg-moss hover:text-forest"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={openShop}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-ink-soft transition-colors hover:bg-moss hover:text-forest"
                >
                  <ShoppingBasket className="h-4 w-4" />
                  {t.nav.shop}
                </button>
              </li>
              <li className="pt-2">
                <button
                  type="button"
                  onClick={askNow}
                  className="w-full rounded-xl bg-forest px-4 py-3 font-semibold text-paper active:scale-[0.98]"
                >
                  {t.nav.start}
                </button>
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();
  const options: { value: Lang; label: string }[] = [
    { value: "bn", label: "বাংলা" },
    { value: "en", label: "EN" },
  ];

  return (
    <div role="radiogroup" aria-label={t.nav.languageLabel} className="relative flex rounded-full bg-moss/80 p-1 ring-1 ring-line">
      {options.map((option) => {
        const active = option.value === lang;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            lang={option.value}
            onClick={() => setLang(option.value)}
            className={`relative z-10 rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
              active ? "text-paper" : "text-ink-soft hover:text-forest"
            }`}
          >
            {active && (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 -z-10 rounded-full bg-forest"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
