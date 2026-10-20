"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CalendarCheck, Check, Minus, Plus, Sprout, Sun, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { toast } from "@/components/app/toaster";
import { Card, EmptyState, FieldError, FieldLabel, PageIntro, Spinner, inputClass, primaryButton, secondaryButton } from "@/components/app/ui";
import { EASE_OUT } from "@/components/motion/reveal";
import { apiFetch } from "@/lib/client-api";
import type { Garden, GardenPlant } from "@/lib/garden/store";
import { formatNumber } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/language-context";

const SUN_OPTIONS = [2, 4, 6, 8, 10];

export function GardenManager({ initial }: { initial: Garden }) {
  const { t, lang } = useLanguage();
  const g = t.garden;
  const [sunHours, setSunHours] = useState<number | null>(initial.sunHours);
  const [plants, setPlants] = useState<GardenPlant[]>(initial.plants);
  const [savingSun, setSavingSun] = useState(false);

  const errorText = (code: string) => (code in t.common.errors ? t.common.errors[code as keyof typeof t.common.errors] : t.common.errors.GENERIC);

  const saveSun = async (value: number | null) => {
    const previous = sunHours;
    setSunHours(value);
    setSavingSun(true);
    const result = await apiFetch<Garden>("/api/garden", { method: "PUT", json: { sunHours: value } });
    setSavingSun(false);
    if (result.ok) toast(t.common.saved);
    else {
      setSunHours(previous);
      if (result.status !== 401) toast(errorText(result.error), "error");
    }
  };

  const updatePots = async (plant: GardenPlant, potCount: number) => {
    if (potCount < 1 || potCount > 500) return;
    setPlants((list) => list.map((p) => (p.id === plant.id ? { ...p, potCount } : p)));
    const result = await apiFetch(`/api/garden/plants/${plant.id}`, { method: "PATCH", json: { potCount } });
    if (!result.ok) {
      setPlants((list) => list.map((p) => (p.id === plant.id ? plant : p)));
      if (result.status !== 401) toast(errorText(result.error), "error");
    }
  };

  const remove = async (plant: GardenPlant) => {
    const result = await apiFetch(`/api/garden/plants/${plant.id}`, { method: "DELETE" });
    if (result.ok || result.status === 404) {
      setPlants((list) => list.filter((p) => p.id !== plant.id));
      toast(t.common.deleted);
    } else if (result.status !== 401) toast(errorText(result.error), "error");
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader title={(t) => t.appNav.garden} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-5 sm:px-6 sm:py-10">
        <PageIntro title={g.title} subtitle={g.subtitle} />

        <Card title={g.sunTitle} action={savingSun ? <Spinner className="h-4 w-4 text-leaf" /> : undefined}>
          <p className="mb-3 flex items-center gap-2 text-sm text-ink-soft">
            <Sun className="h-4 w-4 text-clay" /> {g.sunHelp}
          </p>
          <div role="radiogroup" aria-label={g.sunTitle} className="flex flex-wrap gap-2">
            {[...SUN_OPTIONS, null].map((value) => {
              const selected = sunHours === value;
              return (
                <button
                  key={value ?? "unknown"}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={savingSun}
                  onClick={() => !selected && void saveSun(value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    selected ? "bg-forest text-paper" : "bg-cream text-ink-soft ring-1 ring-line hover:bg-moss hover:text-forest"
                  }`}
                >
                  {value === null ? g.sunUnknown : g.sunHours(formatNumber(value, lang))}
                </button>
              );
            })}
          </div>
        </Card>

        <Card
          title={g.plantsTitle}
          action={
            plants.length > 0 ? (
              <Link href="/care" className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline">
                <CalendarCheck className="h-4 w-4" /> {g.makeRoutine}
              </Link>
            ) : undefined
          }
        >
          {plants.length === 0 ? (
            <EmptyState icon={<Sprout className="h-6 w-6" />} text={g.empty} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              <AnimatePresence initial={false}>
                {plants.map((plant) => (
                  <PlantRow key={plant.id} plant={plant} onPots={(n) => void updatePots(plant, n)} onDelete={() => void remove(plant)} />
                ))}
              </AnimatePresence>
            </ul>
          )}
          <AddPlantForm onAdded={(plant) => setPlants((list) => [...list, plant])} errorText={errorText} existing={plants.map((p) => p.name)} />
          <p className="mt-4 text-xs text-ink-faint">{g.aiNote}</p>
        </Card>
      </main>
    </div>
  );
}

function PlantRow({ plant, onPots, onDelete }: { plant: GardenPlant; onPots: (n: number) => void; onDelete: () => void }) {
  const { t, lang } = useLanguage();
  const [confirm, setConfirm] = useState(false);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
      className="flex items-center gap-3 rounded-2xl bg-cream/70 p-3 ring-1 ring-line"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sprout text-forest">
        <Sprout className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{plant.name}</p>
        {plant.notes && <p className="truncate text-xs text-ink-faint">{plant.notes}</p>}
        <div className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
          <button type="button" onClick={() => onPots(plant.potCount - 1)} disabled={plant.potCount <= 1} aria-label="−" className="rounded-full p-1 hover:bg-moss disabled:opacity-30">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[4.5rem] text-center">{t.garden.potsCount(formatNumber(plant.potCount, lang))}</span>
          <button type="button" onClick={() => onPots(plant.potCount + 1)} aria-label="+" className="rounded-full p-1 hover:bg-moss">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => (confirm ? onDelete() : setConfirm(true))}
        onBlur={() => setConfirm(false)}
        aria-label={confirm ? t.common.confirmDelete : t.common.delete}
        title={confirm ? t.common.confirmDelete : t.common.delete}
        className={`rounded-xl p-2 transition-colors ${confirm ? "bg-clay text-paper" : "text-ink-faint hover:bg-clay/10 hover:text-clay"}`}
      >
        {confirm ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </motion.li>
  );
}

function AddPlantForm({ onAdded, errorText, existing }: { onAdded: (plant: GardenPlant) => void; errorText: (code: string) => string; existing: string[] }) {
  const { t } = useLanguage();
  const g = t.garden;
  const [name, setName] = useState("");
  const [pots, setPots] = useState("1");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const potCount = Number.parseInt(pots, 10);
    const local = [!name.trim() && "name", !(potCount >= 1 && potCount <= 500) && "potCount"].filter(Boolean) as string[];
    setFieldErrors(local);
    if (local.length) return;
    setBusy(true);
    const result = await apiFetch<{ plant: GardenPlant }>("/api/garden/plants", { method: "POST", json: { name: name.trim(), potCount, notes: notes.trim() } });
    setBusy(false);
    if (result.ok) {
      onAdded(result.data.plant);
      toast(t.common.saved);
      setName("");
      setPots("1");
      setNotes("");
    } else if (result.status !== 401) {
      setFieldErrors(result.fields ?? []);
      toast(errorText(result.error), "error");
    }
  };

  const quickPicks = g.suggestions.filter((s) => !existing.includes(s)).slice(0, 6);

  return (
    <form onSubmit={submit} noValidate className="mt-5 rounded-2xl border border-dashed border-leaf/30 p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end">
        <div>
          <FieldLabel htmlFor="plant-name">{g.name}</FieldLabel>
          <input
            id="plant-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder={g.namePlaceholder}
            aria-invalid={fieldErrors.includes("name")}
            aria-describedby={fieldErrors.includes("name") ? "plant-name-error" : undefined}
            className={inputClass}
          />
          <FieldError id="plant-name" message={fieldErrors.includes("name") ? t.common.errors.VALIDATION_FAILED : null} />
        </div>
        <div>
          <FieldLabel htmlFor="plant-pots">{g.pots}</FieldLabel>
          <input
            id="plant-pots"
            type="number"
            inputMode="numeric"
            min={1}
            max={500}
            value={pots}
            onChange={(e) => setPots(e.target.value)}
            aria-invalid={fieldErrors.includes("potCount")}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel htmlFor="plant-notes">{g.notes}</FieldLabel>
          <input id="plant-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} placeholder={g.notesPlaceholder} className={inputClass} />
        </div>
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? <Spinner /> : <Plus className="h-4 w-4" />} {g.addPlant}
        </button>
      </div>
      {quickPicks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {quickPicks.map((pick) => (
            <button key={pick} type="button" onClick={() => setName(pick)} className={`${secondaryButton} px-3 py-1 text-xs`}>
              + {pick}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
