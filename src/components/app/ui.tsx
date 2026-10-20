import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

/** Shared building blocks for the signed-in pages, so they look and behave consistently. */

export const inputClass =
  "block w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-faint focus:border-leaf/50 focus:ring-4 focus:ring-sprout/60 disabled:opacity-60 aria-invalid:border-clay/70";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-forest px-5 py-2.5 font-semibold text-paper shadow-soft transition-colors hover:bg-canopy active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-moss disabled:text-ink-faint disabled:shadow-none";

export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-forest ring-1 ring-line transition-colors hover:bg-moss active:scale-[0.98] disabled:opacity-50";

export function PageIntro({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl text-ink sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-soft sm:mt-2 sm:text-base">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl bg-white p-5 shadow-soft ring-1 ring-line sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-semibold text-ink">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
      {children}
    </label>
  );
}

/** Validation message shown under an input; link it with aria-describedby={`${id}-error`}. */
export function FieldError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} className="mt-1 text-xs text-clay">
      {message}
    </p>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden />;
}

export function EmptyState({ icon, text, action }: { icon: ReactNode; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-cream/70 px-4 py-8 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-moss text-forest">{icon}</span>
      <p className="text-ink-soft">{text}</p>
      {action}
    </div>
  );
}
