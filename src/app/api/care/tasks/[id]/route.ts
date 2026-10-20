import { apiError, parseJson, requireUser } from "@/lib/api";
import { deleteTask, updateTask } from "@/lib/care/store";
import { ownsPlant } from "@/lib/garden/store";
import { careTaskInput } from "@/lib/validation";

export async function PATCH(request: Request, { params }: RouteContext<"/api/care/tasks/[id]">) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await parseJson(request, careTaskInput.partial());
  if (body instanceof Response) return body;
  if (body.plantId && !(await ownsPlant(user.userId, body.plantId))) return apiError("VALIDATION_FAILED", 400, { fields: ["plantId"] });
  const ok = await updateTask(user.userId, (await params).id, body);
  return ok ? Response.json({ ok: true }) : apiError("NOT_FOUND", 404);
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/care/tasks/[id]">) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const ok = await deleteTask(user.userId, (await params).id);
  return ok ? new Response(null, { status: 204 }) : apiError("NOT_FOUND", 404);
}
