"use client";

import { useId, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Plus, Sparkles, X } from "lucide-react";
import { EASE_OUT } from "@/components/motion/reveal";
import { EXPERIENCE, MAINTENANCE, SPACE_TYPES, SUNLIGHT, missingFields, type RequirementField, type Requirements } from "@/lib/designer/schema";
import { useLanguage } from "@/lib/i18n/language-context";

interface ReviewProps {
  requirements: Requirements;
  onChange: (next: Requirements) => void;
  onConfirm: () => void;
  onBack: () => void;
}

/** Every collected requirement, editable in place, before the design is generated. */
export function RequirementsReview({ requirements: r, onChange, onConfirm, onBack }: ReviewProps) {
  const { t } = useLanguage();
  const v = t.designer.review;
  const values = t.designer.values;
  const missing = new Set(missingFields(r));
  const set = <K extends keyof Requirements>(key: K, value: Requirements[K]) => onChange({ ...r, [key]: value });
  const container = { hidden: {}, shown: { transition: { staggerChildren: 0.05 } } };

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_OUT }} className="rounded-[28px] bg-white p-5 shadow-soft ring-1 ring-line sm:p-7">
      <h2 className="font-display text-2xl text-ink">{v.title}</h2>
      <p className="mt-1 text-ink-soft">{v.subtitle}</p>

      <motion.div variants={container} initial="hidden" animate="shown" className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label={v.fields.spaceType} missing={missing.has("spaceType")}>
          <ChipSelect options={SPACE_TYPES} labels={values.spaceType} value={r.spaceType} onSelect={(x) => set("spaceType", x)} />
        </Field>
        <Field label={v.fields.sunlight} missing={missing.has("sunlight")}>
          <ChipSelect options={SUNLIGHT} labels={values.sunlight} value={r.sunlight} onSelect={(x) => set("sunlight", x)} />
        </Field>
        <NumberField field="areaSqft" label={v.fields.areaSqft} unit={v.units.sqft} value={r.areaSqft} missing={missing.has("areaSqft")} onChange={(n) => set("areaSqft", n)} />
        <NumberField field="budgetBdt" label={v.fields.budgetBdt} unit="৳" value={r.budgetBdt} missing={missing.has("budgetBdt")} onChange={(n) => set("budgetBdt", n)} />
        <NumberField field="potCount" label={v.fields.potCount} unit={v.units.pots} value={r.potCount} missing={missing.has("potCount")} onChange={(n) => set("potCount", n)} />
        <Field label={v.fields.style} missing={missing.has("style")} htmlFor="req-style">
          <input
            id="req-style"
            value={r.style ?? ""}
            maxLength={120}
            onChange={(e) => set("style", e.target.value.trim() ? e.target.value : null)}
            className="block w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-ink outline-none focus:border-leaf/50 focus:ring-4 focus:ring-sprout/60"
          />
        </Field>
        <Field label={v.fields.experience} missing={missing.has("experience")}>
          <ChipSelect options={EXPERIENCE} labels={values.experience} value={r.experience} onSelect={(x) => set("experience", x)} />
        </Field>
        <Field label={v.fields.maintenance} missing={missing.has("maintenance")}>
          <ChipSelect options={MAINTENANCE} labels={values.maintenance} value={r.maintenance} onSelect={(x) => set("maintenance", x)} />
        </Field>
        <Field label={v.fields.preferredPlants} missing={missing.has("preferredPlants")} wide>
          <TagEditor items={r.preferredPlants} max={12} onChange={(items) => set("preferredPlants", items)} />
        </Field>
        <Field label={v.notes} wide>
          {r.notes.length === 0 ? (
            <p className="text-sm text-ink-faint">{v.noNotes}</p>
          ) : (
            <ul className="space-y-1.5">
              {r.notes.map((note, index) => (
                <li key={`${index}-${note}`} className="flex items-start justify-between gap-2 rounded-xl bg-cream/70 px-3 py-2 text-sm text-ink-soft">
                  {note}
                  <button type="button" aria-label={`${t.common.delete}: ${note}`} onClick={() => set("notes", r.notes.filter((n) => n !== note))} className="rounded-full p-0.5 text-ink-faint hover:bg-moss hover:text-clay">
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>
      </motion.div>

      {missing.size > 0 && (
        <p role="status" className="mt-5 rounded-2xl bg-[#fbf3dd] px-4 py-3 text-sm text-[#6b4f10]">
          {v.missing}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <button type="button" onClick={onBack} className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold text-forest ring-1 ring-line hover:bg-moss">
          <ArrowLeft className="h-4 w-4" /> {v.backToChat}
        </button>
        <motion.button
          type="button"
          onClick={onConfirm}
          disabled={missing.size > 0}
          whileHover={missing.size === 0 ? { y: -1 } : undefined}
          whileTap={missing.size === 0 ? { scale: 0.98 } : undefined}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-forest px-6 py-3 font-semibold text-paper shadow-soft transition-colors hover:bg-canopy disabled:cursor-not-allowed disabled:bg-moss disabled:text-ink-faint disabled:shadow-none"
        >
          <Sparkles className="h-4 w-4" /> {v.confirm}
        </motion.button>
      </div>
    </motion.section>
  );
}

const item = { hidden: { opacity: 0, y: 10 }, shown: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } } };

function Field({ label, missing = false, wide = false, htmlFor, children }: { label: string; missing?: boolean; wide?: boolean; htmlFor?: string; children: React.ReactNode }) {
  const { t } = useLanguage();
  const Label = htmlFor ? "label" : "p";
  return (
    <motion.div variants={item} className={`rounded-2xl p-4 ring-1 transition-colors ${missing ? "bg-[#fdf8ea] ring-[#e9cf8a]" : "bg-cream/50 ring-line"} ${wide ? "md:col-span-2" : ""}`}>
      <Label {...(htmlFor ? { htmlFor } : {})} className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-ink">
        {label}
        {missing && <span className="text-xs font-normal text-[#8a6614]">{t.designer.review.notSet}</span>}
      </Label>
      {children}
    </motion.div>
  );
}

function ChipSelect<T extends string>({ options, labels, value, onSelect }: { options: readonly T[]; labels: Record<T, string>; value: T | null; onSelect: (value: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(option)}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${active ? "bg-forest font-semibold text-paper" : "bg-white text-ink-soft ring-1 ring-line hover:bg-moss hover:text-forest"}`}
          >
            {labels[option]}
          </button>
        );
      })}
    </div>
  );
}

function NumberField({ field, label, unit, value, missing, onChange }: { field: RequirementField; label: string; unit: string; value: number | null; missing: boolean; onChange: (n: number | null) => void }) {
  const id = `req-${field}`;
  return (
    <Field label={label} missing={missing} htmlFor={id}>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          value={value ?? ""}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(e.target.value && Number.isFinite(n) && n > 0 ? n : null);
          }}
          className="block w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-ink outline-none focus:border-leaf/50 focus:ring-4 focus:ring-sprout/60"
        />
        <span className="shrink-0 text-sm text-ink-soft">{unit}</span>
      </div>
    </Field>
  );
}

function TagEditor({ items, max, onChange }: { items: string[]; max: number; onChange: (items: string[]) => void }) {
  const { t } = useLanguage();
  const v = t.designer.review;
  const id = useId();
  const [draft, setDraft] = useState("");
  const add = () => {
    const text = draft.trim().slice(0, 60);
    if (!text || items.includes(text) || items.length >= max) return;
    onChange([...items, text]);
    setDraft("");
  };
  return (
    <div>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((plant, index) => (
          <li key={`${index}-${plant}`} className="inline-flex items-center gap-1 rounded-full bg-sprout/70 py-1 pr-1 pl-3 text-sm text-forest">
            {plant}
            <button type="button" aria-label={`${t.common.delete}: ${plant}`} onClick={() => onChange(items.filter((x) => x !== plant))} className="rounded-full p-0.5 hover:bg-white/70">
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label htmlFor={id} className="sr-only">
          {v.fields.preferredPlants}
        </label>
        <input
          id={id}
          value={draft}
          maxLength={60}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={v.addPlantPlaceholder}
          className="block min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-leaf/50 focus:ring-4 focus:ring-sprout/60"
        />
        <button type="submit" disabled={!draft.trim()} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-sm font-semibold text-forest ring-1 ring-line hover:bg-moss disabled:opacity-50">
          <Plus className="h-4 w-4" /> {v.addPlant}
        </button>
      </form>
    </div>
  );
}
