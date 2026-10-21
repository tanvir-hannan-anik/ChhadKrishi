"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CalendarCheck, LayoutDashboard, Loader2, LogOut, Package, Sprout, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { openAuthModal } from "@/lib/auth/flow";
import { useLanguage } from "@/lib/i18n/language-context";
import { clearNotifications } from "@/lib/notifications/client";
import { clearWeather } from "@/lib/weather/client";

const PROTECTED_PREFIXES = ["/chat", "/shop", "/analyze", "/designer", "/dashboard", "/garden", "/care", "/weather", "/profile"];
const ACCOUNT_LINKS = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/garden", key: "garden", icon: Sprout },
  { href: "/care", key: "care", icon: CalendarCheck },
  { href: "/shop/orders", key: "orders", icon: Package },
] as const;

/**
 * Account menu behind the avatar (top right). The profile is reached only from here. `showLinks`
 * is off inside the app, where the sidebar already lists every section.
 */
export function UserMenu({ showLinks = true }: { showLinks?: boolean }) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (isPending) {
    return <span aria-hidden className="inline-block h-9 w-9 animate-pulse rounded-full bg-moss" />;
  }

  if (!session) {
    return (
      <motion.button
        type="button"
        onClick={() => openAuthModal()}
        whileTap={{ scale: 0.96 }}
        className="h-10 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap text-forest ring-1 ring-forest/25 transition-colors hover:bg-moss"
      >
        {t.account.signIn}
      </motion.button>
    );
  }

  const { name, email, image } = session.user;
  const initial = (name || email).trim().charAt(0).toUpperCase();

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await authClient.signOut();
    clearWeather();
    clearNotifications();
    setSigningOut(false);
    setOpen(false);
    if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) router.push("/");
    else router.refresh();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.account.menu}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-leaf to-forest font-semibold text-paper shadow-soft ring-2 ring-paper transition-transform hover:scale-105"
      >
        <Avatar image={image} initial={initial} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-60 origin-top-right rounded-2xl bg-white p-2 shadow-lift ring-1 ring-line"
          >
            <div className="flex items-center gap-3 px-3 py-2">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-leaf to-forest font-semibold text-paper">
                <Avatar image={image} initial={initial} />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink">{name}</span>
                <span className="block truncate text-sm text-ink-faint">{email}</span>
              </span>
            </div>
            <div className="my-1 h-px bg-line" />
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 font-medium text-forest transition-colors hover:bg-moss"
            >
              <UserRound className="h-4 w-4" /> {t.account.profile}
            </Link>
            {showLinks && (
              <>
                {ACCOUNT_LINKS.map(({ href, key, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-ink-soft transition-colors hover:bg-moss hover:text-forest"
                  >
                    <Icon className="h-4 w-4" /> {t.appNav[key]}
                  </Link>
                ))}
                <div className="my-1 h-px bg-line" />
              </>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-ink-soft transition-colors hover:bg-moss hover:text-forest disabled:opacity-70"
            >
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {signingOut ? t.account.signingOut : t.account.signOut}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Avatar({ image, initial }: { image?: string | null; initial: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- a tiny private avatar served by our own API
  return image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <>{initial}</>;
}
