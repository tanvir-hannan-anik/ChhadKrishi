import { apiError, parseJson, requireUser } from "@/lib/api";
import { listOrders, placeOrder } from "@/lib/shop/store";
import { checkoutInput } from "@/lib/validation";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  return Response.json({ orders: await listOrders(user.userId) });
}

/** Submits the current cart as an order request (no payment is taken). */
export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await parseJson(request, checkoutInput);
  if (body instanceof Response) return body;
  const order = await placeOrder(user.userId, body);
  if (!order) return apiError("CART_EMPTY", 409);
  return Response.json({ order }, { status: 201 });
}
