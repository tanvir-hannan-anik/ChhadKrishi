import "server-only";

import type { Lang } from "@/lib/i18n/dictionary";
import type { DesignPlan, Requirements, SpaceAnalysis } from "./schema";

/**
 * DEVELOPMENT-ONLY designer output (CHHADKRISHI_AI_FIXTURE=1, ignored in production) for
 * exercising the consultation, plan and render states without an API key. Every text says
 * plainly that it is test output. The "render" simply returns the original photo.
 */
export function fixtureSpace(lang: Lang): SpaceAnalysis {
  return {
    isGardenSpace: true,
    spaceType: null,
    summary:
      lang === "bn"
        ? "🧪 পরীক্ষামূলক মডেল — এটি আসল ছবি বিশ্লেষণ নয়। চলুন কয়েকটি প্রশ্নে আপনার বাগানের চাহিদা বুঝে নিই।"
        : "🧪 Test model — this is not a real photo analysis. Let's work out your garden needs in a few questions.",
    estimatedAreaSqft: null,
    lightGuess: null,
    features: ["test feature"],
    constraints: [],
  };
}

export function fixturePlan(lang: Lang, r: Requirements): DesignPlan {
  const bn = lang === "bn";
  const budget = r.budgetBdt ?? 10000;
  return {
    title: bn ? "🧪 পরীক্ষামূলক নকশা (TEST OUTPUT)" : "🧪 Test design (TEST OUTPUT)",
    concept: bn
      ? "এটি পরীক্ষামূলক মডেলের তৈরি নমুনা নকশা — আসল পরামর্শ নয়। আসল নকশার জন্য একটি এআই কী সেট করুন।"
      : "This sample design comes from the test model and is not real advice. Set an AI key for real designs.",
    layout: [
      { zone: bn ? "রেলিং বরাবর" : "Along the railing", placement: bn ? "বাম পাশে" : "Left side", items: bn ? "ঝুলন্ত টব" : "Hanging planters" },
      { zone: bn ? "কোণ" : "Corner", placement: bn ? "পেছনের ডান কোণ" : "Back-right corner", items: bn ? "বড় ড্রামে ফলগাছ" : "Fruit tree in a half drum" },
    ],
    plants: [
      { name: bn ? "পুদিনা (পরীক্ষা)" : "Mint (test)", localName: "পুদিনা", why: "test", quantity: 2, potSize: "8-inch", sunlight: "partial", care: "easy", estCostBdt: Math.round(budget * 0.1) },
      { name: bn ? "মরিচ (পরীক্ষা)" : "Chilli (test)", localName: "মরিচ", why: "test", quantity: 3, potSize: "10-inch", sunlight: "full", care: "easy", estCostBdt: Math.round(budget * 0.15) },
    ],
    materials: [{ item: bn ? "টব ও মাটি" : "Pots and soil", quantity: "—", estCostBdt: Math.round(budget * 0.75) }],
    budget: {
      totalBdt: budget,
      breakdown: [
        { category: bn ? "গাছ" : "Plants", amountBdt: Math.round(budget * 0.25) },
        { category: bn ? "টব ও মাটি" : "Pots & soil", amountBdt: Math.round(budget * 0.75) },
      ],
      fitsBudget: true,
      note: bn ? "পরীক্ষামূলক হিসাব।" : "Test figures.",
    },
    steps: [{ title: bn ? "পরীক্ষামূলক ধাপ" : "Test step", detail: bn ? "অনুসরণ করবেন না।" : "Do not follow." }],
    maintenance: [{ frequency: bn ? "প্রতিদিন" : "Daily", task: bn ? "পরীক্ষা" : "Test" }],
    tips: [bn ? "পরীক্ষামূলক টিপ" : "Test tip"],
    imagePrompt: "Test render: add a few potted plants.",
  };
}
