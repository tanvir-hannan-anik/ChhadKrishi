import { z } from "zod";
import { parseJson, requireUser } from "@/lib/api";
import { runDailyChecks } from "@/lib/notifications/daily";
import { listNotifications, markRead } from "@/lib/notifications/store";

// Lazy daily checks run at most this often per gardener and server instance.
const CHECK_EVERY_MS = 30 * 60 * 1000;
const lastChecked = new Map<string, number>();

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const last = lastChecked.get(user.userId) ?? 0;
  if (Date.now() - last > CHECK_EVERY_MS) {
    lastChecked.set(user.userId, Date.now());
    // A failed weather lookup must never hide the gardener's existing notifications.
    await runDailyChecks(user.userId).catch((error) => console.warn("[notifications] daily checks failed:", (error as Error).message));
  }
  return Response.json(await listNotifications(user.userId));
}

const input = z.object({ ids: z.union([z.array(z.string().max(64)).max(100), z.literal("all")]) });

/** Marks notifications as read. */
export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await parseJson(request, input);
  if (body instanceof Response) return body;
  await markRead(user.userId, body.ids);
  return new Response(null, { status: 204 });
}
