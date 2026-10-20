import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { gateway, type ImageModel, type LanguageModel } from "ai";

/**
 * AI configuration — the single place that knows which provider and models are used.
 * The first configured provider wins:
 *
 *   1. AI_GATEWAY_API_KEY            Vercel AI Gateway (or OIDC when deployed on Vercel)
 *   2. OPENROUTER_API_KEY            OpenRouter, free models by default (with automatic fallback)
 *   3. GOOGLE_GENERATIVE_AI_API_KEY  Google Gemini
 *
 * Optional overrides:
 *   CHHADKRISHI_CHAT_MODEL / CHHADKRISHI_VISION_MODEL   model id for the active provider;
 *     for OpenRouter a comma-separated list is accepted — the first is primary, the rest are
 *     fallbacks OpenRouter tries automatically on rate limits or outages.
 *
 * Keys are read only on the server; nothing here is ever sent to the browser.
 */
/** "structured" = JSON-schema output (photo analysis, care suggestions); "vision" also accepts images. */
export type ModelKind = "chat" | "vision" | "structured";
export type AiProvider = "gateway" | "openrouter" | "google";

// Free OpenRouter models that accept images and handle Bangla, best first. Free models are
// often rate-limited upstream, so OpenRouter falls through this list automatically.
const OPENROUTER_FREE_MODELS = ["google/gemma-4-31b-it:free", "minimax/minimax-m3.1-flash:free", "nvidia/nemotron-3.5-super-vl:free"];

const DEFAULTS: Record<AiProvider, Record<ModelKind, string[]>> = {
  gateway: { chat: ["anthropic/claude-sonnet-5.5"], vision: ["anthropic/claude-sonnet-5.5"], structured: ["anthropic/claude-sonnet-5.5"] },
  openrouter: { chat: OPENROUTER_FREE_MODELS, vision: OPENROUTER_FREE_MODELS, structured: OPENROUTER_FREE_MODELS },
  google: { chat: ["gemini-flash-latest"], vision: ["gemini-flash-latest"], structured: ["gemini-flash-latest"] },
};

function configuredModels(kind: ModelKind, provider: AiProvider): string[] {
  const override = kind === "chat" ? process.env.CHHADKRISHI_CHAT_MODEL : kind === "vision" ? process.env.CHHADKRISHI_VISION_MODEL : undefined;
  const list = override?.split(",").map((s) => s.trim()).filter(Boolean);
  return list?.length ? list : DEFAULTS[provider][kind];
}

/**
 * Development-only deterministic test model (CHHADKRISHI_AI_FIXTURE=1), used to exercise the
 * UI states without network access. Its output is explicitly labelled as test output, and it
 * is ignored in production builds so it can never stand in for real analysis.
 */
export function isFixtureMode(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.CHHADKRISHI_AI_FIXTURE === "1";
}

export function activeProvider(): AiProvider | null {
  if (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) return "gateway";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return "google";
  return null;
}

export function isAiConfigured(): boolean {
  return isFixtureMode() || activeProvider() !== null;
}

export async function getModel(kind: ModelKind): Promise<LanguageModel> {
  if (isFixtureMode()) {
    const { createFixtureModel } = await import("./fixture-model");
    return createFixtureModel(kind);
  }
  const provider = activeProvider();
  if (!provider) throw Object.assign(new Error("No AI provider configured"), { name: "GatewayModelNotFoundError" });
  const [primary, ...fallbacks] = configuredModels(kind, provider);

  switch (provider) {
    case "gateway":
      return gateway(primary);
    case "google":
      return createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })(primary);
    case "openrouter": {
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
        headers: { "X-Title": "ChhadKrishi", "HTTP-Referer": process.env.BETTER_AUTH_URL ?? "http://localhost:3000" },
      });
      return openrouter(primary, {
        models: fallbacks.length ? [primary, ...fallbacks] : undefined,
        // Free models are reasoning models: keep thinking short and out of the visible answer.
        reasoning: { effort: "low", exclude: true },
        ...(kind !== "chat" && {
          // Repairs slightly malformed JSON (non-streaming only)...
          plugins: [{ id: "response-healing" }],
          // ...and only routes to providers that honour the JSON schema; some free providers
          // otherwise ignore response_format and answer in prose.
          extraBody: { provider: { require_parameters: true } },
        }),
      });
    }
  }
}

/**
 * Image model for the AI Garden Designer. It must accept a reference photo, because designs
 * edit the gardener's real space rather than inventing a new one. Provider order differs from
 * the text models: Gemini image editing via Google is preferred over OpenRouter, whose free
 * tier has no image models.
 *
 *   CHHADKRISHI_IMAGE_MODEL      model id for the active image provider
 *   CHHADKRISHI_IMAGE_PROVIDER   force "gateway" | "google" | "openrouter"
 */
export type ImageProvider = "gateway" | "google" | "openrouter";

const IMAGE_DEFAULTS: Record<ImageProvider, string> = {
  gateway: "bfl/flux-kontext-pro",
  google: "gemini-3.1-flash-image-preview",
  openrouter: "google/gemini-3.1-flash-image-preview",
};

export function activeImageProvider(): ImageProvider | null {
  // Explicit choice, e.g. when a Google key exists but its project has no image access.
  const forced = process.env.CHHADKRISHI_IMAGE_PROVIDER?.trim();
  if (forced === "gateway" || forced === "google" || forced === "openrouter") return forced;
  if (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) return "gateway";
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return "google";
  if (process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_IMAGE_API_KEY) return "openrouter";
  return null;
}

export function isImageConfigured(): boolean {
  return isFixtureMode() || activeImageProvider() !== null;
}

export function getImageModel(): ImageModel {
  const provider = activeImageProvider();
  if (!provider) throw Object.assign(new Error("No image provider configured"), { name: "GatewayModelNotFoundError" });
  const modelId = process.env.CHHADKRISHI_IMAGE_MODEL?.trim() || IMAGE_DEFAULTS[provider];
  switch (provider) {
    case "gateway":
      return gateway.image(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY }).image(modelId);
    case "openrouter":
      return createOpenRouter({
        // An optional separate key (e.g. an account with credit) just for images.
        apiKey: process.env.OPENROUTER_IMAGE_API_KEY || process.env.OPENROUTER_API_KEY,
        headers: { "X-Title": "ChhadKrishi", "HTTP-Referer": process.env.BETTER_AUTH_URL ?? "http://localhost:3000" },
      }).imageModel(modelId);
  }
}
