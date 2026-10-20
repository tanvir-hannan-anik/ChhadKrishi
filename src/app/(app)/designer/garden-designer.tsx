"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, AlertTriangle, Camera, CheckCircle2, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { postDesigner, imageSize } from "@/components/designer/client";
import { Consultation, type ChatMessage } from "@/components/designer/consultation";
import { DesignResult, type RenderState } from "@/components/designer/design-result";
import { GeneratingSteps } from "@/components/designer/generating";
import { RequirementsReview } from "@/components/designer/requirements-review";
import { StageProgress, type Stage } from "@/components/designer/stage-progress";
import { EASE_OUT } from "@/components/motion/reveal";
import { IMAGE_LIMITS } from "@/lib/ai/analysis-schema";
import type { AiErrorCode } from "@/lib/ai/errors";
import { openAuthModal } from "@/lib/auth/flow";
import { setChatDraft } from "@/lib/chat-draft";
import {
  EMPTY_REQUIREMENTS,
  missingFields,
  nearestAspectRatio,
  normalizeRequirements,
  type Answer,
  type AspectRatio,
  type DesignPlan,
  type Question,
  type Requirements,
  type SpaceAnalysis,
} from "@/lib/designer/schema";
import { checkImageFile, prepareImage, type ImageProblem } from "@/lib/image";
import { useLanguage } from "@/lib/i18n/language-context";

type Photo = { file: File; url: string; aspectRatio: AspectRatio };
type TurnResponse = { acknowledgement: string; requirements: Requirements; question: Question | null; done: boolean; fallback: boolean };
type DesignState = { status: "planning" } | { status: "error"; code: AiErrorCode } | { status: "ready"; plan: DesignPlan; signature: string };

let messageSeq = 0;
const message = (role: ChatMessage["role"], text: string): ChatMessage => ({ id: `m${++messageSeq}`, role, text });

/** Bounds an answer to what the API accepts, whatever the model put into its options. */
function boundAnswer(answer: Answer): Answer {
  const value = Array.isArray(answer.value)
    ? answer.value.map((v) => v.slice(0, 60)).slice(0, 12)
    : typeof answer.value === "string"
      ? answer.value.slice(0, 120)
      : answer.value;
  return { ...answer, question: answer.question.slice(0, 400), answer: answer.answer.slice(0, 400), value };
}

/**
 * AI Garden Designer: photo → conversational consultation → confirmed requirements →
 * design plan + photorealistic render of the gardener's own space.
 */
