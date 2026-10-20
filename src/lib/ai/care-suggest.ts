import "server-only";

import { generateText, Output } from "ai";
import { z } from "zod";
import { getModel } from "./config";
import { careSystemPrompt } from "./prompts";
import type { Lang } from "@/lib/i18n/dictionary";

// Limits are stated in the descriptions and enforced in suggestCareRoutine, not in the schema:
// providers that validate output against the schema (Groq) reject the whole routine when one
// task says "every 60 days".
export const careSuggestionSchema = z.object({
  tasks: z
    .array(
      z.object({
        plantName: z.string().describe("Exactly one of the gardener's plant names, or empty for whole-garden tasks"),
        title: z.string().describe("Short action, e.g. 'Water at the base'"),
        kind: z.enum(["water", "fertilize", "prune", "pest", "other"]),
        everyDays: z.number().int().describe("Repeat every N days, from 1 to 30"),
        timeOfDay: z.enum(["morning", "afternoon", "evening"]),
        reason: z.string().describe("One short sentence explaining why"),
      }),
    )
    .describe("At most 12 tasks"),
});

export type CareSuggestion = z.infer<typeof careSuggestionSchema>["tasks"][number];

export async function suggestCareRoutine(input: { garden: string; lang: Lang; abortSignal?: AbortSignal }): Promise<CareSuggestion[]> {
  const { output } = await generateText({
    model: await getModel("structured"),
    system: careSystemPrompt(input.lang),
    prompt: `The gardener's setup: ${input.garden}\nCreate a practical recurring care routine for the current season.`,
    output: Output.object({ name: "care_routine", schema: careSuggestionSchema }),
    abortSignal: input.abortSignal,
  });
  return output.tasks.slice(0, 12).map((task) => ({ ...task, everyDays: Math.min(30, Math.max(1, Math.round(task.everyDays) || 1)) }));
}
