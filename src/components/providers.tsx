"use client";

import { MotionConfig } from "motion/react";
import { Toaster } from "@/components/app/toaster";
import { AuthModal } from "@/components/auth/auth-modal";
import { LanguageProvider } from "@/lib/i18n/language-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // "user" honours prefers-reduced-motion: transforms are skipped, opacity fades remain.
    <MotionConfig reducedMotion="user">
      <LanguageProvider>
        {children}
        <AuthModal />
        <Toaster />
      </LanguageProvider>
    </MotionConfig>
  );
}
