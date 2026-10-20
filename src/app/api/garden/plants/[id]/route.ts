import { apiError, parseJson, requireUser } from "@/lib/api";
import { deletePlant, updatePlant } from "@/lib/garden/store";
import { plantInput } from "@/lib/validation";

export async function PATCH(request: Request, { params }: RouteContext<"/api/garden/plants/[id]">) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await parseJson(request, plantInput.partial());
  if (body instanceof Response) return body;
  const ok = await updatePlant(user.userId, (await params).id, body);
  return ok ? Response.json({ ok: true }) : apiError("NOT_FOUND", 404);
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/garden/plants/[id]">) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const ok = await deletePlant(user.userId, (await params).id);
  return ok ? new Response(null, { status: 204 }) : apiError("NOT_FOUND", 404);
}
