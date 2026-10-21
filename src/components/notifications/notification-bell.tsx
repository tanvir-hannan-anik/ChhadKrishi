"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bell, BellRing, CalendarCheck, CloudSunRain, Package } from "lucide-react";
import { toast } from "@/components/app/toaster";
import { Spinner } from "@/components/app/ui";
import { formatNumber, type Lang } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/language-context";
import { loadNotifications, markNotificationsRead, useNotifications } from "@/lib/notifications/client";
import { notificationText } from "@/lib/notifications/messages";
import { enablePush, pushState } from "@/lib/notifications/push-client";

const KIND_ICON = { weather: CloudSunRain, care: CalendarCheck, order: Package, "push-enabled": BellRing } as const;
const KIND_TONE = { weather: "bg-sky-100 text-sky-700", care: "bg-sprout text-forest", order: "bg-clay/15 text-clay", "push-enabled": "bg-moss text-leaf" } as const;

function timeAgo(iso: string, lang: Lang, justNow: string): string {
  const seconds = Math.round((Date.parse(iso) - Date.now()) / 1000);
  if (seconds > -60) return justNow;
  const rtf = new Intl.RelativeTimeFormat(lang === "bn" ? "bn-BD" : "en", { numeric: "auto" });
  if (seconds > -3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (seconds > -86400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86400), "day");
}

/** Bell with the unread count; opens the notification list (and offers device push once). */
export function NotificationBell() {
  const { t, lang } = useLanguage();
  const n = t.notifications;
  const router = useRouter();
  const { items, unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const [canOfferPush, setCanOfferPush] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    void loadNotifications(true);
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    // Permission can change in browser settings, so it is read each time the list opens.
    if (!open) setCanOfferPush(pushState() === "default");
    setOpen(!open);
  };

  const openItem = (id: string, url: string) => {
    void markNotificationsRead([id]);
    setOpen(false);
    if (url) router.push(url);
  };

  const turnOnPush = async () => {
    setEnabling(true);
    const result = await enablePush(lang);
    setEnabling(false);
    setCanOfferPush(pushState() === "default");
    if (result === "ok") {
      toast(t.profile.pushOn);
      void loadNotifications(true);
    } else {
      toast(result === "denied" ? t.profile.pushBlocked : result === "unsupported" ? t.profile.pushUnsupported : result === "not-configured" ? t.profile.pushNotConfigured : t.profile.pushFailed, "error");
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={n.open(formatNumber(unread, lang))}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-moss hover:text-forest"
      >
        <Bell className={`h-5 w-5 ${unread > 0 ? "origin-top animate-wx-sway" : ""}`} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[10px] leading-4 font-bold text-white ring-2 ring-paper">
            {formatNumber(Math.min(unread, 9), lang)}
            {unread > 9 ? "+" : ""}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={n.title}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            // Phones: pinned to the screen edges under the (full-width, top) header, wherever the
            // bell sits in it. Larger screens: a dropdown under the bell.
            className="fixed inset-x-3 top-[3.75rem] z-50 origin-top-right rounded-2xl bg-white shadow-lift ring-1 ring-line sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96"
          >
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <p className="font-semibold text-ink">{n.title}</p>
              {unread > 0 && (
                <button type="button" onClick={() => void markNotificationsRead("all")} className="text-xs font-semibold text-forest hover:underline">
                  {n.markAll}
                </button>
              )}
            </div>

            {canOfferPush && (
              <div className="m-3 rounded-2xl bg-moss/70 p-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-forest">
                  <BellRing className="h-4 w-4" /> {n.enableCta}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">{n.enableBody}</p>
                <button
                  type="button"
                  onClick={() => void turnOnPush()}
                  disabled={enabling}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-1.5 text-xs font-semibold text-paper disabled:opacity-70"
                >
                  {enabling && <Spinner className="h-3.5 w-3.5" />} {enabling ? t.profile.enablingPush : t.profile.enablePush}
                </button>
              </div>
            )}

            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-faint">{n.empty}</p>
            ) : (
              <ul className="max-h-[min(24rem,60dvh)] overflow-y-auto overscroll-contain p-1.5 [scrollbar-width:none]">
                {items.map((item) => {
                  const kind = item.kind in KIND_ICON ? (item.kind as keyof typeof KIND_ICON) : "push-enabled";
                  const Icon = KIND_ICON[kind];
                  const text = notificationText(item.kind, item.params, lang);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => openItem(item.id, item.url)}
                        className={`flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-cream ${item.read ? "" : "bg-sprout/25"}`}
                      >
                        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${KIND_TONE[kind]}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm leading-snug ${item.read ? "text-ink-soft" : "font-semibold text-ink"}`}>{text.title}</span>
                          {text.body && <span className="mt-0.5 block text-xs leading-snug text-ink-faint">{text.body}</span>}
                          <span className="mt-1 block text-[11px] text-ink-faint">{timeAgo(item.createdAt, lang, n.justNow)}</span>
                        </span>
                        {!item.read && <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-clay" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
