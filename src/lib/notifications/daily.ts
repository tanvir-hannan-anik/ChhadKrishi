import "server-only";

import { listTasks } from "@/lib/care/store";
import { db } from "@/lib/db";
import { todayLocal } from "@/lib/dates";
import { weatherAlert } from "@/lib/weather/model";
import { getWeatherForUser } from "@/lib/weather/service";
import { notify } from "./store";

/**
 * Today's notifications for one gardener: a weather alert when today or tomorrow looks risky
 * for plants, and a reminder when care tasks are due. Safe to run any number of times a day —
 * each is stored (and pushed) at most once per date.
 *
 * Runs from the daily cron for every gardener with a location or a subscribed device, and
 * lazily whenever the gardener's notification list is loaded.
 */
export async function runDailyChecks(userId: string) {
  const today = todayLocal();
  await Promise.allSettled([
    (async () => {
      const report = await getWeatherForUser(userId);
      const alert = weatherAlert(report);
      if (!alert) return;
      await notify(userId, {
        kind: "weather",
        params: { alert: alert.kind, value: alert.value, date: alert.date, today, place: report.place.label },
        url: "/weather",
        dedupeKey: `weather:${today}`,
      });
    })(),
    (async () => {
      const due = (await listTasks(userId, today)).filter((task) => task.dueToday && !task.doneToday);
      if (due.length === 0) return;
      await notify(userId, { kind: "care", params: { count: due.length }, url: "/care", dedupeKey: `care:${today}` });
    })(),
  ]);
}

/** Gardeners worth checking from the cron: anyone with a saved location or a subscribed device. */
export async function usersForDailyChecks(): Promise<string[]> {
  const rows = await db
    .selectFrom("user_profile")
    .select("user_id")
    .where("latitude", "is not", null)
    .union(db.selectFrom("push_subscription").select("user_id"))
    .execute();
  return rows.map((row) => row.user_id);
}
