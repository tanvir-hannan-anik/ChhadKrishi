import { z } from "zod";
import { apiError, parseJson, requireUser } from "@/lib/api";
import { notify, pushPublicKey, removeSubscription, saveSubscription } from "@/lib/notifications/store";

/** The VAPID public key a browser needs to subscribe (null when push is not configured). */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  return Response.json({ publicKey: pushPublicKey() });
}

const subscription = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  lang: z.enum(["bn", "en"]).default("bn"),
});

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  if (!pushPublicKey()) return apiError("PUSH_NOT_CONFIGURED", 503);
  const body = await parseJson(request, subscription);
  if (body instanceof Response) return body;
  await saveSubscription(user.userId, { endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth, lang: body.lang });
  // A confirmation on the device proves delivery works end to end.
  await notify(user.userId, { kind: "push-enabled", params: {}, url: "/profile", dedupeKey: `push-enabled:${body.endpoint.slice(-48)}` });
  return new Response(null, { status: 204 });
}

export async function DELETE(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await parseJson(request, z.object({ endpoint: z.string().max(1000) }));
  if (body instanceof Response) return body;
  await removeSubscription(user.userId, body.endpoint);
  return new Response(null, { status: 204 });
}
