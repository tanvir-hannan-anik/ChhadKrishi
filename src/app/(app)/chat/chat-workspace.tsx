"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowUp,
  Camera,
  Check,
  Copy,
  ImagePlus,
  Loader2,
  MessagesSquare,
  PanelLeftClose,
  Plus,
  RotateCcw,
  ScanSearch,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { FeatureCards } from "@/components/ai/feature-cards";
import { AppHeader } from "@/components/app-header";
import { Leaf } from "@/components/brand";
import { Markdown } from "@/components/chat/markdown";
import { ResourceCards } from "@/components/chat/resource-cards";
import { ListenButton, MicButton } from "@/components/chat/voice";
import { EASE_OUT } from "@/components/motion/reveal";
import { aiErrorCodeOf } from "@/lib/ai/client-errors";
import { openAuthModal } from "@/lib/auth/flow";
import { clearChatDraft, forgetChat, loadDraftText, peekChatDraft, rememberChat, saveDraftText } from "@/lib/chat-draft";
import type { ChatUIMessage } from "@/lib/chat/resources";
import type { ConversationSummary } from "@/lib/chat/store";
import { checkImageFile, fileToDataUrl, prepareImage, type ImageProblem } from "@/lib/image";
import { useLanguage } from "@/lib/i18n/language-context";
import { minimizeSidebarForFocus, useFocusMode } from "@/lib/sidebar";

interface ChatWorkspaceProps {
  userName: string;
  conversations: ConversationSummary[];
  conversationId: string | null;
  initialMessages: UIMessage[];
  initialQuestion: string;
  aiConfigured: boolean;
  /** Read-aloud (Azure voices) is available. */
  speechConfigured: boolean;
  /** Server-side voice input (Groq Whisper); otherwise the browser's speech recognition is used. */
  voiceInputConfigured: boolean;
}

