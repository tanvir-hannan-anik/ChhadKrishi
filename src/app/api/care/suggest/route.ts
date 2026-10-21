import { z } from "zod";
import { apiError, parseJson, requireUser } from "@/lib/api";
import { suggestCareRoutine } from "@/lib/ai/care-suggest";
import { isAiConfigured } from "@/lib/ai/config";
import { classifyAiError, logAiError } from "@/lib/ai/errors";
import { takeAiQuota } from "@/lib/ai/rate-limit";
import { gardenContext, getGarden } from "@/lib/garden/store";
import { isGrounded, isKbConfigured, kbAnswer, kbMode } from "@/lib/rag/kb";

const input = z.object({ lang: z.enum(["bn", "en"]).default("bn") });

/**
 * Suggests a care routine for the user's saved plants. Nothing is stored here — the user
 * reviews the suggestions and saves the ones they want through POST /api/care/tasks.
 */
export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await parseJson(request, input);
  if (body instanceof Response) return body;

  const garden = await getGarden(user.userId);
  if (garden.plants.length === 0) return apiError("NO_PLANTS", 409);
  if (!isAiConfigured()) return apiError("AI_NOT_CONFIGURED", 503);
  if (!takeAiQuota("suggest", user.userId)) return apiError("USER_RATE_LIMITED", 429);
  const plantNames = garden.plants.map((p) => p.name);

  try {
    const setup = (await gardenContext(user.userId)) ?? "";
    // Evidence from the Agriculture Encyclopedia for these plants (null when not configured).
    const knowledge = isKbConfigured()
      ? await kbAnswer(
          { task: "care_plan", question: `Care guidance (watering, light, fertilizer/nutrients, pruning, pest prevention) for: ${plantNames.join(", ")}`, lang: body.lang, context: setup },
          request.signal,
        )
      : null;
    const suggestions = await suggestCareRoutine({
      garden: setup,
      lang: body.lang,
      knowledge: knowledge && isGrounded(knowledge) ? knowledge : null,
      // Strict mode: no fertilizer or pest-control task without a cited source.
      requireEvidenceFor: isKbConfigured() && kbMode() === "strict" ? ["fertilize", "pest"] : [],
      abortSignal: request.signal,
    });
    // Link suggestions to the user's own plants by name; unknown names become garden-wide tasks.
    const byName = new Map(garden.plants.map((p) => [p.name.trim().toLowerCase(), p]));
    return Response.json({
      suggestions: suggestions.map((s) => {
        const plant = byName.get(s.plantName.trim().toLowerCase()) ?? null;
        return { ...s, plantId: plant?.id ?? null, plantName: plant?.name ?? null };
      }),
    });
  } catch (error) {
    const code = classifyAiError(error);
    logAiError("care/suggest", error);
    return apiError(code, code === "AI_RATE_LIMITED" || code === "AI_UNAVAILABLE" ? 503 : 502);
  }
}
