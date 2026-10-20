"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useCallback } from "react";
import { motion } from "motion/react";
import { Loader2, Mic, Square, Volume2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

type VoiceError = "micDenied" | "micUnsupported" | "nothingHeard" | "failed";

// The Web Speech API is not in TypeScript's DOM lib; only what is used here is declared.
interface SpeechResultEvent {
  resultIndex: number;
  results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const recognitionCtor = (): SpeechRecognitionCtor | null => {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const noSubscribe = () => () => {};
/** Browser speech recognition exists (Chrome, Edge, Safari; not Firefox). False during SSR. */
const useSpeechSupported = () => useSyncExternalStore(noSubscribe, () => recognitionCtor() !== null, () => false);

const currentLang = () => (document.documentElement.lang === "en" ? "en" : "bn");

type MicState = "idle" | "recording" | "transcribing";
interface MicProps {
  disabled: boolean;
  onText: (text: string) => void;
  onError: (error: VoiceError | null) => void;
}

/**
 * Voice input. The text is handed back for the gardener to check and send, never sent
 * automatically. With `server`, audio is recorded and transcribed by Whisper on the server
 * (Groq; works in every modern browser and detects Bangla vs English itself). Without it, the
 * browser's own speech recognition is used, and the button is hidden where there is none.
 */
export function MicButton({ server, ...props }: MicProps & { server: boolean }) {
  return server ? <RecorderMic {...props} /> : <BrowserMic {...props} />;
}

const MAX_RECORDING_MS = 60_000;
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function RecorderMic({ disabled, onText, onError }: MicProps) {
  const [state, setState] = useState<MicState>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  // Release the microphone if the composer unmounts mid-recording.
  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
        recorder.stream.getTracks().forEach((track) => track.stop());
      }
    },
    [],
  );

  const transcribe = async (blob: Blob) => {
    setState("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blob, "voice");
      const response = await fetch("/api/speech/stt", { method: "POST", body: form });
      if (!response.ok) return onError("failed");
      const { text } = (await response.json()) as { text: string };
      if (text.trim()) onText(text.trim());
      else onError("nothingHeard");
    } catch {
      onError("failed");
    } finally {
      setState("idle");
    }
  };

  const start = async () => {
    onError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return onError("micUnsupported");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      return onError("micDenied");
    }
    const mimeType = MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32_000 } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const blob = new Blob(chunks, { type: recorder.mimeType.split(";")[0] || "audio/webm" });
      if (blob.size < 1000) {
        setState("idle");
        return onError("nothingHeard");
      }
      void transcribe(blob);
    };
    recorderRef.current = recorder;
    recorder.start();
    setState("recording");
    timerRef.current = window.setTimeout(() => recorder.state === "recording" && recorder.stop(), MAX_RECORDING_MS);
  };

  const stop = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  return <MicView state={state} disabled={disabled} onClick={state === "recording" ? stop : () => void start()} />;
}

function BrowserMic({ disabled, onText, onError }: MicProps) {
  const supported = useSpeechSupported();
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const start = useCallback(() => {
    onError(null);
    const Recognition = recognitionCtor();
    if (!Recognition) return onError("micUnsupported");
    const recognition = new Recognition();
    // Bangla (Bangladesh) when the site is in Bangla, otherwise English with an Indian accent model,
    // which copes better with Bangladeshi English than the US one.
    recognition.lang = currentLang() === "en" ? "en-IN" : "bn-BD";
    recognition.continuous = true;
    recognition.interimResults = false;
    let transcript = "";
    let failed = false;
    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) transcript += `${e.results[i][0].transcript} `;
    };
    recognition.onerror = (e) => {
      failed = true;
      onError(e.error === "not-allowed" || e.error === "service-not-allowed" ? "micDenied" : e.error === "no-speech" || e.error === "aborted" ? "nothingHeard" : "failed");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setRecording(false);
      const text = transcript.trim();
      if (text) onText(text);
      else if (!failed) onError("nothingHeard");
    };
    recognitionRef.current = recognition;
    setRecording(true);
    recognition.start();
  }, [onError, onText]);

  if (!supported) return null;
  return <MicView state={recording ? "recording" : "idle"} disabled={disabled} onClick={recording ? () => recognitionRef.current?.stop() : start} />;
}

function MicView({ state, disabled, onClick }: { state: MicState; disabled: boolean; onClick: () => void }) {
  const { t } = useLanguage();
  const v = t.chat.voice;
  const label = state === "recording" ? v.stop : state === "transcribing" ? v.transcribing : v.start;
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={(disabled && state !== "recording") || state === "transcribing"}
        aria-label={label}
        aria-pressed={state === "recording"}
        title={label}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
          state === "recording" ? "bg-clay text-paper" : "text-ink-soft hover:bg-moss hover:text-forest"
        }`}
      >
        {state === "recording" && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full ring-2 ring-clay/50"
            animate={{ scale: [1, 1.3], opacity: [0.8, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        {state === "transcribing" ? <Loader2 className="h-5 w-5 animate-spin" /> : state === "recording" ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
      </button>
      {state !== "idle" && (
        <span role="status" className="ml-1 text-xs text-ink-soft max-sm:sr-only">
          {state === "recording" ? v.recording : v.transcribing}
        </span>
      )}
    </>
  );
}

/** Plain text for the voice: markdown symbols, links and emoji would be read out literally. */
function speakableText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, "")
    .replace(/[*_`~|]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);
}

// One answer plays at a time across the whole chat.
let stopActive: (() => void) | null = null;

/** Reads an answer aloud with the Microsoft neural voice for the current language. */
export function ListenButton({ text }: { text: string }) {
  const { t } = useLanguage();
  const v = t.chat.voice;
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      URL.revokeObjectURL(audio.src);
      audioRef.current = null;
    }
    setState("idle");
  }, []);

  useEffect(() => stop, [stop]);

  const play = async () => {
    stopActive?.();
    stopActive = stop;
    const controller = new AbortController();
    abortRef.current = controller;
    setState("loading");
    try {
      const response = await fetch("/api/speech/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: speakableText(text), lang: currentLang() }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(String(response.status));
      const audio = new Audio(URL.createObjectURL(await response.blob()));
      audioRef.current = audio;
      audio.onended = stop;
      await audio.play();
      setState("playing");
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setState("error");
      window.setTimeout(() => setState((s) => (s === "error" ? "idle" : s)), 3000);
    }
  };

  const busy = state === "loading" || state === "playing";
  return (
    <button
      type="button"
      onClick={busy ? stop : () => void play()}
      aria-pressed={state === "playing"}
      title={state === "error" ? v.errors.failed : undefined}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs hover:bg-moss hover:text-forest ${state === "error" ? "text-clay" : ""} ${busy ? "text-forest" : ""}`}
    >
      {state === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : state === "playing" ? <Square className="h-3 w-3 fill-current" /> : <Volume2 className="h-3.5 w-3.5" />}
      {state === "loading" ? v.loadingAudio : state === "playing" ? v.stopListening : v.listen}
    </button>
  );
}
