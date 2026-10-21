"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, type Variants } from "motion/react";
import { ChevronDown, Sparkles } from "lucide-react";
import { FeatureCards } from "@/components/ai/feature-cards";
import { Leaf } from "@/components/brand";
import { EASE_OUT } from "@/components/motion/reveal";
import { ChatComposer } from "./chat-composer";
import { LANDING_EVENTS } from "@/lib/chat-draft";
import { authClient } from "@/lib/auth/client";
import { useAuthGate } from "@/lib/auth/flow";
import { useLanguage } from "@/lib/i18n/language-context";
import type { GreetingKey } from "@/lib/i18n/dictionary";

const noopSubscribe = () => () => {};

function greetingForNow(): GreetingKey {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 15) return "noon";
  if (hour >= 15 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 21) return "evening";
  return "night";
}

const container: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE_OUT } },
};

function focusTextarea(el: HTMLTextAreaElement | null, scroll = false) {
  if (!el) return;
  if (scroll) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }
  el.focus({ preventScroll: true });
  el.setSelectionRange(el.value.length, el.value.length);
}

/**
 * Chat-first landing: a centred, Gemini-style composer fills the first screen, with the AI
 * feature cards just above it. Visitors see the brand; signed-in gardeners are greeted by name.
 */
export function Hero({ showMoreCue = true }: { showMoreCue?: boolean }) {
  const { t } = useLanguage();
  const gate = useAuthGate();
  const { data: session } = authClient.useSession();
  const greeting = useSyncExternalStore(noopSubscribe, greetingForNow, () => "welcome" as const);
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const firstName = session?.user.name.trim().split(/\s+/)[0];

  useEffect(() => {
    const onFocusRequest = () => focusTextarea(textareaRef.current, true);
    window.addEventListener(LANDING_EVENTS.focusComposer, onFocusRequest);
    return () => window.removeEventListener(LANDING_EVENTS.focusComposer, onFocusRequest);
  }, []);

  const applyPrompt = (prompt: string) => {
    setText(prompt);
    // Wait for the controlled value to land before moving the caret to the end.
    requestAnimationFrame(() => focusTextarea(textareaRef.current));
  };

  const openPicker = () => fileInputRef.current?.click();

  // Text and photo are captured now, so they survive the sign-in detour unchanged.
  const submit = () => gate({ kind: "chat", text: text.trim(), image });

  return (
    <section id="top" className="relative isolate -mt-16 overflow-hidden pt-16">
      <HeroBackdrop />

      <motion.div
        variants={container}
        initial="hidden"
        animate="shown"
        className="mx-auto flex min-h-[calc(100dvh-4rem-1px)] max-w-3xl flex-col items-center justify-center px-4 pt-6 pb-8 text-center sm:px-6 sm:pt-10 sm:pb-14"
      >
        {firstName ? (
          <>
            <motion.h1 variants={item} className="text-gradient-leaf animate-shimmer py-1 font-display text-4xl leading-tight text-balance sm:text-6xl">
              {t.landing.greetUser(t.hero.greetings[greeting], firstName)}
            </motion.h1>
            <motion.p variants={item} className="mt-2 font-display text-lg text-ink sm:text-2xl">
              {t.landing.askAnything}
            </motion.p>
          </>
        ) : (
          <>
            <motion.p
              variants={item}
              className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-forest shadow-soft ring-1 ring-line backdrop-blur sm:px-3.5 sm:py-1.5 sm:text-sm"
            >
              <Sparkles className="h-4 w-4 text-lime" />
              {t.hero.greetings[greeting]}
            </motion.p>
            <motion.h1 variants={item} className="text-gradient-leaf mt-3 animate-shimmer py-1 font-display text-5xl leading-[1.15] sm:mt-5 sm:text-7xl md:text-8xl">
              {t.hero.brand}
            </motion.h1>
            <motion.p variants={item} className="mt-1 font-display text-lg text-ink sm:mt-2 sm:text-2xl">
              {t.hero.tagline}
            </motion.p>
            <motion.p variants={item} className="mt-3 hidden max-w-xl text-ink-soft text-pretty sm:block sm:text-lg">
              {t.hero.intro}
            </motion.p>
          </>
        )}

        <motion.div variants={item} className="mt-6 w-full sm:mt-9">
          <FeatureCards />
        </motion.div>

        <motion.div variants={item} className="mt-3 w-full text-left sm:mt-4">
          <ChatComposer
            value={text}
            onChange={setText}
            image={image}
            onImageChange={setImage}
            onSubmit={submit}
            onAttach={() => gate({ kind: "upload", open: openPicker })}
            textareaRef={textareaRef}
            fileInputRef={fileInputRef}
          />
        </motion.div>

        <motion.div variants={item} className="mt-3 w-full sm:mt-4">
          <p className="sr-only">{t.hero.suggestionsLabel}</p>
          <ul className="flex flex-wrap justify-center gap-2">
            {t.hero.suggestions.map((suggestion) => (
              <li key={suggestion} className="max-w-full max-sm:[&:nth-child(n+5)]:hidden">
                <button
                  type="button"
                  onClick={() => applyPrompt(suggestion)}
                  className="min-h-9 max-w-full truncate rounded-full border border-line bg-white/70 px-3.5 py-1.5 text-sm text-ink-soft backdrop-blur transition-all hover:-translate-y-0.5 hover:border-leaf/40 hover:bg-white hover:text-forest active:translate-y-0 active:scale-[0.97]"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </motion.div>

        {showMoreCue && !firstName && (
          <motion.a
            variants={item}
            href="#benefits"
            aria-label={t.nav.benefits}
            className="mt-6 inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-faint ring-1 ring-line transition-colors hover:bg-white hover:text-forest sm:mt-8"
          >
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </motion.a>
        )}
      </motion.div>
    </section>
  );
}

function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(122_194_26/0.22),transparent)]" />
      <div className="absolute top-40 -left-40 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(11_77_53/0.12),transparent)]" />
      <div className="absolute top-24 -right-32 h-[380px] w-[380px] rounded-full bg-[radial-gradient(closest-side,rgb(194_103_58/0.10),transparent)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-paper" />

      <Leaf tone="lime" className="absolute top-28 left-[6%] hidden w-14 animate-drift opacity-70 sm:block" />
      <Leaf tone="leaf" className="absolute top-[58%] left-[10%] hidden w-9 animate-drift opacity-50 [animation-delay:-5s] md:block" />
      <Leaf tone="forest" className="absolute top-36 right-[8%] w-10 -scale-x-100 animate-drift opacity-40 [animation-delay:-3s] sm:w-12" />
      <Leaf tone="lime" className="absolute top-[64%] right-[12%] hidden w-8 -scale-x-100 animate-drift opacity-60 [animation-delay:-9s] md:block" />
    </div>
  );
}
