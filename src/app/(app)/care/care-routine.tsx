"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Check, CheckCircle2, Droplets, Leaf as LeafIcon, Plus, Scissors, Sparkles, Bug, Trash2, CircleDot, AlertCircle } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { toast } from "@/components/app/toaster";
import { Card, EmptyState, FieldLabel, PageIntro, Spinner, inputClass, primaryButton, secondaryButton } from "@/components/app/ui";
import { EASE_OUT } from "@/components/motion/reveal";
import type { CareKind, CareTask, TimeOfDay } from "@/lib/care/store";
import { apiFetch } from "@/lib/client-api";
import type { GardenPlant } from "@/lib/garden/store";
import { formatNumber, type Lang } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/language-context";

const KINDS: CareKind[] = ["water", "fertilize", "prune", "pest", "other"];
const TIMES: TimeOfDay[] = ["morning", "afternoon", "evening"];
const EVERY = [1, 2, 3, 4, 5, 7, 10, 14, 15, 21, 30];
const KIND_ICON = { water: Droplets, fertilize: LeafIcon, prune: Scissors, pest: Bug, other: CircleDot } as const;
const KIND_TONE = { water: "bg-sky-100 text-sky-700", fertilize: "bg-sprout text-forest", prune: "bg-moss text-leaf", pest: "bg-clay/15 text-clay", other: "bg-cream text-ink-soft" } as const;

/** A source page from the Agriculture Encyclopedia that supports a suggested task. */
type CareSource = { n: number; article: string; pageRef: string; quote: string };
type Suggestion = {
  plantId: string | null;
  plantName: string | null;
  title: string;
  kind: CareKind;
  everyDays: number;
  timeOfDay: TimeOfDay;
  reason: string;
  sources?: CareSource[];
  selected: boolean;
};

