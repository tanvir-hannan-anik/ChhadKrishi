import { z } from "zod";
import { apiError, parseJson, requireUser } from "@/lib/api";
import { getCart, MAX_QUANTITY, setCartQuantity } from "@/lib/shop/store";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  return Response.json({ cart: await getCart(user.userId) });
}

const input = z.object({ productId: z.string().min(1).max(64), quantity: z.number().int().min(0).max(MAX_QUANTITY) });

/** Sets one cart line's quantity (0 removes it) and returns the updated cart. */
export async function PUT(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await parseJson(request, input);
  if (body instanceof Response) return body;
  if (!(await setCartQuantity(user.userId, body.productId, body.quantity))) return apiError("NOT_FOUND", 404);
  return Response.json({ cart: await getCart(user.userId) });
}
