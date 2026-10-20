import "server-only";

import { generateText, Output } from "ai";
import { getModel } from "./config";
import { analysisSystemPrompt } from "./prompts";
import { plantAnalysisSchema, type PlantAnalysis } from "./analysis-schema";
import type { Lang } from "@/lib/i18n/dictionary";

export async function analyzePlantPhoto(input: {
  image: Uint8Array;
  mediaType: string;
  note: string;
  lang: Lang;
  context?: string;
  abortSignal?: AbortSignal;
}): Promise<PlantAnalysis> {
  const instruction =
    input.lang === "bn"
      ? "এই ছবির গাছটি পরীক্ষা করে নির্দিষ্ট কাঠামোতে ফলাফল দিন।"
      : "Examine the plant in this photo and return the structured result.";

  const { output } = await generateText({
    model: await getModel("vision"),
    system: analysisSystemPrompt(input.lang) + (input.context ?? ""),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: input.note ? `${instruction}\n\nGardener's note: ${input.note}` : instruction },
          { type: "file", mediaType: input.mediaType, data: input.image },
        ],
      },
    ],
    output: Output.object({ name: "plant_analysis", schema: plantAnalysisSchema }),
    abortSignal: input.abortSignal,
  });

  return output;
}
