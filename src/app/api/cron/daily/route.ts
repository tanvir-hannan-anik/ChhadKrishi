import { ensureAuthReady } from "@/lib/auth/server";
import { runDailyChecks, usersForDailyChecks } from "@/lib/notifications/daily";

/**
 * Daily weather alerts and care reminders for every gardener (Vercel Cron, see vercel.json).
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; anything else is rejected.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  await ensureAuthReady();
  const users = await usersForDailyChecks();
  // Small batches keep the weather and push providers comfortable.
  for (let i = 0; i < users.length; i += 10) {
    await Promise.allSettled(users.slice(i, i + 10).map((userId) => runDailyChecks(userId)));
  }
  return Response.json({ checked: users.length });
}
