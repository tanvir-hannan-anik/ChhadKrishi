"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { dictionaries, type Dictionary, type Lang } from "./dictionary";

const STORAGE_KEY = "chhadkrishi-lang";
const listeners = new Set<() => void>();
// Fallback for browsers where localStorage is blocked (private mode, disabled site data).
let memoryLang: Lang = "bn";

function readLang(): Lang {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "bn" || stored === "en") return stored;
  } catch {}
  return memoryLang;
}

function writeLang(lang: Lang) {
  memoryLang = lang;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dictionary;
}

// Bangla is the primary language, so the server always renders it.
const readServerLang = () => "bn" as const;

/** Marks that a provider is mounted; the language itself is read per component (see below). */
const LanguageContext = createContext(false);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, readServerLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return <LanguageContext.Provider value>{children}</LanguageContext.Provider>;
}

/**
 * Each component reads the saved language itself rather than from context. While a component
 * hydrates, React uses the server snapshot (Bangla) and switches straight after — including for
 * Suspense boundaries that stream in late. With a context value, those late boundaries would
 * hydrate against the already-switched language and mismatch the server HTML.
 */
export function useLanguage(): LanguageContextValue {
  if (!useContext(LanguageContext)) throw new Error("useLanguage must be used inside <LanguageProvider>");
  const lang = useSyncExternalStore(subscribe, readLang, readServerLang);
  return useMemo(() => ({ lang, setLang: writeLang, t: dictionaries[lang] }), [lang]);
}