export function ChatWorkspace(props: ChatWorkspaceProps) {
  const { t } = useLanguage();
  const c = t.chat;
  const router = useRouter();
  const [chatId] = useState(() => props.conversationId ?? crypto.randomUUID());
  const [conversations, setConversations] = useState(props.conversations);
  const [historyOpen, setHistoryOpen] = useState(false);
  const urlSynced = useRef(props.conversationId !== null);
  // The chat is a focus page: the app sidebar minimises to icons while it is open.
  useFocusMode();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        // Send only the new message; the server rebuilds history from the database. The language
        // is read at request time (<html lang> follows the toggle), so switching applies at once.
        prepareSendMessagesRequest: ({ id, messages, trigger }) => ({
          body: {
            id,
            trigger,
            lang: document.documentElement.lang === "en" ? "en" : "bn",
            message: trigger === "submit-message" ? messages.at(-1) : undefined,
          },
        }),
      }),
    [],
  );

  const refreshConversations = useCallback(async () => {
    const response = await fetch("/api/chat/conversations").catch(() => null);
    if (response?.ok) setConversations(((await response.json()) as { conversations: ConversationSummary[] }).conversations);
  }, []);

  const { messages, sendMessage, regenerate, stop, status, error, setMessages, clearError } = useChat<ChatUIMessage>({
    id: chatId,
    messages: props.initialMessages as ChatUIMessage[],
    transport,
    onFinish: () => void refreshConversations(),
  });

  const busy = status === "submitted" || status === "streaming";
  const errorCode = error ? aiErrorCodeOf(error) : null;
  const aiUnavailable = !props.aiConfigured || errorCode === "AI_NOT_CONFIGURED";

  /** Give a brand-new chat its permanent URL as soon as the first message is sent. */
  const syncUrl = useCallback(() => {
    rememberChat(chatId);
    if (urlSynced.current) return;
    urlSynced.current = true;
    window.history.replaceState(null, "", `/chat/${chatId}`);
  }, [chatId]);

  // The floating chat button on other pages brings the gardener back to this conversation.
  useEffect(() => {
    if (props.conversationId) rememberChat(props.conversationId);
  }, [props.conversationId]);

  const send = useCallback(
    (text: string, image: File | null, imageUrl: string | null) => {
      const files: FileUIPart[] | undefined = image && imageUrl ? [{ type: "file", mediaType: image.type, url: imageUrl, filename: image.name }] : undefined;
      syncUrl();
      minimizeSidebarForFocus();
      void (text ? sendMessage({ text, files }) : files ? sendMessage({ files }) : undefined);
    },
    [sendMessage, syncUrl],
  );

  /** Re-sends the last user message with the same id (the server replaces it, avoiding duplicates). */
  const retry = useCallback(() => {
    const lastUserIndex = messages.findLastIndex((m) => m.role === "user");
    if (lastUserIndex < 0) return;
    const last = messages[lastUserIndex];
    clearError();
    setMessages(messages.slice(0, lastUserIndex));
    void sendMessage({ id: last.id, role: "user", parts: last.parts });
  }, [messages, clearError, setMessages, sendMessage]);

  // Session expired mid-chat: sign in again in place, then re-send automatically.
  const retryRef = useRef(retry);
  useEffect(() => {
    retryRef.current = retry;
  }, [retry]);
  useEffect(() => {
    if (errorCode === "UNAUTHORIZED") openAuthModal({ expired: true, pending: { kind: "retry", run: () => retryRef.current() } });
  }, [errorCode]);

  // Hand-off from the landing page: send the question (and photo) the visitor already wrote.
  // Held in state until sent; the effect is cancellable so that, if the component remounts
  // (e.g. React's dev double-mount), only the live chat instance sends — exactly once.
  const [handoff, setHandoff] = useState(() => {
    if (props.conversationId !== null || !props.aiConfigured || typeof window === "undefined") return null;
    const draft = peekChatDraft();
    const image = draft && draft.text === props.initialQuestion ? draft.image : null;
    return props.initialQuestion || image ? { text: props.initialQuestion, image } : null;
  });
  useEffect(() => {
    if (!handoff) return;
    let cancelled = false;
    void (async () => {
      let prepared: File | null = null;
      let url: string | null = null;
      if (handoff.image && !checkImageFile(handoff.image)) {
        try {
          prepared = await prepareImage(handoff.image);
          url = await fileToDataUrl(prepared);
        } catch {
          prepared = null;
        }
      }
      if (cancelled) return;
      clearChatDraft();
      setHandoff(null);
      send(handoff.text, prepared, url);
    })();
    return () => {
      cancelled = true;
    };
  }, [handoff, send]);

  // Keep the newest content in view while the reader is near the bottom.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastText = messages.at(-1)?.parts.map((p) => (p.type === "text" ? p.text.length : 0)).join();
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 240;
    if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: status === "streaming" ? "auto" : "smooth" });
  }, [messages.length, lastText, status]);

  const deleteChat = async (id: string) => {
    const response = await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok && response?.status !== 404) return;
    forgetChat(id);
    setConversations((list) => list.filter((item) => item.id !== id));
    if (id === chatId) router.push("/chat");
  };

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  return (
    <div data-focus-mode className="flex h-dvh flex-col overflow-hidden">
      <AppHeader
        title={(t) => t.chat.title}
        actions={
          <>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-label={c.history}
              title={c.history}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-moss hover:text-forest xl:hidden"
            >
              <MessagesSquare className="h-5 w-5" />
            </button>
            <Link
              href="/chat"
              aria-label={c.newChat}
              title={c.newChat}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-forest ring-1 ring-forest/20 hover:bg-moss max-sm:w-11 max-sm:px-0 xl:hidden"
            >
              <Plus className="h-5 w-5" /> <span className="hidden sm:inline">{c.newChat}</span>
            </Link>
          </>
        }
      />

      <div className="relative flex w-full flex-1 overflow-hidden">
        <HistoryPanel
          conversations={conversations}
          activeId={chatId}
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          onDelete={deleteChat}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-8" aria-live="polite" aria-busy={busy}>
            <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 py-5 sm:py-8">
              {aiUnavailable && <NotConfiguredNotice />}

              {messages.length === 0 && !aiUnavailable && (
                <EmptyState name={props.userName} onPick={(q) => send(q, null, null)} disabled={busy} />
              )}

              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    streaming={status === "streaming" && message.id === messages.at(-1)?.id}
                    canRegenerate={message.id === lastAssistantId && status === "ready" && !aiUnavailable}
                    canListen={props.speechConfigured}
                    onRegenerate={() => void regenerate()}
                  />
                ))}
              </AnimatePresence>

              {status === "submitted" && <ThinkingIndicator />}

              {error && errorCode !== "UNAUTHORIZED" && errorCode !== "AI_NOT_CONFIGURED" && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap items-center gap-3 rounded-2xl bg-clay/10 px-4 py-3 text-sm text-clay"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{t.aiErrors[errorCode ?? "AI_FAILED"]}</span>
                  <button
                    type="button"
                    onClick={retry}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-semibold text-forest ring-1 ring-line hover:bg-moss"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> {c.retry}
                  </button>
                </motion.div>
              )}
            </div>
          </div>

          <ChatComposer
            key={chatId}
            draftKey={props.conversationId ?? "new"}
            disabled={aiUnavailable}
            busy={busy}
            initialText={aiUnavailable ? props.initialQuestion : ""}
            serverVoiceInput={props.voiceInputConfigured}
            onSend={send}
            onStop={() => void stop()}
          />
        </section>
      </div>
    </div>
  );
}