function formatDate(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

export function CareRoutine({ initialTasks, plants, aiConfigured }: { initialTasks: CareTask[]; plants: GardenPlant[]; aiConfigured: boolean }) {
  const { t, lang } = useLanguage();
  const c = t.care;
  const [tasks, setTasks] = useState(initialTasks);
  const errorText = (code: string) =>
    code in t.aiErrors ? t.aiErrors[code as keyof typeof t.aiErrors] : code in t.common.errors ? t.common.errors[code as keyof typeof t.common.errors] : t.common.errors.GENERIC;

  const reload = async () => {
    const result = await apiFetch<{ tasks: CareTask[] }>("/api/care/tasks");
    if (result.ok) setTasks(result.data.tasks);
  };

  const today = tasks.filter((task) => task.dueToday);
  const done = today.filter((task) => task.doneToday).length;

  const toggle = async (task: CareTask) => {
    const next = !task.doneToday;
    setTasks((list) => list.map((x) => (x.id === task.id ? { ...x, doneToday: next } : x)));
    const result = await apiFetch(`/api/care/tasks/${task.id}/done`, { method: "PUT", json: { done: next } });
    if (!result.ok) {
      setTasks((list) => list.map((x) => (x.id === task.id ? { ...x, doneToday: !next } : x)));
      if (result.status !== 401) toast(errorText(result.error), "error");
    } else if (next && done + 1 === today.length) toast(c.allDone);
  };

  const patch = async (task: CareTask, change: Partial<Pick<CareTask, "everyDays" | "timeOfDay">>) => {
    const result = await apiFetch(`/api/care/tasks/${task.id}`, { method: "PATCH", json: change });
    if (result.ok) {
      await reload();
      toast(t.common.saved);
    } else if (result.status !== 401) toast(errorText(result.error), "error");
  };

  const remove = async (task: CareTask) => {
    const result = await apiFetch(`/api/care/tasks/${task.id}`, { method: "DELETE" });
    if (result.ok || result.status === 404) {
      setTasks((list) => list.filter((x) => x.id !== task.id));
      toast(t.common.deleted);
    } else if (result.status !== 401) toast(errorText(result.error), "error");
  };

  const ratio = today.length ? done / today.length : 0;
  const circumference = 2 * Math.PI * 26;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader title={(t) => t.appNav.care} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-5 sm:px-6 sm:py-10">
        <PageIntro title={c.title} subtitle={c.subtitle} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Card title={c.today}>
            {today.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} text={tasks.length ? c.nothingToday : c.noTasks} />
            ) : (
              <>
                <div className="mb-4 flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0">
                    <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden>
                      <circle cx="32" cy="32" r="26" fill="none" stroke="var(--moss)" strokeWidth="6" />
                      <motion.circle
                        cx="32"
                        cy="32"
                        r="26"
                        fill="none"
                        stroke="var(--leaf)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        animate={{ strokeDashoffset: circumference * (1 - ratio) }}
                        transition={{ type: "spring", stiffness: 120, damping: 20 }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-forest">{formatNumber(Math.round(ratio * 100), lang)}%</span>
                  </div>
                  <p className="text-ink-soft" aria-live="polite">
                    {done === today.length ? c.allDone : c.progress(formatNumber(done, lang), formatNumber(today.length, lang))}
                  </p>
                </div>
                <ul className="space-y-2">
                  {today.map((task) => {
                    const Icon = KIND_ICON[task.kind];
                    return (
                      <li key={task.id}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-cream/70 px-4 py-3 transition-colors hover:bg-moss/70">
                          <input type="checkbox" checked={task.doneToday} onChange={() => void toggle(task)} className="peer sr-only" />
                          <span
                            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-leaf ${
                              task.doneToday ? "border-leaf bg-leaf text-paper" : "border-ink-faint/40 bg-white"
                            }`}
                          >
                            {task.doneToday && <Check className="h-4 w-4" strokeWidth={3} />}
                          </span>
                          <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${KIND_TONE[task.kind]}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate ${task.doneToday ? "text-ink-faint line-through" : "text-ink"}`}>{task.title}</span>
                            <span className="block text-xs text-ink-faint">
                              {task.plantName ?? c.wholeGarden} · {c.times[task.timeOfDay]}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <p className="mt-4 text-xs text-ink-faint">{c.remindersNote}</p>
          </Card>

          <SuggestPanel plants={plants} aiConfigured={aiConfigured} errorText={errorText} onAdded={reload} />
        </div>

        <Card title={c.allTasks}>
          {tasks.length === 0 ? (
            <EmptyState icon={<CircleDot className="h-6 w-6" />} text={c.noTasks} />
          ) : (
            <ul className="divide-y divide-line">
              <AnimatePresence initial={false}>
                {tasks.map((task) => (
                  <TaskRow key={task.id} task={task} onPatch={(change) => void patch(task, change)} onDelete={() => void remove(task)} />
                ))}
              </AnimatePresence>
            </ul>
          )}
          <NewTaskForm plants={plants} errorText={errorText} onAdded={reload} />
        </Card>
      </main>
    </div>
  );
}

function TaskRow({ task, onPatch, onDelete }: { task: CareTask; onPatch: (change: Partial<Pick<CareTask, "everyDays" | "timeOfDay">>) => void; onDelete: () => void }) {
  const { t, lang } = useLanguage();
  const c = t.care;
  const [confirm, setConfirm] = useState(false);
  const Icon = KIND_ICON[task.kind];
  const selectClass = "w-full min-w-0 rounded-full border border-line bg-white px-3 py-2 text-sm text-ink-soft sm:py-1.5";
  // Phones: icon · title · delete on one row, the two schedule selects side by side below.
  // Wider screens: everything on one row (the selects' wrapper dissolves into the grid).
  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2.5 py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_9.5rem_9rem_auto] sm:items-center"
    >
      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${KIND_TONE[task.kind]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="line-clamp-2 font-medium leading-snug text-ink">{task.title}</p>
        <p className="mt-0.5 text-xs text-ink-faint">
          {task.plantName ?? c.wholeGarden} · {c.kinds[task.kind]} ·{" "}
          <span className={task.dueToday ? "font-semibold text-leaf" : ""}>{task.dueToday ? c.dueToday : c.nextDue(formatDate(task.nextDue, lang))}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => (confirm ? onDelete() : setConfirm(true))}
        onBlur={() => setConfirm(false)}
        aria-label={confirm ? t.common.confirmDelete : t.common.delete}
        title={confirm ? t.common.confirmDelete : t.common.delete}
        className={`rounded-xl p-2 transition-colors sm:order-last ${confirm ? "bg-clay text-paper" : "text-ink-faint hover:bg-clay/10 hover:text-clay"}`}
      >
        {confirm ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
      </button>
      <div className="col-span-3 grid grid-cols-2 gap-2 pl-12 sm:contents">
        <select aria-label={c.every} value={task.everyDays} onChange={(e) => onPatch({ everyDays: Number(e.target.value) })} className={selectClass}>
          {[...new Set([...EVERY, task.everyDays])].sort((a, b) => a - b).map((n) => (
            <option key={n} value={n}>
              {n === 1 ? c.daily : c.everyDays(formatNumber(n, lang))}
            </option>
          ))}
        </select>
        <select aria-label={c.time} value={task.timeOfDay} onChange={(e) => onPatch({ timeOfDay: e.target.value as TimeOfDay })} className={selectClass}>
          {TIMES.map((time) => (
            <option key={time} value={time}>
              {c.times[time]}
            </option>
          ))}
        </select>
      </div>
    </motion.li>
  );
}

function NewTaskForm({ plants, errorText, onAdded }: { plants: GardenPlant[]; errorText: (code: string) => string; onAdded: () => Promise<void> }) {
  const { t, lang } = useLanguage();
  const c = t.care;
  const [title, setTitle] = useState("");
  const [plantId, setPlantId] = useState<string>("");
  const [kind, setKind] = useState<CareKind>("water");
  const [everyDays, setEveryDays] = useState(1);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("morning");
  const [busy, setBusy] = useState(false);
  const [invalid, setInvalid] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!title.trim()) return setInvalid(true);
    setInvalid(false);
    setBusy(true);
    const result = await apiFetch("/api/care/tasks", { method: "POST", json: { tasks: [{ title: title.trim(), plantId: plantId || null, kind, everyDays, timeOfDay }] } });
    setBusy(false);
    if (result.ok) {
      await onAdded();
      setTitle("");
      toast(t.common.saved);
    } else if (result.status !== 401) toast(errorText(result.error), "error");
  };

  const selectClass = `${inputClass} py-2`;
  return (
    <form onSubmit={submit} noValidate className="mt-5 rounded-2xl border border-dashed border-leaf/30 p-4">
      <p className="mb-3 font-semibold text-ink">{c.newTask}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-1">
          <FieldLabel htmlFor="task-title">{c.taskTitle}</FieldLabel>
          <input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder={c.taskTitlePlaceholder} aria-invalid={invalid} className={inputClass} />
        </div>
        <div>
          <FieldLabel htmlFor="task-plant">{c.plant}</FieldLabel>
          <select id="task-plant" value={plantId} onChange={(e) => setPlantId(e.target.value)} className={selectClass}>
            <option value="">{c.wholeGarden}</option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="task-kind">{c.kind}</FieldLabel>
          <select id="task-kind" value={kind} onChange={(e) => setKind(e.target.value as CareKind)} className={selectClass}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {c.kinds[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="task-every">{c.every}</FieldLabel>
          <select id="task-every" value={everyDays} onChange={(e) => setEveryDays(Number(e.target.value))} className={selectClass}>
            {EVERY.map((n) => (
              <option key={n} value={n}>
                {n === 1 ? c.daily : c.everyDays(formatNumber(n, lang))}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="task-time">{c.time}</FieldLabel>
          <select id="task-time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)} className={selectClass}>
            {TIMES.map((time) => (
              <option key={time} value={time}>
                {c.times[time]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button type="submit" disabled={busy} className={`${primaryButton} mt-4`}>
        {busy ? <Spinner /> : <Plus className="h-4 w-4" />} {t.common.add}
      </button>
    </form>
  );
}

function SuggestPanel({ plants, aiConfigured, errorText, onAdded }: { plants: GardenPlant[]; aiConfigured: boolean; errorText: (code: string) => string; onAdded: () => Promise<void> }) {
  const { t, lang } = useLanguage();
  const c = t.care;
  const [state, setState] = useState<"idle" | "loading" | "review" | "saving">("idle");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const suggest = async () => {
    setError(null);
    setState("loading");
    const result = await apiFetch<{ suggestions: Omit<Suggestion, "selected">[] }>("/api/care/suggest", { method: "POST", json: { lang } }, () => void suggest());
    if (result.ok) {
      setSuggestions(result.data.suggestions.map((s) => ({ ...s, selected: true })));
      setState("review");
    } else {
      setState("idle");
      if (result.status !== 401) setError(result.error === "NO_PLANTS" ? c.suggestNeedsPlants : errorText(result.error));
    }
  };

  const save = async () => {
    const chosen = suggestions.filter((s) => s.selected && s.title.trim());
    if (!chosen.length) return;
    setState("saving");
    const result = await apiFetch("/api/care/tasks", {
      method: "POST",
      json: { tasks: chosen.map(({ plantId, title, kind, everyDays, timeOfDay }) => ({ plantId, title: title.trim().slice(0, 80), kind, everyDays, timeOfDay })) },
    });
    if (result.ok) {
      await onAdded();
      toast(c.added(formatNumber(chosen.length, lang)));
      setSuggestions([]);
      setState("idle");
    } else {
      setState("review");
      if (result.status !== 401) toast(errorText(result.error), "error");
    }
  };

  const selectedCount = suggestions.filter((s) => s.selected).length;

  return (
    <Card title={c.suggestTitle} className="bg-gradient-to-br from-white to-cream">
      {state !== "review" && state !== "saving" && (
        <>
          <p className="text-sm text-ink-soft">{c.suggestBody}</p>
          {plants.length === 0 ? (
            <p className="mt-4 text-sm text-clay">
              {c.suggestNeedsPlants}{" "}
              <Link href="/garden" className="font-semibold text-forest underline">
                {t.appNav.garden}
              </Link>
            </p>
          ) : (
            <button type="button" onClick={() => void suggest()} disabled={!aiConfigured || state === "loading"} className={`${primaryButton} mt-4 w-full`}>
              {state === "loading" ? <Spinner /> : <Sparkles className="h-4 w-4" />} {state === "loading" ? c.suggesting : c.suggestButton}
            </button>
          )}
          {!aiConfigured && <p className="mt-3 text-xs text-ink-faint">{t.chat.notConfiguredTitle}</p>}
          {error && (
            <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-clay">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
        </>
      )}

      {(state === "review" || state === "saving") && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="mb-3 text-sm font-medium text-ink">{c.suggestReview}</p>
          <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
            {suggestions.map((s, i) => (
              <li key={i} className={`rounded-2xl p-3 ring-1 transition-colors ${s.selected ? "bg-white ring-leaf/40" : "bg-cream/60 ring-line"}`}>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={s.selected}
                    onChange={() => setSuggestions((list) => list.map((x, j) => (j === i ? { ...x, selected: !x.selected } : x)))}
                    aria-label={s.title}
                    className="mt-1.5 h-4 w-4 accent-[var(--leaf)]"
                  />
                  <div className="min-w-0 flex-1">
                    <input
                      value={s.title}
                      onChange={(e) => setSuggestions((list) => list.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                      maxLength={80}
                      className="w-full rounded-lg bg-transparent px-1 py-0.5 font-medium text-ink outline-none focus:bg-cream"
                    />
                    <p className="px-1 text-xs text-ink-faint">
                      {s.plantName ?? c.wholeGarden} · {c.kinds[s.kind]} · {s.everyDays === 1 ? c.daily : c.everyDays(formatNumber(s.everyDays, lang))} · {c.times[s.timeOfDay]}
                    </p>
                    {s.reason && <p className="mt-1 px-1 text-xs text-ink-soft">{s.reason}</p>}
                    {s.sources?.map((source) => (
                      <p key={source.n} className="mt-1 px-1 text-[11px] text-leaf" title={source.quote}>
                        📖 {source.article} — {source.pageRef}
                      </p>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => void save()} disabled={!selectedCount || state === "saving"} className={`${primaryButton} flex-1`}>
              {state === "saving" ? <Spinner /> : <Plus className="h-4 w-4" />} {c.addSelected(formatNumber(selectedCount, lang))}
            </button>
            <button type="button" onClick={() => (setSuggestions([]), setState("idle"))} disabled={state === "saving"} className={secondaryButton}>
              {c.discard}
            </button>
          </div>
        </motion.div>
      )}
    </Card>
  );
}
