"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, ImagePlus, Mic, Square, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Minimal typing for the Web Speech API, which TypeScript's DOM lib does not ship.
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}
type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  image: File | null;
  onImageChange: (file: File | null) => void;
  onSubmit: () => void;
  /** Called by the attach button; the parent decides whether the picker may open. */
  onAttach: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ChatComposer({ value, onChange, image, onImageChange, onSubmit, onAttach, textareaRef, fileInputRef }: ChatComposerProps) {
  const { t, lang } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceSupported = useSyncExternalStore(noopSubscribe, () => getRecognitionCtor() !== null, () => false);

  const previewUrl = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const canSend = value.trim().length > 0 || image !== null;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t.hero.imageInvalid);
    } else if (file.size > MAX_IMAGE_BYTES) {
      setError(t.hero.imageTooLarge);
    } else {
      setError(null);
      onImageChange(file);
    }
    // Reset so selecting the same file again still fires a change event.
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = lang === "bn" ? "bn-BD" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    const base = value.trimEnd();
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      onChange(base ? `${base} ${transcript}` : transcript);
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted" && event.error !== "no-speech") setError(t.hero.voiceError);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      textareaRef.current?.focus();
    };
    try {
      recognition.start();
      recognitionRef.current = recognition;
      setError(null);
      setListening(true);
    } catch {
      setError(t.hero.voiceError);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSubmit();
      }}
      className="group relative"
    >
      <div className="relative rounded-[28px] bg-white shadow-lift ring-1 ring-line transition-shadow">
        <AnimatePresence initial={false}>
          {image && previewUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 pt-4">
                <div className="relative">
                  <button type="button" onClick={onAttach} aria-label={t.capture.replace} title={t.capture.replace} className="block rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                    <img src={previewUrl} alt={image.name} className="h-16 w-16 rounded-2xl object-cover ring-1 ring-line" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onImageChange(null)}
                    aria-label={t.hero.removeImage}
                    className="absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink text-paper shadow-soft transition-transform hover:scale-110"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink-soft">{image.name}</p>
                  <div className="mt-0.5 flex gap-1 text-xs font-semibold">
                    <button type="button" onClick={onAttach} className="min-h-8 rounded-full px-2 text-forest hover:bg-moss">
                      {t.capture.replace}
                    </button>
                    <button type="button" onClick={() => onImageChange(null)} className="min-h-8 rounded-full px-2 text-clay hover:bg-clay/10">
                      {t.capture.remove}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <label htmlFor="composer" className="sr-only">
          {t.hero.placeholder}
        </label>
        <textarea
          id="composer"
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (canSend) onSubmit();
            }
          }}
          rows={2}
          placeholder={listening ? t.hero.listening : t.hero.placeholder}
          className="block max-h-48 min-h-[4.5rem] w-full resize-none bg-transparent px-5 pt-4 text-[17px] leading-relaxed text-ink outline-none field-sizing-content placeholder:text-ink-faint"
        />

        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            <ComposerIconButton label={t.hero.attach} onClick={onAttach}>
              <ImagePlus className="h-5 w-5" />
            </ComposerIconButton>
            {voiceSupported && (
              <ComposerIconButton
                label={listening ? t.hero.voiceStop : t.hero.voiceStart}
                onClick={toggleVoice}
                active={listening}
              >
                {listening ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
              </ComposerIconButton>
            )}
            {listening && (
              <span className="ml-1 flex items-center gap-1" aria-live="polite">
                <span className="sr-only">{t.hero.listening}</span>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-3 w-1 rounded-full bg-clay"
                    animate={{ scaleY: [0.5, 1.4, 0.5] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-ink-faint sm:inline">{t.hero.hint}</span>
            <motion.button
              type="submit"
              disabled={!canSend}
              aria-label={t.hero.send}
              whileHover={canSend ? { scale: 1.06 } : undefined}
              whileTap={canSend ? { scale: 0.92 } : undefined}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-forest text-paper shadow-soft transition-colors hover:bg-canopy disabled:cursor-not-allowed disabled:bg-moss disabled:text-ink-faint disabled:shadow-none"
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.4} />
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-center text-sm text-clay"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}

function ComposerIconButton({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active || undefined}
      title={label}
      whileTap={{ scale: 0.9 }}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
        active ? "bg-clay/15 text-clay" : "text-ink-soft hover:bg-moss hover:text-forest"
      }`}
    >
      {children}
    </motion.button>
  );
}