export function GardenDesigner({ aiConfigured, imageConfigured }: { aiConfigured: boolean; imageConfigured: boolean }) {
  const { t, lang } = useLanguage();
  const d = t.designer;
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("photo");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [problem, setProblem] = useState<ImageProblem | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [space, setSpace] = useState<SpaceAnalysis | null>(null);
  const [requirements, setRequirements] = useState<Requirements>(EMPTY_REQUIREMENTS);
  const [history, setHistory] = useState<Answer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AiErrorCode | null>(null);
  const [notGardenAck, setNotGardenAck] = useState(false);

  const [design, setDesign] = useState<DesignState | null>(null);
  const [render, setRender] = useState<RenderState>({ status: "loading" });

  const fileRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const renderAbortRef = useRef<AbortController | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      renderAbortRef.current?.abort();
    },
    [],
  );
  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.url)), [photo]);
  const renderUrl = render.status === "done" ? render.url : null;
  useEffect(() => () => void (renderUrl && URL.revokeObjectURL(renderUrl)), [renderUrl]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stage]);

  const handleFailure = (code: AiErrorCode, retry: () => void) => {
    if (code === "UNAUTHORIZED") openAuthModal({ expired: true, pending: { kind: "retry", run: retry } });
  };

  const fresh = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return controller;
  };

  // ---- Photo ------------------------------------------------------------------------------
  const choose = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    const issue = checkImageFile(file);
    if (issue) return setProblem(issue);
    setProblem(null);
    setPreparing(true);
    try {
      const prepared = await prepareImage(file);
      const { width, height } = await imageSize(prepared);
      setPhoto({ file: prepared, url: URL.createObjectURL(prepared), aspectRatio: nearestAspectRatio(width, height) });
    } catch (e) {
      setProblem(((e as Error).message as ImageProblem) || "imageUnreadable");
    } finally {
      setPreparing(false);
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    renderAbortRef.current?.abort();
    setStage("photo");
    setPhoto(null);
    setSpace(null);
    setRequirements(EMPTY_REQUIREMENTS);
    setHistory([]);
    setMessages([]);
    setQuestion(null);
    setBusy(false);
    setError(null);
    setNotGardenAck(false);
    setDesign(null);
  };

  // ---- Consultation -----------------------------------------------------------------------
  const applyTurn = (turn: TurnResponse) => {
    setRequirements(turn.requirements);
    setMessages((list) => [
      ...list,
      ...(turn.fallback ? [message("note", d.chat.fallbackNote)] : []),
      ...(turn.acknowledgement.trim() ? [message("designer", turn.acknowledgement.trim())] : []),
      ...(turn.question ? [message("designer", turn.question.text)] : []),
    ]);
    setQuestion(turn.question);
    if (turn.done || !turn.question) window.setTimeout(() => setStage("confirm"), 900);
  };

  const start = async () => {
    if (!photo || busy) return;
    const controller = fresh();
    setStage("consult");
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("image", photo.file);
    body.set("lang", lang);
    const result = await postDesigner<{ space: SpaceAnalysis } & TurnResponse>("/api/designer/start", body, controller.signal);
    if (controller.signal.aborted) return;
    setBusy(false);
    if (!result.ok) {
      setError(result.code);
      return handleFailure(result.code, () => void startRef.current());
    }
    setSpace(result.data.space);
    applyTurn(result.data);
  };

  const sendTurn = async (nextHistory: Answer[]) => {
    if (!space) return void start();
    const controller = fresh();
    setBusy(true);
    setError(null);
    const result = await postDesigner<TurnResponse>("/api/designer/turn", { lang, space, requirements, history: nextHistory }, controller.signal);
    if (controller.signal.aborted) return;
    setBusy(false);
    if (!result.ok) {
      setError(result.code);
      return handleFailure(result.code, () => void sendTurn(nextHistory));
    }
    applyTurn(result.data);
  };

  const answer = (raw: Answer) => {
    const a = boundAnswer(raw);
    const nextHistory = [...history, a];
    setHistory(nextHistory);
    setMessages((list) => [...list, message("user", a.answer)]);
    setQuestion(null);
    void sendTurn(nextHistory);
  };

  const retryConsultation = () => (space ? void sendTurn(history) : void start());

  const startRef = useRef(start);
  useEffect(() => {
    startRef.current = start;
  });

  // ---- Design -----------------------------------------------------------------------------
  const runRender = async (plan: DesignPlan, signature: string) => {
    if (!photo) return;
    renderAbortRef.current?.abort();
    const controller = new AbortController();
    renderAbortRef.current = controller;
    setRender({ status: "loading" });
    if (!imageConfigured) return setRender({ status: "error", code: "AI_NOT_CONFIGURED" });
    const body = new FormData();
    body.set("image", photo.file);
    body.set("prompt", plan.imagePrompt);
    body.set("signature", signature);
    body.set("aspectRatio", photo.aspectRatio);
    const result = await postDesigner<Blob>("/api/designer/render", body, controller.signal, "blob");
    if (controller.signal.aborted) return;
    if (!result.ok) {
      setRender({ status: "error", code: result.code });
      return handleFailure(result.code, () => void runRender(plan, signature));
    }
    setRender({ status: "done", url: URL.createObjectURL(result.data), test: plan.title.startsWith("🧪") });
  };

  const generate = async () => {
    if (!space || missingFields(requirements).length > 0) return;
    const controller = fresh();
    renderAbortRef.current?.abort();
    setStage("design");
    setDesign({ status: "planning" });
    const confirmed = normalizeRequirements(requirements);
    const result = await postDesigner<{ plan: DesignPlan; signature: string }>("/api/designer/plan", { lang, space, requirements: confirmed }, controller.signal);
    if (controller.signal.aborted) return;
    if (!result.ok) {
      setDesign({ status: "error", code: result.code });
      return handleFailure(result.code, () => void generateRef.current());
    }
    setDesign({ status: "ready", ...result.data });
    void runRender(result.data.plan, result.data.signature);
  };
  const generateRef = useRef(generate);
  useEffect(() => {
    generateRef.current = generate;
  });

  const askInChat = (plan: DesignPlan) => {
    const prompt = d.result.askPrompt(plan.title);
    setChatDraft({ text: prompt, image: photo?.file ?? null });
    router.push(`/chat?q=${encodeURIComponent(prompt)}`);
  };

  const canReview = stage === "consult" && space !== null && missingFields(requirements).length === 0;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader title={(t) => t.designer.title} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-10">
        <div ref={topRef} className="scroll-mt-24" />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_OUT }}>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-leaf">
            <Sparkles className="h-4 w-4" /> {t.appNav.designer}
          </p>
          <h1 className="mt-1 font-display text-2xl text-ink sm:text-4xl">{d.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-soft sm:mt-2 sm:text-base">{d.subtitle}</p>
        </motion.div>

        <div className="mt-6 max-w-3xl">
          <StageProgress stage={stage} />
        </div>

        {!aiConfigured && (
          <div role="status" className="mt-6 rounded-3xl bg-cream p-5 ring-1 ring-line">
            <p className="flex items-center gap-2 font-semibold text-forest">
              <AlertCircle className="h-5 w-5" /> {t.chat.notConfiguredTitle}
            </p>
            <p className="mt-1.5 text-sm text-ink-soft">{t.chat.notConfiguredBody}</p>
          </div>
        )}

        <input ref={fileRef} type="file" accept={IMAGE_LIMITS.acceptedTypes.join(",")} className="sr-only" tabIndex={-1} onChange={(e) => void choose(e.target.files?.[0])} />

        <div className="mt-8">
          <AnimatePresence mode="wait">
            {stage === "photo" && (
              <motion.div key="photo" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-10">
                <div>
                  {!photo ? (
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
                      className={`group flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-[28px] border-2 border-dashed p-6 text-center transition-colors ${
                        dragging ? "border-leaf bg-sprout/40" : "border-leaf/30 bg-white hover:border-leaf/60 hover:bg-cream"
                      }`}
                    >
                      {preparing ? (
                        <>
                          <Loader2 className="h-8 w-8 animate-spin text-leaf" />
                          <span className="text-ink-soft">{d.upload.preparing}</span>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-moss text-forest transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3">
                            <Camera className="h-7 w-7" />
                          </span>
                          <span className="font-semibold text-ink">{dragging ? d.upload.dropActive : d.upload.dropTitle}</span>
                          <span className="max-w-sm text-sm text-ink-faint">{d.upload.dropHint}</span>
                        </>
                      )}
                    </motion.button>
                  ) : (
                    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: EASE_OUT }} className="relative overflow-hidden rounded-[28px] bg-ink shadow-lift">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                      <img src={photo.url} alt={d.space.title} className="block max-h-[70vh] w-full object-contain" />
                      <div className="absolute top-3 right-3 flex gap-2">
                        <button type="button" onClick={() => fileRef.current?.click()} className="rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold text-forest shadow-soft backdrop-blur hover:bg-white">
                          {d.upload.change}
                        </button>
                        <button type="button" onClick={() => setPhoto(null)} aria-label={d.upload.remove} className="rounded-full bg-white/90 p-2 text-ink shadow-soft backdrop-blur hover:bg-white">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                  <AnimatePresence>
                    {problem && (
                      <motion.p role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 flex items-center gap-2 text-sm text-clay">
                        <AlertCircle className="h-4 w-4" /> {d.upload[problem]}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  {photo && (
                    <motion.button
                      type="button"
                      onClick={() => void start()}
                      disabled={!aiConfigured}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={aiConfigured ? { y: -1 } : undefined}
                      whileTap={aiConfigured ? { scale: 0.98 } : undefined}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest py-3.5 font-semibold text-paper shadow-soft transition-colors hover:bg-canopy disabled:cursor-not-allowed disabled:bg-moss disabled:text-ink-faint disabled:shadow-none"
                    >
                      <Sparkles className="h-4 w-4" /> {d.upload.start}
                    </motion.button>
                  )}
                </div>
                <div className="rounded-3xl bg-cream p-6 ring-1 ring-line lg:self-start">
                  <p className="flex items-center gap-2 font-semibold text-forest">
                    <Camera className="h-5 w-5" /> {d.upload.tipsTitle}
                  </p>
                  <ul className="mt-3 space-y-2 text-ink-soft">
                    {d.upload.tips.map((tip) => (
                      <li key={tip} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-leaf" /> {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {stage === "consult" && photo && (
              <motion.div key="consult" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-8">
                <SpacePanel photoUrl={photo.url} space={space} loading={busy && !space} />
                <div className="space-y-4">
                  {space && !space.isGardenSpace && !notGardenAck && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} role="alert" className="rounded-3xl bg-[#fbf3dd] p-5 text-[#6b4f10]">
                      <p className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {d.space.notGarden}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => setNotGardenAck(true)} className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-forest ring-1 ring-line hover:bg-moss">
                          {d.space.continueAnyway}
                        </button>
                        <button type="button" onClick={reset} className="rounded-full px-4 py-1.5 text-sm font-semibold text-[#6b4f10] ring-1 ring-[#e9cf8a] hover:bg-white/60">
                          {d.space.changePhoto}
                        </button>
                      </div>
                    </motion.div>
                  )}
                  <Consultation
                    messages={messages}
                    question={question}
                    asked={history.length}
                    thinking={busy}
                    error={error}
                    canReview={canReview}
                    onAnswer={answer}
                    onRetry={retryConsultation}
                    onReview={() => setStage("confirm")}
                  />
                </div>
              </motion.div>
            )}

            {stage === "confirm" && (
              <motion.div key="confirm" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] xl:gap-8">
                {photo && <SpacePanel photoUrl={photo.url} space={space} loading={false} />}
                <RequirementsReview requirements={requirements} onChange={setRequirements} onConfirm={() => void generate()} onBack={() => setStage("consult")} />
              </motion.div>
            )}

            {stage === "design" && photo && (
              <motion.div key="design" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
                {design?.status === "planning" && (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <div className="relative overflow-hidden rounded-[28px] bg-ink shadow-lift">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                      <img src={photo.url} alt={d.space.title} className="block w-full opacity-80" />
                      <span aria-hidden className="absolute inset-x-6 h-0.5 animate-scan rounded-full bg-lime shadow-[0_0_18px_6px_rgb(122_194_26/0.55)]" />
                    </div>
                    <GeneratingSteps title={d.generating.planTitle} steps={d.generating.planSteps} onCancel={() => (abortRef.current?.abort(), setStage("confirm"))} />
                  </div>
                )}
                {design?.status === "error" && (
                  <div role="alert" className="mx-auto max-w-xl rounded-3xl bg-clay/10 p-6">
                    <p className="flex items-center gap-2 font-semibold text-clay">
                      <AlertTriangle className="h-5 w-5" /> {d.result.planFailed} {t.aiErrors[design.code]}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {design.code !== "AI_NOT_CONFIGURED" && design.code !== "UNAUTHORIZED" && (
                        <button type="button" onClick={() => void generate()} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-forest ring-1 ring-line hover:bg-moss">
                          <RotateCcw className="h-4 w-4" /> {t.chat.retry}
                        </button>
                      )}
                      <button type="button" onClick={() => setStage("confirm")} className="rounded-full px-4 py-2 font-semibold text-forest ring-1 ring-line hover:bg-moss">
                        {d.result.editRequirements}
                      </button>
                    </div>
                  </div>
                )}
                {design?.status === "ready" && (
                  <DesignResult
                    plan={design.plan}
                    requirements={requirements}
                    photoUrl={photo.url}
                    render={render}
                    onRetryRender={() => void runRender(design.plan, design.signature)}
                    onCancelRender={() => {
                      renderAbortRef.current?.abort();
                      setRender({ status: "error", code: "AI_FAILED" });
                    }}
                    onEdit={() => {
                      renderAbortRef.current?.abort();
                      setStage("confirm");
                    }}
                    onAsk={() => askInChat(design.plan)}
                    onReset={reset}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function SpacePanel({ photoUrl, space, loading }: { photoUrl: string; space: SpaceAnalysis | null; loading: boolean }) {
  const { t } = useLanguage();
  const d = t.designer;
  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <div className="relative overflow-hidden rounded-[28px] bg-ink shadow-lift">
        {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
        <img src={photoUrl} alt={d.space.title} className={`block max-h-[50vh] w-full object-cover transition-[filter] duration-500 ${loading ? "brightness-90 saturate-75" : ""}`} />
        {loading && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <span className="absolute inset-x-6 h-0.5 animate-scan rounded-full bg-lime shadow-[0_0_18px_6px_rgb(122_194_26/0.55)]" />
          </div>
        )}
      </div>
      {loading && (
        <p role="status" className="flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin text-leaf" /> {d.upload.starting}
        </p>
      )}
      {space?.summary && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-line">
          <p className="text-sm font-semibold text-leaf">{d.space.title}</p>
          <p className="mt-1 text-sm text-ink-soft">{space.summary}</p>
          {space.features.length > 0 && (
            <>
              <p className="mt-3 text-xs font-semibold text-ink">{d.space.features}</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {space.features.map((f, index) => (
                  <li key={`${index}-${f}`} className="rounded-full bg-moss px-2.5 py-0.5 text-xs text-forest">
                    {f}
                  </li>
                ))}
              </ul>
            </>
          )}
        </motion.div>
      )}
    </aside>
  );
}
