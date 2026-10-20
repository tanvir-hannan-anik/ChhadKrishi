"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCircle2,
  HelpCircle,
  ImagePlus,
  Leaf as LeafIcon,
  Loader2,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { ResourceCards } from "@/components/chat/resource-cards";
import { EASE_OUT } from "@/components/motion/reveal";
import type { PlantAnalysis } from "@/lib/ai/analysis-schema";
import { IMAGE_LIMITS } from "@/lib/ai/analysis-schema";
import { aiErrorCodeOf } from "@/lib/ai/client-errors";
import type { AiErrorCode } from "@/lib/ai/errors";
import { openAuthModal } from "@/lib/auth/flow";
import { setChatDraft } from "@/lib/chat-draft";
import type { ChatResources } from "@/lib/chat/resources";
import { checkImageFile, prepareImage, type ImageProblem } from "@/lib/image";
import { useLanguage } from "@/lib/i18n/language-context";

type Phase =
  | { name: "empty" }
  | { name: "ready" }
  | { name: "analyzing" }
  | { name: "done"; result: PlantAnalysis }
  | { name: "error"; code: AiErrorCode };

export function PlantAnalyzer({ aiConfigured }: { aiConfigured: boolean }) {
  const { t, lang } = useLanguage();
  const a = t.analyze;
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: "empty" });
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<ImageProblem | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  const choose = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
    if (!file) return;
    const issue = checkImageFile(file);
    if (issue) return setProblem(issue);
    setProblem(null);
    setPreparing(true);
    try {
      const prepared = await prepareImage(file);
      setPhoto({ file: prepared, url: URL.createObjectURL(prepared) });
      setPhase({ name: "ready" });
    } catch (error) {
      setProblem(((error as Error).message as ImageProblem) || "imageUnreadable");
    } finally {
      setPreparing(false);
    }
  };

  const analyze = async () => {
    if (!photo || phase.name === "analyzing") return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase({ name: "analyzing" });

    const body = new FormData();
    body.set("image", photo.file);
    body.set("note", note.trim());
    body.set("lang", lang);
    try {
      const response = await fetch("/api/analyze", { method: "POST", body, signal: controller.signal });
      const data = (await response.json().catch(() => null)) as { analysis?: PlantAnalysis; error?: string } | null;
      if (controller.signal.aborted) return;
      if (response.ok && data?.analysis) {
        setPhase({ name: "done", result: data.analysis });
        return;
      }
      const code = aiErrorCodeOf({ statusCode: response.status, responseBody: JSON.stringify(data ?? {}) });
      setPhase({ name: "error", code });
      if (code === "UNAUTHORIZED") openAuthModal({ expired: true, pending: { kind: "retry", run: () => void analyzeRef.current() } });
    } catch (error) {
      if (controller.signal.aborted) return;
      setPhase({ name: "error", code: aiErrorCodeOf(error) });
    }
  };
  const analyzeRef = useRef(analyze);
  useEffect(() => {
    analyzeRef.current = analyze;
  });

  const cancel = () => {
    abortRef.current?.abort();
    setPhase({ name: "ready" });
  };

  const reset = () => {
    abortRef.current?.abort();
    setPhoto(null);
    setNote("");
    setPhase({ name: "empty" });
  };

  const askInChat = (result: PlantAnalysis) => {
    const question = a.results.askPrompt(result.summary);
    setChatDraft({ text: question, image: photo?.file ?? null });
    router.push(`/chat?q=${encodeURIComponent(question)}`);
  };

  const analyzing = phase.name === "analyzing";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader title={(t) => t.analyze.title} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 sm:py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_OUT }}>
          <h1 className="font-display text-2xl text-ink sm:text-4xl">{a.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft sm:mt-2 sm:text-base">{a.subtitle}</p>
        </motion.div>

        {!aiConfigured && (
          <div role="status" className="mt-6 rounded-3xl bg-cream p-5 ring-1 ring-line">
            <p className="flex items-center gap-2 font-semibold text-forest">
              <AlertCircle className="h-5 w-5" /> {t.chat.notConfiguredTitle}
            </p>
            <p className="mt-1.5 text-sm text-ink-soft">{t.chat.notConfiguredBody}</p>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10">
          {/* Photo column */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept={IMAGE_LIMITS.acceptedTypes.join(",")}
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => void choose(e.target.files?.[0])}
            />
            {/* Opens the rear camera directly on phones. */}
            <input
              ref={cameraRef}
              type="file"
              accept={IMAGE_LIMITS.acceptedTypes.join(",")}
              capture="environment"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => void choose(e.target.files?.[0])}
            />
            {!photo ? (
              <>
              <motion.button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  void choose(e.dataTransfer.files?.[0]);
                }}
                whileTap={{ scale: 0.99 }}
                disabled={preparing}
                className={`flex aspect-[16/10] w-full flex-col items-center justify-center gap-3 rounded-[28px] border-2 border-dashed p-6 text-center transition-colors sm:aspect-[4/3] ${
                  dragging ? "border-leaf bg-sprout/40" : "border-leaf/30 bg-white hover:border-leaf/60 hover:bg-cream"
                }`}
              >
                {preparing ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-leaf" />
                    <span className="text-ink-soft">{a.preparing}</span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-moss text-forest">
                      <Camera className="h-7 w-7" />
                    </span>
                    <span className="font-semibold text-ink">
                      <span className="sm:hidden">{t.capture.tapToChoose}</span>
                      <span className="hidden sm:inline">{dragging ? a.dropActive : a.dropTitle}</span>
                    </span>
                    <span className="text-sm text-ink-faint">{a.dropHint}</span>
                  </>
                )}
              </motion.button>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  disabled={preparing}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest px-4 font-semibold text-paper shadow-soft active:scale-[0.98] disabled:opacity-60"
                >
                  <Camera className="h-5 w-5" /> {t.capture.takePhoto}
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={preparing}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-4 font-semibold text-forest ring-1 ring-line active:scale-[0.98] disabled:opacity-60"
                >
                  <ImagePlus className="h-5 w-5" /> {t.capture.gallery}
                </button>
              </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
                className="relative overflow-hidden rounded-[28px] bg-ink shadow-lift"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                <img src={photo.url} alt={a.title} className={`aspect-[4/3] w-full object-cover transition-[filter] duration-500 ${analyzing ? "brightness-90 saturate-75" : ""}`} />
                {analyzing && <ScanOverlay />}
                {!analyzing && (
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => cameraRef.current?.click()}
                      aria-label={t.capture.takePhoto}
                      title={t.capture.takePhoto}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-forest shadow-soft backdrop-blur hover:bg-white pointer-fine:hidden"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white/90 px-3.5 text-sm font-semibold text-forest shadow-soft backdrop-blur hover:bg-white"
                    >
                      <ImagePlus className="h-4 w-4" /> {a.change}
                    </button>
                    <button type="button" onClick={reset} aria-label={a.remove} title={a.remove} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-soft backdrop-blur hover:bg-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            <AnimatePresence>
              {problem && (
                <motion.p role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 flex items-center gap-2 text-sm text-clay">
                  <AlertCircle className="h-4 w-4" /> {a[problem]}
                </motion.p>
              )}
            </AnimatePresence>

            {photo && phase.name !== "done" && (
              <div className="mt-5">
                <label htmlFor="analysis-note" className="mb-1.5 block text-sm font-medium text-ink">
                  {a.noteLabel}
                </label>
                <textarea
                  id="analysis-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={IMAGE_LIMITS.maxNoteLength}
                  rows={2}
                  disabled={analyzing}
                  placeholder={a.notePlaceholder}
                  className="block w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-ink outline-none placeholder:text-ink-faint focus:border-leaf/50 focus:ring-4 focus:ring-sprout/60 disabled:opacity-60"
                />
                <div className="mt-4 flex gap-2">
                  {analyzing ? (
                    <button
                      type="button"
                      onClick={cancel}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white py-3 font-semibold text-ink ring-1 ring-line hover:bg-moss"
                    >
                      <X className="h-4 w-4" /> {a.cancel}
                    </button>
                  ) : (
                    <motion.button
                      type="button"
                      onClick={() => void analyze()}
                      disabled={!aiConfigured}
                      whileHover={aiConfigured ? { y: -1 } : undefined}
                      whileTap={aiConfigured ? { scale: 0.98 } : undefined}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-forest py-3 font-semibold text-paper shadow-soft transition-colors hover:bg-canopy disabled:cursor-not-allowed disabled:bg-moss disabled:text-ink-faint disabled:shadow-none"
                    >
                      <Sparkles className="h-4 w-4" /> {a.submit}
                    </motion.button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Result column */}
          <div aria-live="polite">
            <AnimatePresence mode="wait">
              {phase.name === "analyzing" && <AnalyzingSteps key="steps" />}
              {phase.name === "error" && (
                <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="rounded-3xl bg-clay/10 p-6">
                  <p className="flex items-center gap-2 font-semibold text-clay">
                    <AlertTriangle className="h-5 w-5" /> {t.aiErrors[phase.code]}
                  </p>
                  {phase.code !== "AI_NOT_CONFIGURED" && phase.code !== "UNAUTHORIZED" && (
                    <button
                      type="button"
                      onClick={() => void analyze()}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-forest ring-1 ring-line hover:bg-moss"
                    >
                      <RotateCcw className="h-4 w-4" /> {t.chat.retry}
                    </button>
                  )}
                </motion.div>
              )}
              {phase.name === "done" && (
                <AnalysisResult key="result" result={phase.result} onAsk={() => askInChat(phase.result)} onReset={reset} />
              )}
              {(phase.name === "empty" || phase.name === "ready") && <Tips key="tips" />}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

function ScanOverlay() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <span className="absolute inset-x-6 h-0.5 animate-scan rounded-full bg-lime shadow-[0_0_18px_6px_rgb(122_194_26/0.55)]" />
      {["top-4 left-4 border-t-2 border-l-2", "top-4 right-4 border-t-2 border-r-2", "bottom-4 left-4 border-b-2 border-l-2", "bottom-4 right-4 border-b-2 border-r-2"].map((pos) => (
        <span key={pos} className={`absolute h-8 w-8 rounded-sm border-paper ${pos}`} />
      ))}
    </div>
  );
}

function AnalyzingSteps() {
  const { t } = useLanguage();
  const steps = t.analyze.analyzingSteps;
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setIndex((i) => Math.min(i + 1, steps.length - 1)), 2200);
    return () => window.clearInterval(id);
  }, [steps.length]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status" className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line">
      <ul className="space-y-3">
        {steps.map((step, i) => (
          <li key={step} className={`flex items-center gap-3 transition-colors ${i <= index ? "text-ink" : "text-ink-faint"}`}>
            {i < index ? (
              <CheckCircle2 className="h-5 w-5 text-leaf" />
            ) : i === index ? (
              <Loader2 className="h-5 w-5 animate-spin text-leaf" />
            ) : (
              <span className="h-5 w-5 rounded-full border-2 border-moss" />
            )}
            {step}
          </li>
        ))}
      </ul>
      <div className="mt-6 space-y-2.5">
        {[90, 70, 80].map((w, i) => (
          <div key={i} className="h-3 animate-pulse rounded-full bg-moss/70" style={{ width: `${w}%` }} />
        ))}
      </div>
    </motion.div>
  );
}

