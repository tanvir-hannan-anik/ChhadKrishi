"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpenText,
  CalendarCheck,
  House,
  LayoutDashboard,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ScanSearch,
  ShoppingBasket,
  Sprout,
  WandSparkles,
  X,
} from "lucide-react";
import { UserMenu } from "@/components/auth/user-menu";
import { LogoMark } from "@/components/brand";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { WeatherChip } from "@/components/weather/weather-chip";
import { LanguageToggle } from "@/components/landing/site-header";
import { useLanguage } from "@/lib/i18n/language-context";
import { toggleSidebar, useSidebarCollapsed } from "@/lib/sidebar";

/**
 * AI features first: they are the heart of ChhadKrishi. The chat itself is not listed — it is
 * the main workspace, reached from the floating chat button on every other page.
 */
export const APP_LINKS = [
  { href: "/analyze", key: "analyze", icon: ScanSearch },
  { href: "/designer", key: "designer", icon: WandSparkles },
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/garden", key: "garden", icon: Sprout },
  { href: "/care", key: "care", icon: CalendarCheck },
  { href: "/problems", key: "problems", icon: BookOpenText },
  { href: "/shop", key: "shop", icon: ShoppingBasket },
  { href: "/shop/orders", key: "orders", icon: Package },
] as const;

/** The most specific link matching the path, so /shop/orders highlights "orders", not "shop". */
export function activeHref(pathname: string | null): string | null {
  if (!pathname) return null;
  const matches = APP_LINKS.filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
  return matches.reduce<string | null>((best, { href }) => (!best || href.length > best.length ? href : best), null);
}

const noopSubscribe = () => () => {};

