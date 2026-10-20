import "server-only";

import { generateText, Output } from "ai";
import { getModel } from "./config";
import { describePhoto, describesPhotos, photoNote } from "./photo-description";
import { analysisSystemPrompt } from "./prompts";
import { limitAnalysis, plantAnalysisSchema, type PlantAnalysis } from "./analysis-schema";
import type { Lang } from "@/lib/i18n/dictionary";

export async function analyzePlantPhoto(input: {
  image: Uint8Array;
  mediaType: string;
  note: string;
  lang: Lang;
  context?: string;
  /** OpenCV + YOLO measurements of the same photo, when the ML service is available. */
  evidence?: string;
  abortSignal?: AbortSignal;
}): Promise<PlantAnalysis> {
  const instruction =
    input.lang === "bn"
      ? "এই ছবির গাছটি পরীক্ষা করে নির্দিষ্ট কাঠামোতে ফলাফল দিন।"
      : "Examine the plant in this photo and return the structured result.";

  const text = input.note ? `${instruction}\n\nGardener's note: ${input.note}` : instruction;
  // Two-step on providers whose vision model writes weak Bangla: describe, then analyse as text.
  const described = describesPhotos()
    ? await describePhoto({ image: input.image, mediaType: input.mediaType, focus: "plant", abortSignal: input.abortSignal })
    : null;

  const { output } = await generateText({
    model: await getModel(described === null ? "vision" : "structured"),
    system: analysisSystemPrompt(input.lang) + (input.context ?? "") + (input.evidence ?? ""),
    messages: [
      {
        role: "user",
        content:
          described === null
            ? [
                { type: "text", text },
                { type: "file", mediaType: input.mediaType, data: input.image },
              ]
            : [{ type: "text", text: `${text}\n\n${photoNote(described)}` }],
      },
    ],
    output: Output.object({ name: "plant_analysis", schema: plantAnalysisSchema }),
    abortSignal: input.abortSignal,
  });

  return limitAnalysis(output);
}
