import { z } from "zod";
import { apiError, parseJson, requireUser } from "@/lib/api";
import { createTasks, listTasks } from "@/lib/care/store";
import { todayLocal } from "@/lib/dates";
import { ownsPlant } from "@/lib/garden/store";
import { careTaskInput } from "@/lib/validation";

const MAX_TASKS = 200;

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const today = todayLocal();
  return Response.json({ today, tasks: await listTasks(user.userId, today) });
}

// Accepts one task or a batch (e.g. accepted AI suggestions).
const createInput = z.object({ tasks: z.array(careTaskInput).min(1).max(20) });

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await parseJson(request, createInput);
  if (body instanceof Response) return body;

  const today = todayLocal();
  const existing = await listTasks(user.userId, today);
  if (existing.length + body.tasks.length > MAX_TASKS) return apiError("LIMIT_REACHED", 409);
  // A task may only reference one of the user's own plants.
  for (const plantId of new Set(body.tasks.map((t) => t.plantId).filter((id): id is string => id !== null))) {
    if (!(await ownsPlant(user.userId, plantId))) return apiError("VALIDATION_FAILED", 400, { fields: ["plantId"] });
  }
  const created = await createTasks(
    user.userId,
    body.tasks.map((t) => ({ ...t, startDate: today })),
  );
  return Response.json({ created, tasks: await listTasks(user.userId, today) }, { status: 201 });
}
