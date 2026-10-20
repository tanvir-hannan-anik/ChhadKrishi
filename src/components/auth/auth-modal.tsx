"use client";

import { Suspense, useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check, Eye, EyeOff, ImagePlus, Loader2, LockKeyhole, X } from "lucide-react";
import { Leaf, LogoMark, Sprout } from "@/components/brand";
import { EASE_OUT } from "@/components/motion/reveal";
import { authClient } from "@/lib/auth/client";
import { closeAuthModal, openAuthModal, reasonFor, runAction, useAuthModalState, type AuthMode, type PendingAction } from "@/lib/auth/flow";
import { AUTH_QUERY, safeReturnPath } from "@/lib/auth/redirect";
import { useLanguage } from "@/lib/i18n/language-context";
import type { Dictionary } from "@/lib/i18n/dictionary";

type Status = "idle" | "submitting" | "success" | "upload-ready";
type ErrorKey = keyof Dictionary["auth"]["errors"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errorKeyFor(error: { code?: string; status?: number } | null | undefined): ErrorKey {
  if (!error) return "generic";
  if (error.status === 429) return "rateLimited";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
    case "USER_NOT_FOUND":
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
      return "invalidCredentials";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "userExists";
    case "PASSWORD_TOO_SHORT":
      return "passwordShort";
    case "INVALID_EMAIL":
      return "invalidEmail";
  }
  return error.status === 0 || error.status === undefined ? "network" : "generic";
}

/**
 * Mounted once for the whole app. Opens when a gated action needs a session, or when a
 * protected route redirected here with ?auth=signin&next=…, then resumes the action.
 */
