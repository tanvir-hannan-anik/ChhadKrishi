"use client";

import Link from "next/link";
import { BookOpenText, CalendarCheck, ScanSearch, WandSparkles } from "lucide-react";
import { Leaf } from "@/components/brand";
import { authClient } from "@/lib/auth/client";
import { useAuthGate } from "@/lib/auth/flow";
import { useLanguage } from "@/lib/i18n/language-context";
import type { AiFeatureKey } from "@/lib/i18n/shell-dictionary";

const FEATURES: { key: AiFeatureKey; href: string; icon: typeof ScanSearch; reason: "analyze" | "protected" | null; tone: string }[] = [
  { key: "analyze", href: "/analyze", icon: ScanSearch, reason: "analyze", tone: "from-sprout to-moss text-forest" },
  { key: "designer", href: "/designer", icon: WandSparkles, reason: "protected", tone: "from-[#e6f2c8] to-sprout text-leaf" },
  { key: "care", href: "/care", icon: CalendarCheck, reason: "protected", tone: "from-moss to-cream text-forest" },
  // The problems library is public, so it never needs a sign-in.
  { key: "problems", href: "/problems", icon: BookOpenText, reason: null, tone: "from-cream to-moss text-canopy" },
];

/**
 * Gemini-style suggested actions for the main AI features: a 2×2 grid on phones, one row of
 * four from `md`. Animation is CSS only (a staggered rise on entry, a gentle lift, a swaying
 * icon and a sprouting leaf on hover/press), so the cards add no animation work to the page.
 * Protected features open the sign-in modal for visitors and continue to the page afterwards.
 */
export function FeatureCards({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  const gate = useAuthGate();
  const { data: session } = authClient.useSession();

  return (
    <nav aria-label={t.aiFeatures.label} className={className}>
      <ul className="grid grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-4">
        {FEATURES.map(({ key, href, icon: Icon, reason, tone }, index) => {
          const item = t.aiFeatures.items[key];
          return (
            <li key={key} className="animate-rise" style={{ animationDelay: `${120 + index * 70}ms` }}>
              <Link
                href={href}
                onClick={(event) => {
                  if (session || !reason) return;
                  event.preventDefault();
                  void gate({ kind: "navigate", href, reason });
                }}
                className="group relative flex h-full min-h-[44px] flex-col gap-1.5 overflow-hidden rounded-2xl bg-white/85 p-3 text-left shadow-soft ring-1 ring-line backdrop-blur transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lift hover:ring-leaf/25 active:scale-[0.97] sm:gap-2 sm:p-3.5"
              >
                {/* A leaf that grows into the corner on hover / press */}
                <Leaf
                  tone="lime"
                  className="pointer-events-none absolute -right-3 -bottom-3 h-12 w-12 origin-bottom-right scale-75 -rotate-12 opacity-15 transition-transform duration-500 ease-out group-hover:scale-100 group-hover:rotate-0 group-active:scale-100"
                />
                <span className="relative flex items-center gap-2 sm:flex-col sm:items-start">
                  <span
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br sm:h-9 sm:w-9 ${tone} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}
                  >
                    <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  </span>
                  <span className="min-w-0 text-[13px] leading-snug font-semibold text-ink sm:text-sm">{item.title}</span>
                </span>
                <span className="relative line-clamp-2 text-[11.5px] leading-snug text-ink-soft sm:text-xs">{item.desc}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
