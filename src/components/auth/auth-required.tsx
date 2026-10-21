"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { LockKeyhole } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { EASE_OUT } from "@/components/motion/reveal";
import { openAuthModal } from "@/lib/auth/flow";
import { useLanguage } from "@/lib/i18n/language-context";

/**
 * Rendered by a protected page when the server found no valid session. Opens the sign-in
 * modal in place; after login the page is refreshed and the server renders the real content.
 */
export type ProtectedPage = "chat" | "shop" | "orders" | "analyze" | "designer" | "dashboard" | "garden" | "care" | "weather" | "profile";

export function AuthRequired({ page, expired }: { page: ProtectedPage; expired: boolean }) {
  const { t } = useLanguage();
  const reason = page === "shop" || page === "orders" ? "shop" : page === "analyze" ? "analyze" : "protected";

  useEffect(() => {
    openAuthModal({ expired, pending: { kind: "refresh", reason } });
  }, [expired, reason]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader title={(t) => t.appNav[page]} />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          className="w-full max-w-md rounded-[28px] bg-white p-8 text-center shadow-soft ring-1 ring-line"
        >
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-moss text-forest">
            <LockKeyhole className="h-6 w-6" />
          </span>
          <p className="mt-4 text-ink">{expired ? t.auth.reasons.expired : t.auth.reasons[reason]}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => openAuthModal({ expired, pending: { kind: "refresh", reason } })}
              className="rounded-full bg-forest px-6 py-2.5 font-semibold text-paper shadow-soft transition-colors hover:bg-canopy active:scale-[0.98]"
            >
              {t.account.signIn}
            </button>
            <Link href="/" className="rounded-full px-6 py-2.5 font-semibold text-forest ring-1 ring-line transition-colors hover:bg-moss">
              {t.chatPage.back}
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
