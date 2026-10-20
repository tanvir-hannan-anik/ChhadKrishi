"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowRight, Check, ClipboardCheck, Info, RotateCcw, Send, WandSparkles } from "lucide-react";
import { EASE_OUT } from "@/components/motion/reveal";
import type { AiErrorCode } from "@/lib/ai/errors";
import { DESIGNER_LIMITS, type Answer, type Question } from "@/lib/designer/schema";
import { formatNumber } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/language-context";

export type ChatMessage = { id: string; role: "designer" | "user" | "note"; text: string };

interface ConsultationProps {
  messages: ChatMessage[];
  question: Question | null;
  asked: number;
  thinking: boolean;
  error: AiErrorCode | null;
  canReview: boolean;
  onAnswer: (answer: Answer) => void;
  onRetry: () => void;
  onReview: () => void;
}

/** Chat-style, one-question-at-a-time consultation with tappable answers. */
export function Consultation({ messages, question, asked, thinking, error, canReview, onAnswer, onRetry, onReview }: ConsultationProps) {
  const { t, lang } = useLanguage();
  const c = t.designer.chat;
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, thinking, question, error]);

  return (
    <section aria-label={c.label} className="flex flex-col rounded-[28px] bg-white shadow-soft ring-1 ring-line">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <p className="flex items-center gap-2 font-semibold text-ink">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-forest text-paper">
            <WandSparkles className="h-4 w-4" />
          </span>
          {c.label}
        </p>
        <span className="text-xs text-ink-faint">{c.progress(formatNumber(Math.min(asked + 1, DESIGNER_LIMITS.maxTurns), lang), formatNumber(DESIGNER_LIMITS.maxTurns, lang))}</span>
      </div>

      <div className="flex max-h-[min(60vh,560px)] min-h-[320px] flex-col gap-3 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              layout="position"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
              className={m.role === "user" ? "flex justify-end" : m.role === "note" ? "flex justify-center" : "flex justify-start"}
            >
              {m.role === "note" ? (
                <p className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-xs text-ink-soft">
                  <Info className="h-3.5 w-3.5" /> {m.text}
                </p>
              ) : (
                <div
                  className={`max-w-[85%] rounded-3xl px-4 py-2.5 ${
                    m.role === "user" ? "rounded-br-lg bg-forest text-paper" : "rounded-bl-lg bg-cream text-ink ring-1 ring-line"
                  }`}
                >
                  <span className="sr-only">{m.role === "user" ? c.you : c.designer}: </span>
                  {m.text}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {thinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-ink-faint" role="status">
            <span className="inline-flex gap-1 rounded-3xl rounded-bl-lg bg-cream px-4 py-3 ring-1 ring-line">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="h-2 w-2 rounded-full bg-leaf" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </span>
            <span className="sr-only">{c.thinking}</span>
          </motion.div>
        )}

        {error && !thinking && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} role="alert" className="rounded-2xl bg-clay/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-clay">
              <AlertTriangle className="h-4 w-4" /> {t.aiErrors[error]}
            </p>
            {error !== "AI_NOT_CONFIGURED" && error !== "UNAUTHORIZED" && (
              <button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-forest ring-1 ring-line hover:bg-moss">
                <RotateCcw className="h-4 w-4" /> {t.chat.retry}
              </button>
            )}
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-line p-4 sm:p-5">
        <AnimatePresence mode="wait">
          {question && !thinking && !error && (
            <motion.div key={question.text} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
              {question.hint && <p className="mb-3 text-xs text-ink-faint">{question.hint}</p>}
              <AnswerInput question={question} onAnswer={onAnswer} />
            </motion.div>
          )}
        </AnimatePresence>
        {canReview && !thinking && (
          <button type="button" onClick={onReview} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline">
            <ClipboardCheck className="h-4 w-4" /> {c.reviewNow}
          </button>
        )}
      </div>
    </section>
  );
}

function AnswerInput({ question, onAnswer }: { question: Question; onAnswer: (answer: Answer) => void }) {
  const { t } = useLanguage();
  const c = t.designer.chat;
  const inputId = useId();
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const base = { field: question.field, question: question.text };
  const isNumber = question.inputKind === "number";
  const options = question.options.filter((o) => o.label.trim() && o.value.trim());

  const submitCustom = () => {
    const text = custom.trim();
    if (!text) return;
    if (isNumber) {
      const n = Number(text);
      if (!Number.isFinite(n) || n <= 0) return;
      onAnswer({ ...base, answer: question.unit ? `${text} ${question.unit}` : text, value: n });
    } else if (question.inputKind === "multi") {
      const labels = [...options.filter((o) => selected.includes(o.value)).map((o) => o.label), text];
      onAnswer({ ...base, answer: labels.join(", "), value: [...selected, text] });
    } else {
      const structured = question.field === "style" || question.field === "notes";
      onAnswer({ ...base, answer: text, ...(structured && { value: text.slice(0, 120) }) });
    }
  };

  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-[0.97] ${
      active ? "bg-forest text-paper shadow-soft" : "bg-white text-forest ring-1 ring-forest/25 hover:-translate-y-0.5 hover:bg-moss"
    }`;

  return (
    <div>
      {options.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={question.text}>
          {options.map((o) => {
            const active = selected.includes(o.value);
            return question.inputKind === "multi" ? (
              <button
                key={o.value}
                type="button"
                aria-pressed={active}
                onClick={() => setSelected((list) => (active ? list.filter((v) => v !== o.value) : [...list, o.value]))}
                className={chip(active)}
              >
                {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                {o.label}
              </button>
            ) : (
              <button
                key={o.value}
                type="button"
                onClick={() => onAnswer({ ...base, answer: o.label, value: isNumber ? Number(o.value) || o.value : o.value })}
                className={chip(false)}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}

      {question.inputKind === "multi" && (
        <button
          type="button"
          disabled={selected.length === 0 && !custom.trim()}
          onClick={() => (custom.trim() ? submitCustom() : onAnswer({ ...base, answer: options.filter((o) => selected.includes(o.value)).map((o) => o.label).join(", "), value: selected }))}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2 text-sm font-semibold text-paper shadow-soft transition-colors hover:bg-canopy disabled:cursor-not-allowed disabled:bg-moss disabled:text-ink-faint disabled:shadow-none"
        >
          {c.continue} <ArrowRight className="h-4 w-4" />
        </button>
      )}

      {(question.allowCustom || options.length === 0 || isNumber) && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitCustom();
          }}
        >
          <label htmlFor={inputId} className="sr-only">
            {isNumber ? c.numberAnswer(question.unit) : c.typeAnswer}
          </label>
          <input
            id={inputId}
            type={isNumber ? "number" : "text"}
            inputMode={isNumber ? "numeric" : undefined}
            min={isNumber ? 1 : undefined}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            maxLength={isNumber ? undefined : 300}
            placeholder={options.length > 0 && !isNumber ? c.orType : isNumber ? c.numberAnswer(question.unit) : c.typeAnswer}
            className="block min-w-0 flex-1 rounded-full border border-line bg-cream/60 px-4 py-2.5 text-ink outline-none placeholder:text-ink-faint focus:border-leaf/50 focus:bg-white focus:ring-4 focus:ring-sprout/60"
          />
          <button
            type="submit"
            disabled={!custom.trim()}
            aria-label={c.send}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest text-paper shadow-soft transition-colors hover:bg-canopy disabled:bg-moss disabled:text-ink-faint disabled:shadow-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
}
