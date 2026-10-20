import "server-only";

import { APICallError, simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import type { ModelKind } from "./config";

/**
 * DEVELOPMENT-ONLY test model (enabled by CHHADKRISHI_AI_FIXTURE=1, ignored in production).
 * Lets the UI's loading, streaming, success and failure states be exercised without an API
 * key. Every response says plainly that it is test output and not a real diagnosis.
 * Include "#fail" in a message or note to simulate a provider outage.
 */
const USAGE = {
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
};

type PromptMessage = { role: string; content: unknown };

function lastUserText(prompt: unknown): string {
  const messages = (prompt as PromptMessage[]) ?? [];
  const user = [...messages].reverse().find((m) => m.role === "user");
  const parts = Array.isArray(user?.content) ? (user.content as { type: string; text?: string }[]) : [];
  return parts.filter((p) => p.type === "text").map((p) => p.text ?? "").join(" ").trim();
}

function hasImage(prompt: unknown): boolean {
  return ((prompt as PromptMessage[]) ?? []).some((m) => Array.isArray(m.content) && (m.content as { type: string }[]).some((p) => p.type === "file"));
}

function systemText(prompt: unknown): string {
  const system = ((prompt as PromptMessage[]) ?? []).find((m) => m.role === "system");
  return typeof system?.content === "string" ? system.content : "";
}

function outage(): never {
  throw new APICallError({ message: "Simulated provider outage", url: "fixture://model", requestBodyValues: {}, statusCode: 503, isRetryable: false });
}

export function createFixtureModel(kind: ModelKind) {
  return new MockLanguageModelV4({
    doStream: async ({ prompt }) => {
      const text = lastUserText(prompt);
      if (text.includes("#fail")) outage();
      const reply = [
        "🧪 **পরীক্ষামূলক মডেল** — এটি আসল এআই উত্তর নয় (TEST OUTPUT, not real AI).",
        "",
        `আপনার বার্তা পেয়েছি: “${text.slice(0, 160)}”${hasImage(prompt) ? " — সাথে একটি ছবিও।" : ""}`,
        "",
        "- এই উত্তরটি শুধু চ্যাটের স্ট্রিমিং ও ইতিহাস পরীক্ষার জন্য।",
        "- আসল পরামর্শ পেতে `AI_GATEWAY_API_KEY` সেট করুন।",
        "- নিচের ভিডিও ও পণ্যের কার্ডগুলোও পরীক্ষামূলক বাছাই (test resource cards below).",
      ].join("\n");
      const words = reply.split(/(?<=\s)/);
      return {
        stream: simulateReadableStream({
          initialDelayInMs: 700,
          chunkDelayInMs: 25,
          chunks: [
            { type: "text-start" as const, id: "t1" },
            ...words.map((delta) => ({ type: "text-delta" as const, id: "t1", delta })),
            { type: "text-end" as const, id: "t1" },
            { type: "finish" as const, finishReason: { unified: "stop" as const, raw: undefined }, logprobs: undefined, usage: USAGE },
          ],
        }),
      };
    },
    doGenerate: async ({ prompt }) => {
      if (systemText(prompt).includes("[resource-plan]")) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        const plan = { videoQuery: "rooftop garden neem oil spray", productIds: ["fert-neem-cake-1kg", "fert-vermicompost-5kg"] };
        return { content: [{ type: "text", text: JSON.stringify(plan) }], finishReason: { unified: "stop", raw: undefined }, usage: USAGE, warnings: [] };
      }
      if (kind !== "vision") outage();
      if (lastUserText(prompt).includes("#fail")) outage();
      await new Promise((resolve) => setTimeout(resolve, 1800));
      const result = {
        isPlant: true,
        needsBetterPhoto: false,
        photoTips: [],
        plant: { commonName: "🧪 পরীক্ষামূলক ফলাফল (TEST OUTPUT)", scientificName: "" },
        healthStatus: "unclear",
        confidence: "low",
        summary: "এটি পরীক্ষামূলক মডেলের তৈরি নমুনা — আসল বিশ্লেষণ নয়। আসল ফলাফলের জন্য AI_GATEWAY_API_KEY সেট করুন।",
        issues: [{ name: "পরীক্ষামূলক সমস্যা (test)", likelihood: "low", signs: ["UI পরীক্ষার নমুনা লেখা"] }],
        treatment: [{ step: "এটি একটি পরীক্ষামূলক ধাপ — অনুসরণ করবেন না।", organic: true }],
        prevention: ["পরীক্ষামূলক তথ্য"],
        urgency: "low",
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        finishReason: { unified: "stop", raw: undefined },
        usage: USAGE,
        warnings: [],
      };
    },
  });
}
