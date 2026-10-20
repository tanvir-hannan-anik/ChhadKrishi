import { z } from "zod";
import { apiError, parseJson, requireUser } from "@/lib/api";
import { cancelOrder } from "@/lib/shop/store";

const input = z.object({ status: z.literal("cancelled") });

/** The only change a customer can make is cancelling a still-pending request. */
export async function PATCH(request: Request, { params }: RouteContext<"/api/shop/orders/[id]">) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await parseJson(request, input);
  if (body instanceof Response) return body;
  const result = await cancelOrder(user.userId, (await params).id);
  if (result === "not-found") return apiError("NOT_FOUND", 404);
  if (result === "not-cancellable") return apiError("NOT_CANCELLABLE", 409);
  return Response.json({ ok: true });
}
