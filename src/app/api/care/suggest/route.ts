import { z } from "zod";
import { apiError, parseJson, requireUser } from "@/lib/api";
import { suggestCareRoutine } from "@/lib/ai/care-suggest";
import { isAiConfigured } from "@/lib/ai/config";
import { classifyAiError, logAiError } from "@/lib/ai/errors";
import { takeAiQuota } from "@/lib/ai/rate-limit";
import { gardenContext, getGarden } from "@/lib/garden/store";

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

  try {
    const suggestions = await suggestCareRoutine({ garden: (await gardenContext(user.userId)) ?? "", lang: body.lang, abortSignal: request.signal });
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