function HistoryPanel({
  conversations,
  activeId,
  open,
  onClose,
  onDelete,
}: {
  conversations: ConversationSummary[];
  activeId: string;
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useLanguage();
  const c = t.chat;
  const [confirming, setConfirming] = useState<string | null>(null);

  const list = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 p-4">
        <Link
          href="/chat"
          onClick={onClose}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-forest px-4 py-2.5 text-sm font-semibold text-paper shadow-soft transition-colors hover:bg-canopy"
        >
          <Plus className="h-4 w-4" /> {c.newChat}
        </Link>
        <button type="button" onClick={onClose} aria-label={c.closeHistory} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-moss xl:hidden">
          <PanelLeftClose className="h-5 w-5" />
        </button>
      </div>
      <p className="px-5 pb-2 text-xs font-semibold tracking-wide text-ink-faint">{c.history}</p>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {conversations.length === 0 && <li className="px-3 py-2 text-sm text-ink-faint">{c.historyEmpty}</li>}
        {conversations.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id} className="group relative">
              <Link
                href={`/chat/${item.id}`}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`block truncate rounded-xl py-2 pr-10 pl-3 text-sm transition-colors ${active ? "bg-moss font-semibold text-forest" : "text-ink-soft hover:bg-moss/60 hover:text-ink"}`}
              >
                {item.title}
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (confirming === item.id) onDelete(item.id);
                  else setConfirming(item.id);
                }}
                onBlur={() => setConfirming(null)}
                aria-label={c.deleteChat}
                title={c.deleteChat}
                className={`absolute top-1/2 right-1.5 -translate-y-1/2 rounded-lg p-1.5 transition-all ${
                  confirming === item.id ? "bg-clay text-paper opacity-100" : "text-ink-faint opacity-100 hover:bg-clay/10 hover:text-clay lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"
                }`}
              >
                {confirming === item.id ? <Check className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </li>
          );
        })}
      </ul>
      <Link href="/analyze" className="m-3 inline-flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 text-sm text-forest ring-1 ring-line hover:bg-moss">
        <ScanSearch className="h-4 w-4" /> {c.analyzeLink}
      </Link>
    </div>
  );

  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r border-line bg-paper xl:block">{list}</aside>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 xl:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-canopy/40" onClick={onClose} aria-hidden />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-paper shadow-lift"
            >
              {list}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MessageBubble({
  message,
  streaming,
  canRegenerate,
  canListen,
  onRegenerate,
}: {
  message: ChatUIMessage;
  streaming: boolean;
  canRegenerate: boolean;
  canListen: boolean;
  onRegenerate: () => void;
}) {
  const { t } = useLanguage();
  const c = t.chat;
  const [copied, setCopied] = useState(false);
  const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  const images = message.parts.filter((p): p is FileUIPart => p.type === "file" && p.mediaType.startsWith("image/"));
  const resources = message.parts.find((p) => p.type === "data-resources")?.data;

  if (message.role === "user") {
    return (
      <motion.div
        layout="position"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="ml-auto flex max-w-[85%] flex-col items-end gap-2"
      >
        {images.map((image, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- inline data URL from this conversation
          <img key={i} src={image.url} alt={c.photo} className="max-h-60 rounded-2xl object-cover shadow-soft ring-1 ring-line" />
        ))}
        {text && <p className="rounded-3xl rounded-br-md bg-forest px-4 py-3 whitespace-pre-wrap text-paper">{text}</p>}
      </motion.div>
    );
  }

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className="group flex items-start gap-3"
    >
      <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moss">
        <Leaf tone="leaf" className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-ink">
          <Markdown text={text} />
          {streaming && !resources && <span aria-hidden className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-leaf" />}
        </div>
        {/* Videos and shop items always follow the answer itself. */}
        {resources && <ResourceCards resources={resources} streaming={streaming} />}
        {!streaming && text && (
          <div className="mt-2 flex gap-1 text-ink-faint">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard?.writeText(text);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs hover:bg-moss hover:text-forest"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? c.copied : c.copy}
            </button>
            {canListen && <ListenButton text={text} />}
            {canRegenerate && (
              <button type="button" onClick={onRegenerate} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs hover:bg-moss hover:text-forest">
                <RotateCcw className="h-3.5 w-3.5" /> {c.regenerate}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ThinkingIndicator() {
  const { t } = useLanguage();
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3" role="status">
      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-moss">
        <motion.span
          className="absolute inset-0 rounded-full ring-2 ring-leaf/40"
          animate={{ scale: [1, 1.35], opacity: [0.8, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
        />
        <Leaf tone="leaf" className="h-4 w-4" />
      </span>
      <span className="flex items-center gap-1.5 text-sm text-ink-soft">
        {t.chat.thinking}
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-leaf"
            animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </span>
    </motion.div>
  );
}

/** Gemini-style start: greeting, AI feature cards right above the input, and quick prompts. */
function EmptyState({ name, onPick, disabled }: { name: string; onPick: (q: string) => void; disabled: boolean }) {
  const { t } = useLanguage();
  const firstName = name.trim().split(/\s+/)[0] || name;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className="flex flex-1 flex-col justify-end pt-4 text-center sm:justify-center"
    >
      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-moss sm:h-14 sm:w-14">
        <Leaf tone="leaf" className="h-6 w-6 sm:h-7 sm:w-7" />
      </span>
      <h1 className="text-gradient-leaf mt-3 animate-shimmer py-1 font-display text-3xl text-balance sm:mt-4 sm:text-5xl">{t.chat.emptyTitle(firstName)}</h1>
      <p className="mt-1 text-ink-soft sm:mt-2">{t.chat.emptySubtitle}</p>
      <FeatureCards className="mt-5 text-left sm:mt-8" />
      <p className="sr-only">{t.landing.quickPrompts}</p>
      <ul className="mt-3 flex flex-wrap justify-center gap-2">
        {t.hero.suggestions.map((suggestion) => (
          <li key={suggestion} className="max-w-full max-sm:[&:nth-child(n+4)]:hidden">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(suggestion)}
              className="min-h-9 max-w-full truncate rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-ink-soft transition-all hover:-translate-y-0.5 hover:border-leaf/40 hover:text-forest active:scale-[0.97] disabled:opacity-50"
            >
              {suggestion}
            </button>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function NotConfiguredNotice() {
  const { t } = useLanguage();
  return (
    <div role="status" className="rounded-3xl bg-cream p-5 ring-1 ring-line">
      <p className="flex items-center gap-2 font-semibold text-forest">
        <AlertCircle className="h-5 w-5" /> {t.chat.notConfiguredTitle}
      </p>
      <p className="mt-1.5 text-sm text-ink-soft">{t.chat.notConfiguredBody}</p>
    </div>
  );
}

function ChatComposer({
  draftKey,
  disabled,
  busy,
  initialText,
  serverVoiceInput,
  onSend,
  onStop,
}: {
  /** Where unsent text is kept, so it survives a visit to another feature. */
  draftKey: string;
  disabled: boolean;
  busy: boolean;
  initialText: string;
  serverVoiceInput: boolean;
  onSend: (text: string, image: File | null, imageUrl: string | null) => void;
  onStop: () => void;
}) {
  const { t } = useLanguage();
  const c = t.chat;
  const [text, setText] = useState(initialText);
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [problem, setProblem] = useState<ImageProblem | null>(null);
  const [voiceError, setVoiceError] = useState<keyof typeof c.voice.errors | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  // Restore text the gardener had not sent yet (e.g. before opening Image Analysis).
  // sessionStorage is only readable after hydration, hence the frame's delay.
  useEffect(() => {
    if (initialText) return;
    const saved = loadDraftText(draftKey);
    if (!saved) return;
    const frame = requestAnimationFrame(() => setText((current) => current || saved));
    return () => cancelAnimationFrame(frame);
  }, [draftKey, initialText]);

  const changeText = (value: string) => {
    setText(value);
    saveDraftText(draftKey, value);
  };

  const canSend = !disabled && !busy && !preparing && (text.trim().length > 0 || image !== null);

  const pick = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
    if (!file) return;
    const issue = checkImageFile(file);
    if (issue) return setProblem(issue);
    setProblem(null);
    setPreparing(true);
    try {
      const prepared = await prepareImage(file);
      setImage({ file: prepared, url: await fileToDataUrl(prepared) });
    } catch (error) {
      setProblem(((error as Error).message as ImageProblem) || "imageUnreadable");
    } finally {
      setPreparing(false);
    }
  };

  const submit = () => {
    if (!canSend) return;
    onSend(text.trim(), image?.file ?? null, image?.url ?? null);
    saveDraftText(draftKey, "");
    setText("");
    setImage(null);
  };

  return (
    <div className="border-t border-line bg-paper/90 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-8 sm:pt-3 sm:pb-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mx-auto max-w-3xl"
      >
        <div className={`rounded-[26px] bg-white shadow-soft ring-1 ring-line ${disabled ? "opacity-60" : ""}`}>
          <AnimatePresence initial={false}>
            {(image || preparing) && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="flex items-center gap-3 px-4 pt-3">
                  {preparing ? (
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-moss">
                      <Loader2 className="h-5 w-5 animate-spin text-leaf" />
                    </span>
                  ) : (
                    image && (
                      <>
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
                          <button type="button" onClick={() => fileRef.current?.click()} aria-label={t.capture.replace} title={t.capture.replace} className="block rounded-xl">
                            {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                            <img src={image.url} alt={c.photo} className="h-14 w-14 rounded-xl object-cover ring-1 ring-line" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setImage(null)}
                            aria-label={c.removeImage}
                            className="absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink text-paper"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </motion.div>
                        <div className="flex flex-col items-start text-xs font-semibold">
                          <button type="button" onClick={() => fileRef.current?.click()} className="min-h-8 rounded-full px-2 text-forest hover:bg-moss">
                            {t.capture.replace}
                          </button>
                          <button type="button" onClick={() => setImage(null)} className="min-h-8 rounded-full px-2 text-clay hover:bg-clay/10">
                            {t.capture.remove}
                          </button>
                        </div>
                      </>
                    )
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <label htmlFor="chat-input" className="sr-only">
            {c.placeholder}
          </label>
          <textarea
            id="chat-input"
            value={text}
            onChange={(e) => changeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={disabled}
            rows={1}
            maxLength={4000}
            placeholder={c.placeholder}
            className="block max-h-40 min-h-[3rem] w-full resize-none bg-transparent px-4 pt-3 text-[16px] sm:px-5 sm:pt-3.5 leading-relaxed text-ink outline-none field-sizing-content placeholder:text-ink-faint disabled:cursor-not-allowed"
          />
          <div className="flex items-center justify-between px-2.5 pb-2.5">
            <div className="flex items-center">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => void pick(e.target.files?.[0])} />
              {/* Opens the rear camera directly on phones that allow it. */}
              <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => void pick(e.target.files?.[0])} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={disabled || busy || preparing}
                aria-label={c.attach}
                title={c.attach}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-moss hover:text-forest disabled:opacity-40"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                disabled={disabled || busy || preparing}
                aria-label={t.capture.takePhoto}
                title={t.capture.takePhoto}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-moss hover:text-forest disabled:opacity-40 pointer-fine:hidden"
              >
                <Camera className="h-5 w-5" />
              </button>
              <MicButton
                server={serverVoiceInput}
                disabled={disabled || busy}
                onError={setVoiceError}
                // Appended, not sent: the gardener checks the transcript first.
                onText={(spoken) => changeText(text.trim() ? `${text.trimEnd()} ${spoken}` : spoken)}
              />
            </div>
            {busy ? (
              <motion.button
                type="button"
                onClick={onStop}
                whileTap={{ scale: 0.92 }}
                aria-label={c.stop}
                title={c.stop}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink text-paper"
              >
                <Square className="h-4 w-4 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                disabled={!canSend}
                whileTap={canSend ? { scale: 0.92 } : undefined}
                aria-label={c.send}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-forest text-paper transition-colors hover:bg-canopy disabled:bg-moss disabled:text-ink-faint"
              >
                <ArrowUp className="h-5 w-5" strokeWidth={2.4} />
              </motion.button>
            )}
          </div>
        </div>
        {problem || voiceError ? (
          <p role="alert" className="mt-2 text-center text-xs text-clay">
            {problem ? t.analyze[problem] : voiceError && c.voice.errors[voiceError]}
          </p>
        ) : (
          <p className="mt-1.5 text-center text-[11px] leading-tight text-ink-faint sm:mt-2 sm:text-xs">{c.disclaimer}</p>
        )}
      </form>
    </div>
  );
}