function Tips() {
  const { t, lang } = useLanguage();
  const tips =
    lang === "bn"
      ? ["আক্রান্ত পাতার খুব কাছ থেকে তুলুন", "দিনের আলোতে, ছায়া ছাড়া", "পাতার উপর ও নিচ দুই দিকই দেখান"]
      : ["Get close to the affected leaf", "Use daylight, avoid harsh shadows", "Show both the top and underside"];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-3xl bg-cream p-6 ring-1 ring-line">
      <p className="flex items-center gap-2 font-semibold text-forest">
        <Camera className="h-5 w-5" /> {t.analyze.tipsTitle}
      </p>
      <ul className="mt-3 space-y-2 text-ink-soft">
        {tips.map((tip) => (
          <li key={tip} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf" /> {tip}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

const LEVEL_TONE = { low: "bg-sprout/70 text-forest", medium: "bg-[#f4e3b5] text-[#7a5a12]", high: "bg-clay/15 text-clay" } as const;
const HEALTH_TONE = { healthy: "bg-sprout/70 text-forest", issues: "bg-clay/15 text-clay", unclear: "bg-moss text-ink-soft" } as const;

function AnalysisResult({ result, onAsk, onReset }: { result: PlantAnalysis; onAsk: () => void; onReset: () => void }) {
  const { t } = useLanguage();
  const r = t.analyze.results;
  const container = { hidden: {}, shown: { transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 12 }, shown: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } } };
  const HealthIcon = result.healthStatus === "healthy" ? CheckCircle2 : result.healthStatus === "issues" ? AlertTriangle : HelpCircle;

  return (
    <motion.div variants={container} initial="hidden" animate="shown" exit={{ opacity: 0 }} className="space-y-4">
      <motion.section variants={item} className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line">
        <p className="text-sm font-semibold text-leaf">{r.title}</p>
        {result.isPlant ? (
          <>
            <h2 className="mt-1 font-display text-2xl text-ink">{result.plant.commonName || r.unknownPlant}</h2>
            {result.plant.scientificName && <p className="text-sm text-ink-faint italic">{result.plant.scientificName}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${HEALTH_TONE[result.healthStatus]}`}>
                <HealthIcon className="h-4 w-4" /> {r.healthStatus[result.healthStatus]}
              </span>
              <span className={`rounded-full px-3 py-1 ${LEVEL_TONE[result.confidence]}`}>
                {r.confidence}: {r.levels[result.confidence]}
              </span>
              {result.healthStatus !== "healthy" && (
                <span className={`rounded-full px-3 py-1 ${LEVEL_TONE[result.urgency]}`}>
                  {r.urgency}: {r.levels[result.urgency]}
                </span>
              )}
            </div>
            <p className="mt-4 text-ink-soft">{result.summary}</p>
          </>
        ) : (
          <>
            <h2 className="mt-1 font-display text-2xl text-ink">{r.notPlantTitle}</h2>
            <p className="mt-2 text-ink-soft">{result.summary || r.notPlantBody}</p>
          </>
        )}
      </motion.section>

      {result.needsBetterPhoto && result.photoTips.length > 0 && (
        <motion.section variants={item} className="rounded-3xl bg-[#fbf3dd] p-5 text-[#6b4f10]">
          <p className="flex items-center gap-2 font-semibold">
            <Camera className="h-5 w-5" /> {r.betterPhotoTitle}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
            {result.photoTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </motion.section>
      )}

      {result.isPlant && (
        <motion.section variants={item} className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line">
          <h3 className="font-semibold text-ink">{r.issues}</h3>
          {result.issues.length === 0 ? (
            <p className="mt-2 text-ink-soft">{r.noIssues}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {result.issues.map((issue) => (
                <li key={issue.name} className="rounded-2xl bg-cream/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-ink">{issue.name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${LEVEL_TONE[issue.likelihood]}`}>
                      {r.likelihood}: {r.levels[issue.likelihood]}
                    </span>
                  </div>
                  {issue.signs.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft marker:text-leaf">
                      {issue.signs.map((sign) => (
                        <li key={sign}>{sign}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      )}

      {result.treatment.length > 0 && (
        <motion.section variants={item} className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line">
          <h3 className="font-semibold text-ink">{r.treatment}</h3>
          <ol className="mt-3 space-y-3">
            {result.treatment.map((step, i) => (
              <li key={step.step} className="flex gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest text-sm font-semibold text-paper">{i + 1}</span>
                <div>
                  <p className="text-ink">{step.step}</p>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${step.organic ? "bg-sprout/70 text-forest" : "bg-clay/15 text-clay"}`}
                  >
                    {step.organic ? <LeafIcon className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    {step.organic ? r.organic : r.nonOrganic}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </motion.section>
      )}

      {result.prevention.length > 0 && (
        <motion.section variants={item} className="rounded-3xl bg-cream p-6 ring-1 ring-line">
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <ShieldCheck className="h-5 w-5 text-leaf" /> {r.prevention}
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-ink-soft marker:text-leaf">
            {result.prevention.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </motion.section>
      )}

      {result.isPlant && (result.issues.length > 0 || result.treatment.length > 0) && (
        <motion.div variants={item}>
          <AnalysisResources result={result} />
        </motion.div>
      )}

      <motion.div variants={item} className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onAsk}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-forest px-5 py-3 font-semibold text-paper shadow-soft transition-colors hover:bg-canopy active:scale-[0.98]"
        >
          <MessageCircle className="h-4 w-4" /> {r.askInChat}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-forest ring-1 ring-line hover:bg-moss active:scale-[0.98]"
        >
          <ImagePlus className="h-4 w-4" /> {r.newPhoto}
        </button>
      </motion.div>
      <motion.p variants={item} className="text-xs text-ink-faint">
        {r.disclaimer}
      </motion.p>
    </motion.div>
  );
}

/** Helpful videos and shop items for this diagnosis, loaded after the result is shown. */
function AnalysisResources({ result }: { result: PlantAnalysis }) {
  const { lang } = useLanguage();
  const [resources, setResources] = useState<ChatResources>({ status: "loading", videos: [], products: [] });

  useEffect(() => {
    const controller = new AbortController();
    const answer = [
      result.summary,
      ...result.issues.map((issue) => `- ${issue.name}`),
      ...result.treatment.map((step, i) => `${i + 1}. ${step.step}`),
    ].join("\n");
    fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: `Plant photo: ${result.plant.commonName}`, answer: answer.slice(0, 4000), lang }),
      signal: controller.signal,
    })
      .then((response) => (response.ok ? (response.json() as Promise<ChatResources>) : null))
      .then((data) => setResources(data ?? { status: "ready", videos: [], products: [] }))
      .catch(() => {
        if (!controller.signal.aborted) setResources({ status: "ready", videos: [], products: [] });
      });
    return () => controller.abort();
  }, [result, lang]);

  return <ResourceCards resources={resources} streaming />;
}