export function AuthModal() {
  const { open, mode: initialMode, pending, expired } = useAuthModalState();
  const router = useRouter();

  return (
    <>
      <Suspense fallback={null}>
        <AuthRedirectListener />
      </Suspense>
      <AnimatePresence>
        {open && (
          // Keyed so every opening starts from a fresh form.
          <AuthDialog
            key={`${initialMode}-${pending.kind}`}
            initialMode={initialMode}
            pending={pending}
            expired={expired}
            onResume={(action) => runAction(action, router)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Opens the modal when the proxy or a server guard redirected here with ?auth=signin&next=….
 * Watches the query string (not just first load) because server redirects during client-side
 * navigation — e.g. a session that expired while the tab was open — land without a reload.
 */
function AuthRedirectListener() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const mode = searchParams.get(AUTH_QUERY.mode);
    if (mode !== "signin" && mode !== "signup") return;
    const next = safeReturnPath(searchParams.get(AUTH_QUERY.next));
    openAuthModal({
      mode,
      expired: searchParams.get(AUTH_QUERY.reason) === "expired",
      pending: next
        ? { kind: "navigate", href: next, reason: next.startsWith("/shop") ? "shop" : next.startsWith("/analyze") ? "analyze" : "protected" }
        : { kind: "none" },
    });
    // Clean the URL through the router so its state agrees with the address bar.
    const url = new URL(window.location.href);
    for (const key of Object.values(AUTH_QUERY)) url.searchParams.delete(key);
    router.replace(url.pathname + url.search + url.hash, { scroll: false });
  }, [searchParams, router]);

  return null;
}

function AuthDialog({
  initialMode,
  pending,
  expired,
  onResume,
}: {
  initialMode: AuthMode;
  pending: PendingAction;
  expired: boolean;
  onResume: (action: PendingAction) => void;
}) {
  const { t } = useLanguage();
  const a = t.auth;
  const router = useRouter();
  const ids = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const submittingRef = useRef(false);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);
  const [welcomeName, setWelcomeName] = useState("");

  const busy = status === "submitting" || status === "success";
  const reason = reasonFor(pending);
  const pendingImage = pending.kind === "chat" ? pending.image : null;
  const [imagePreview] = useState(() => (pendingImage ? URL.createObjectURL(pendingImage) : null));

  const dismiss = () => {
    // Cancelling aborts any in-flight request; the visitor's prompt stays in the composer.
    abortRef.current?.abort();
    closeAuthModal();
  };

  // Lock page scroll, restore focus on close, and abort requests if unmounted.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("input")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      abortRef.current?.abort();
      previouslyFocused?.focus?.();
    };
  }, []);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      dismiss();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    // Keep keyboard focus inside the dialog.
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button, input, a[href]")].filter((el) => !el.hasAttribute("disabled"));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const switchMode = (next: AuthMode) => {
    if (busy) return;
    setMode(next);
    setErrorKey(null);
  };

  const validate = (): ErrorKey | null => {
    if (mode === "signup" && !name.trim()) return "nameRequired";
    if (!EMAIL_PATTERN.test(email.trim())) return "invalidEmail";
    if (mode === "signup" && password.length < 8) return "passwordShort";
    if (!password) return "invalidCredentials";
    return null;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return; // ignore double clicks / repeated Enter
    const invalid = validate();
    if (invalid) {
      setErrorKey(invalid);
      return;
    }

    submittingRef.current = true;
    setStatus("submitting");
    setErrorKey(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const fetchOptions = { signal: controller.signal };
      const result =
        mode === "signin"
          ? await authClient.signIn.email({ email: email.trim(), password, fetchOptions })
          : await authClient.signUp.email({ name: name.trim(), email: email.trim(), password, fetchOptions });

      if (controller.signal.aborted) return;
      if (result.error) {
        setErrorKey(errorKeyFor(result.error));
        setStatus("idle");
        if (result.error.code === "USER_ALREADY_EXISTS" || result.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") setMode("signin");
        return;
      }

      setWelcomeName(result.data?.user.name ?? "");
      router.refresh(); // let server components see the new session

      if (pending.kind === "upload") {
        // Browsers only open a file picker from a fresh click, so ask for one.
        setStatus("upload-ready");
        return;
      }
      setStatus("success");
      window.setTimeout(() => {
        closeAuthModal();
        onResume(pending);
      }, 700);
    } catch {
      if (!controller.signal.aborted) {
        setErrorKey("network");
        setStatus("idle");
      }
    } finally {
      submittingRef.current = false;
    }
  };

  const titleId = `${ids}-title`;

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onKeyDown={onKeyDown}
    >
      <div aria-hidden className="absolute inset-0 bg-canopy/45 backdrop-blur-sm" onClick={dismiss} />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="relative grid max-h-[92dvh] w-full overflow-hidden rounded-t-[28px] bg-paper shadow-lift sm:max-w-3xl sm:rounded-[28px] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      >
        {/* Brand panel (tablet and up) */}
        <aside className="relative isolate hidden overflow-hidden bg-forest p-8 text-paper md:flex md:flex-col">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_20%_0%,rgb(122_194_26/0.35),transparent)]" />
          <Leaf tone="lime" className="pointer-events-none absolute -top-4 -right-4 w-24 origin-bottom-left animate-sway opacity-40" />
          <div className="flex items-center gap-2.5">
            <LogoMark size={34} />
            <span className="font-display text-xl">{t.hero.brand}</span>
          </div>
          <p className="mt-10 font-display text-2xl leading-snug">{a.panelTitle}</p>
          <ul className="mt-5 space-y-2.5">
            {a.panelPoints.map((point) => (
              <li key={point} className="flex items-center gap-2.5 text-paper/80">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-lime/20 text-lime">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                {point}
              </li>
            ))}
          </ul>
          <Sprout className="mt-auto w-20 self-start pt-8" />
        </aside>

        <div className="relative overflow-y-auto px-5 pt-5 pb-6 sm:px-8 sm:pt-7 sm:pb-8">
          <span aria-hidden className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-moss sm:hidden" />
          <button
            type="button"
            onClick={dismiss}
            aria-label={a.close}
            className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-moss hover:text-forest"
          >
            <X className="h-5 w-5" />
          </button>

          <AnimatePresence mode="wait" initial={false}>
            {status === "success" || status === "upload-ready" ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex min-h-[22rem] flex-col items-center justify-center text-center"
                role="status"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-leaf text-paper"
                >
                  <Check className="h-8 w-8" strokeWidth={3} />
                </motion.span>
                <p className="mt-5 font-display text-2xl text-ink">{a.welcome(welcomeName)}</p>
                {status === "success" ? (
                  <p className="mt-2 flex items-center gap-2 text-ink-soft">
                    <Loader2 className="h-4 w-4 animate-spin" /> {pending.kind !== "none" ? a.resuming : ""}
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-ink-soft">{a.uploadReady}</p>
                    <button
                      type="button"
                      onClick={() => {
                        closeAuthModal();
                        onResume(pending);
                      }}
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3 font-semibold text-paper shadow-soft transition-colors hover:bg-canopy active:scale-[0.98]"
                    >
                      <ImagePlus className="h-5 w-5" /> {a.chooseImage}
                    </button>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div key="form" exit={{ opacity: 0 }}>
                <h2 id={titleId} className="pr-10 font-display text-2xl text-ink sm:text-3xl">
                  {mode === "signin" ? a.titleSignIn : a.titleSignUp}
                </h2>
                <p className="mt-1 text-ink-soft">{mode === "signin" ? a.subtitleSignIn : a.subtitleSignUp}</p>

                {(expired || reason) && (
                  <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${expired ? "bg-clay/10 text-clay" : "bg-moss/70 text-forest"}`}>
                    <p className="flex items-start gap-2">
                      <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                      {expired ? a.reasons.expired : reason ? a.reasons[reason] : null}
                    </p>
                    {pending.kind === "chat" && (pending.text || imagePreview) && (
                      <div className="mt-2.5 flex items-center gap-3 rounded-xl bg-white/80 p-2.5 text-ink">
                        {imagePreview && (
                          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                          <img src={imagePreview} alt={a.imageKept} className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-ink-faint">{a.savedPrompt}</p>
                          <p className="line-clamp-2">{pending.text || a.imageKept}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div role="tablist" aria-label={a.titleSignIn} className="mt-5 grid grid-cols-2 rounded-full bg-moss/70 p-1">
                  {(["signin", "signup"] as const).map((value) => {
                    const active = value === mode;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => switchMode(value)}
                        className={`relative rounded-full py-2 text-sm font-semibold transition-colors ${active ? "text-paper" : "text-ink-soft hover:text-forest"}`}
                      >
                        {active && (
                          <motion.span layoutId="auth-mode-pill" className="absolute inset-0 rounded-full bg-forest" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                        )}
                        <span className="relative">{value === "signin" ? a.signInTab : a.signUpTab}</span>
                      </button>
                    );
                  })}
                </div>

                <form onSubmit={submit} noValidate className="mt-5 space-y-4" aria-busy={busy}>
                  <AnimatePresence initial={false}>
                    {mode === "signup" && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <Field id={`${ids}-name`} label={a.name}>
                          <input
                            id={`${ids}-name`}
                            type="text"
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={a.namePlaceholder}
                            disabled={busy}
                            aria-invalid={errorKey === "nameRequired"}
                            className={inputClass}
                          />
                        </Field>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Field id={`${ids}-email`} label={a.email}>
                    <input
                      id={`${ids}-email`}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={a.emailPlaceholder}
                      disabled={busy}
                      aria-invalid={errorKey === "invalidEmail"}
                      className={inputClass}
                    />
                  </Field>

                  <Field id={`${ids}-password`} label={a.password}>
                    <div className="relative">
                      <input
                        id={`${ids}-password`}
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === "signin" ? a.passwordPlaceholderSignIn : a.passwordPlaceholderSignUp}
                        disabled={busy}
                        aria-invalid={errorKey === "passwordShort" || errorKey === "invalidCredentials"}
                        className={`${inputClass} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? a.hidePassword : a.showPassword}
                        className="absolute top-1/2 right-2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-moss hover:text-forest"
                      >
                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </Field>

                  <AnimatePresence>
                    {errorKey && (
                      <motion.p
                        role="alert"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-start gap-2 rounded-xl bg-clay/10 px-3 py-2.5 text-sm text-clay"
                      >
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        {a.errors[errorKey]}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={busy}
                    whileTap={busy ? undefined : { scale: 0.98 }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest py-3.5 font-semibold text-paper shadow-soft transition-colors hover:bg-canopy disabled:cursor-wait disabled:opacity-80"
                  >
                    {status === "submitting" && <Loader2 className="h-5 w-5 animate-spin" />}
                    {status === "submitting"
                      ? mode === "signin"
                        ? a.loadingSignIn
                        : a.loadingSignUp
                      : mode === "signin"
                        ? a.submitSignIn
                        : a.submitSignUp}
                  </motion.button>
                </form>

                <p className="mt-5 text-center text-sm text-ink-soft">
                  {mode === "signin" ? a.noAccount : a.haveAccount}{" "}
                  <button
                    type="button"
                    onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                    className="font-semibold text-forest underline-offset-4 hover:underline"
                  >
                    {mode === "signin" ? a.signUpTab : a.signInTab}
                  </button>
                </p>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-faint">
                  <LockKeyhole className="h-3.5 w-3.5" /> {a.trust}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

const inputClass =
  "block w-full rounded-2xl border border-line bg-white px-4 py-3 text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-faint focus:border-leaf/50 focus:ring-4 focus:ring-sprout/60 disabled:opacity-60 aria-invalid:border-clay/60";

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}
