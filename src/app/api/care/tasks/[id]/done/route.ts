import { z } from "zod";
import { apiError, parseJson, requireUser } from "@/lib/api";
import { setTaskDone } from "@/lib/care/store";
import { todayLocal } from "@/lib/dates";

const input = z.object({ done: z.boolean() });

/** Ticks a task for today (Bangladesh date). The date is decided by the server, not the client. */
export async function PUT(request: Request, { params }: RouteContext<"/api/care/tasks/[id]/done">) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await parseJson(request, input);
  if (body instanceof Response) return body;
  const ok = await setTaskDone(user.userId, (await params).id, todayLocal(), body.done);
  return ok ? Response.json({ ok: true }) : apiError("NOT_FOUND", 404);
}
