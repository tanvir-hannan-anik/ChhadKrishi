import "server-only";

import { isMlConfigured, mlFetch } from "@/lib/ml/service";

/**
 * Speech providers, server-side only. Keys never reach the browser.
 *
 *   GROQ_API_KEY                               voice input: Whisper large-v3 on Groq
 *   AZURE_SPEECH_KEY + AZURE_SPEECH_REGION     read-aloud: official Azure Speech (free tier F0)
 *   ML_SERVICE_URL + ML_SERVICE_TOKEN          read-aloud fallback: the same Azure voices via ml-service (edge-tts)
 */
export type Lang = "bn" | "en";

export class SpeechProviderError extends Error {
  constructor(readonly status: number, scope: string) {
    super(`${scope} responded ${status}`);
    this.name = "SpeechProviderError";
  }
}

// --- Speech to text: Groq Whisper -----------------------------------------------------------

export const isSpeechToTextConfigured = (): boolean => Boolean(process.env.GROQ_API_KEY);

/** whisper-large-v3, not -turbo: turbo labels Bangla speech as Hindi and writes Devanagari. */
const GROQ_STT_MODEL = "whisper-large-v3";

/**
 * Bangla gardening vocabulary as a style prompt. In tests it fixed common misspellings
 * ("শার" → "সার", "কোনো" → "কোন") without pulling English speech towards Bangla.
 */
const BANGLA_PROMPT = "ছাদবাগান নিয়ে প্রশ্ন। গাছের পাতা, ফুল, ফল, মাটি, সার, পানি, পোকা ও রোগ — কী করবো?";

const EXTENSION: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};
export const STT_AUDIO_TYPES = Object.keys(EXTENSION);

async function groqTranscribe(audio: Blob, mediaType: string, language: Lang | null, signal: AbortSignal) {
  const form = new FormData();
  // Groq infers the format from the file name.
  form.append("file", audio, `voice.${EXTENSION[mediaType] ?? "webm"}`);
  form.append("model", GROQ_STT_MODEL);
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");
  form.append("prompt", BANGLA_PROMPT);
  if (language) form.append("language", language);
  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
    signal,
  });
  if (!response.ok) throw new SpeechProviderError(response.status, "Groq");
  return (await response.json()) as { text?: string; language?: string };
}

/**
 * Detects Bangla or English by itself, so gardeners can speak Bangla with the site in English.
 * Whisper sometimes mistakes Bangla for a neighbouring language (Hindi, Assamese); anything that
 * is neither English nor Bangla is transcribed again as Bangla.
 */
export async function transcribe(audio: Blob, mediaType: string, signal: AbortSignal): Promise<{ text: string; lang: Lang }> {
  const first = await groqTranscribe(audio, mediaType, null, signal);
  const detected = first.language?.toLowerCase();
  if (detected === "english" || detected === "bengali") {
    return { text: (first.text ?? "").trim(), lang: detected === "english" ? "en" : "bn" };
  }
  const retry = await groqTranscribe(audio, mediaType, "bn", signal);
  return { text: (retry.text ?? "").trim(), lang: "bn" };
}

// --- Text to speech: Microsoft Azure neural voices ------------------------------------------

const VOICES: Record<Lang, { locale: string; name: string }> = {
  bn: { locale: "bn-BD", name: "bn-BD-NabanitaNeural" },
  en: { locale: "en-IN", name: "en-IN-NeerjaNeural" },
};

const isAzureConfigured = () => Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);
export const isTextToSpeechConfigured = (): boolean => isAzureConfigured() || isMlConfigured();

const escapeXml = (text: string) =>
  text.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/** Returns an MP3 stream: the official Azure Speech API when keyed, otherwise ml-service. */
export async function synthesize(text: string, lang: Lang, signal: AbortSignal): Promise<ReadableStream<Uint8Array>> {
  if (isAzureConfigured()) {
    const voice = VOICES[lang];
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voice.locale}"><voice name="${voice.name}"><prosody rate="-5%">${escapeXml(text)}</prosody></voice></speak>`;
    const response = await fetch(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY!,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "ChhadKrishi",
      },
      body: ssml,
      signal,
    });
    if (!response.ok || !response.body) throw new SpeechProviderError(response.status, "Azure Speech");
    return response.body;
  }
  const response = await mlFetch("/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang }),
    signal,
  });
  if (!response.body) throw new SpeechProviderError(502, "ML service");
  return response.body;
}