/** Section links. `pathname` is null while it is unknown (prerendering a dynamic route). */
function NavList({ pathname, onNavigate, variant }: { pathname: string | null; onNavigate?: () => void; variant: string }) {
  const { t } = useLanguage();
  const active = activeHref(pathname);
  return (
    <ul className="space-y-1">
      {APP_LINKS.map(({ href, key, icon: Icon }, index) => {
        const current = href === active;
        return (
          <li key={href} className={index === 2 ? "mt-2 border-t border-line pt-2" : undefined}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={current ? "page" : undefined}
              title={t.appNav[key]}
              className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors sidebar-collapsed:justify-center sidebar-collapsed:px-0 ${
                current ? "font-semibold text-forest" : "text-ink-soft hover:bg-moss/60 hover:text-forest"
              }`}
            >
              {current && (
                <motion.span
                  layoutId={`app-nav-active-${variant}`}
                  aria-hidden
                  className="absolute inset-0 rounded-xl bg-moss"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              <Icon className="relative h-5 w-5 shrink-0" />
              <span className="relative truncate sidebar-collapsed:sr-only">{t.appNav[key]}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Reports the current path. Renders nothing, so its late-streamed boundary can never mismatch. */
function PathnameSync({ onChange }: { onChange: (pathname: string) => void }) {
  const pathname = usePathname();
  useEffect(() => onChange(pathname), [pathname, onChange]);
  return null;
}

function Navigation({ onNavigate, variant }: { onNavigate?: () => void; variant: string }) {
  const { t } = useLanguage();
  const [pathname, setPathname] = useState<string | null>(null);
  return (
    <nav aria-label={t.appNav.label} className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-2 sidebar-collapsed:px-2.5">
      {/*
        usePathname suspends while prerendering routes with unknown params (e.g. /chat/[id]), and
        the boundary then streams in late. Keeping the translated links outside it means they
        hydrate with the shell and stay in step with the visitor's saved language.
      */}
      <Suspense fallback={null}>
        <PathnameSync onChange={setPathname} />
      </Suspense>
      <NavList pathname={pathname} onNavigate={onNavigate} variant={variant} />
    </nav>
  );
}

/** One-tap language switch for the icon-only sidebar. */
function CompactLanguageToggle() {
  const { lang, setLang, t } = useLanguage();
  const next = lang === "bn" ? "en" : "bn";
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label={t.nav.languageLabel}
      title={t.nav.languageLabel}
      lang={next}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-moss/80 text-xs font-bold text-forest ring-1 ring-line hover:bg-moss"
    >
      {next === "en" ? "EN" : "বাং"}
    </button>
  );
}

/**
 * Persistent desktop navigation for every signed-in page; rendered by the (app) layout.
 * Expanded it shows icons and labels; icon-only it leaves the most room for the AI chat, which
 * minimises it automatically. The toggle switches between the two.
 */
export function AppSidebar() {
  const { t } = useLanguage();
  const collapsed = useSidebarCollapsed();

  return (
    <aside
      data-sidebar={collapsed === null ? "auto" : collapsed ? "collapsed" : "expanded"}
      className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-paper/80 backdrop-blur-lg transition-[width] duration-300 ease-out lg:flex sidebar-collapsed:w-[4.5rem]"
    >
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 sidebar-collapsed:justify-center sidebar-collapsed:px-0">
        <Link href="/" className="flex min-w-0 items-center gap-2" title={t.hero.brand}>
          <LogoMark size={32} />
          <span className="truncate font-display text-lg text-forest sidebar-collapsed:sr-only">{t.hero.brand}</span>
        </Link>
        <SidebarToggle className="sidebar-collapsed:hidden" />
      </div>
      <div className="hidden justify-center pb-1 sidebar-collapsed:flex">
        <SidebarToggle />
      </div>

      <Navigation variant="sidebar" />

      <div className="space-y-2 border-t border-line p-3 sidebar-collapsed:flex sidebar-collapsed:flex-col sidebar-collapsed:items-center sidebar-collapsed:px-2">
        <div className="sidebar-collapsed:hidden">
          <LanguageToggle />
        </div>
        <div className="hidden sidebar-collapsed:block">
          <CompactLanguageToggle />
        </div>
        <Link
          href="/"
          title={t.appNav.home}
          className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-moss/60 hover:text-forest sidebar-collapsed:justify-center sidebar-collapsed:px-0"
        >
          <House className="h-4 w-4 shrink-0" /> <span className="sidebar-collapsed:sr-only">{t.appNav.home}</span>
        </Link>
      </div>
    </aside>
  );
}

function SidebarToggle({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  const s = t.sidebar;
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-moss hover:text-forest ${className}`}
    >
      {/* Both states are rendered and switched in CSS, so the icon is right before hydration. */}
      <PanelLeftClose className="h-5 w-5 sidebar-collapsed:hidden" aria-hidden />
      <PanelLeftOpen className="hidden h-5 w-5 sidebar-collapsed:block" aria-hidden />
      <span className="sr-only sidebar-collapsed:hidden">{s.collapse}</span>
      <span className="hidden sidebar-collapsed:inline sidebar-collapsed:sr-only">{s.expand}</span>
    </button>
  );
}

/**
 * Top bar for signed-in pages: page title, page actions and account; on small screens it also
 * opens the navigation drawer. Kept compact on phones so content gets the space.
 */
export function AppHeader({ title, actions }: { title: (t: ReturnType<typeof useLanguage>["t"]) => string; actions?: React.ReactNode }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  // True only after hydration, so the portal never differs between server and client HTML.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-lg">
      <div className="flex h-14 items-center justify-between gap-2 px-2 sm:h-16 sm:px-6 lg:pl-6">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t.appNav.openMenu}
            aria-expanded={open}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-moss lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="hidden shrink-0 sm:block lg:hidden" aria-label={t.hero.brand}>
            <LogoMark size={30} />
          </Link>
          <span className="truncate font-semibold text-ink lg:text-lg">{title(t)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {actions}
          {/* The chip reads the path, which can suspend while a dynamic route prerenders. */}
          <Suspense fallback={null}>
            <WeatherChip />
          </Suspense>
          <NotificationBell />
          <UserMenu showLinks={false} />
        </div>
      </div>

      {/* Portalled to <body>: the header's backdrop-filter would otherwise trap this fixed overlay inside it. */}
      {hydrated &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="absolute inset-0 bg-canopy/40" onClick={() => setOpen(false)} aria-hidden />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={t.appNav.label}
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-paper shadow-lift"
                >
                  <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
                    <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
                      <LogoMark size={30} />
                      <span className="font-display text-lg text-forest">{t.hero.brand}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label={t.appNav.closeMenu}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-moss hover:text-forest"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <Navigation variant="drawer" onNavigate={() => setOpen(false)} />
                  <div className="space-y-3 border-t border-line p-4">
                    <LanguageToggle />
                    <Link href="/" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-moss/60 hover:text-forest">
                      <House className="h-4 w-4" /> {t.appNav.home}
                    </Link>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </header>
  );
}
