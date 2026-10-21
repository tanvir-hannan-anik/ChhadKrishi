import "server-only";

import webpush from "web-push";
import { db } from "@/lib/db";
import type { Lang } from "@/lib/i18n/dictionary";
import { notificationText, type NotificationKind, type NotificationParams } from "./messages";

/**
 * In-app notifications, also delivered as Web Push to every device the gardener enabled.
 * Each (user, dedupe key) pair is stored once, so repeated checks never notify twice.
 */
export interface AppNotification {
  id: string;
  kind: string;
  params: unknown;
  url: string;
  createdAt: string;
  read: boolean;
}

const pushReady = (() => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@chhadkrishi.app", publicKey, privateKey);
  return true;
})();

/** The public VAPID key the browser needs to subscribe, or null when push is not configured. */
export function pushPublicKey(): string | null {
  return pushReady ? process.env.VAPID_PUBLIC_KEY! : null;
}

export async function notify<K extends NotificationKind>(
  userId: string,
  notification: { kind: K; params: NotificationParams[K]; url: string; dedupeKey: string },
): Promise<boolean> {
  const inserted = await db
    .insertInto("notification")
    .values({
      id: crypto.randomUUID(),
      user_id: userId,
      kind: notification.kind,
      params: JSON.stringify(notification.params),
      url: notification.url,
      dedupe_key: notification.dedupeKey,
    })
    .onConflict((oc) => oc.columns(["user_id", "dedupe_key"]).doNothing())
    .returning("id")
    .executeTakeFirst();
  if (!inserted) return false;
  await sendPush(userId, notification);
  return true;
}

async function sendPush(userId: string, notification: { kind: string; params: unknown; url: string; dedupeKey: string }) {
  if (!pushReady) return;
  const subscriptions = await db.selectFrom("push_subscription").selectAll().where("user_id", "=", userId).execute();
  await Promise.all(
    subscriptions.map(async (subscription) => {
      const { title, body } = notificationText(notification.kind, notification.params, subscription.lang);
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          JSON.stringify({ title, body, url: notification.url, tag: notification.dedupeKey }),
          { TTL: 60 * 60 * 12, urgency: notification.kind === "weather" ? "high" : "normal" },
        );
      } catch (error) {
        // 404/410: the browser dropped this subscription — forget it.
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db.deleteFrom("push_subscription").where("endpoint", "=", subscription.endpoint).execute();
        else console.warn("[push] delivery failed:", status ?? (error as Error).name);
      }
    }),
  );
}

export async function listNotifications(userId: string, limit = 30): Promise<{ items: AppNotification[]; unread: number }> {
  const [rows, unread] = await Promise.all([
    db.selectFrom("notification").selectAll().where("user_id", "=", userId).orderBy("created_at", "desc").limit(limit).execute(),
    db
      .selectFrom("notification")
      .select((eb) => eb.fn.countAll<string>().as("count"))
      .where("user_id", "=", userId)
      .where("read_at", "is", null)
      .executeTakeFirst(),
  ]);
  return {
    items: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      params: row.params,
      url: row.url,
      createdAt: new Date(row.created_at).toISOString(),
      read: row.read_at !== null,
    })),
    unread: Number(unread?.count ?? 0),
  };
}

export async function markRead(userId: string, ids: string[] | "all") {
  let query = db.updateTable("notification").set({ read_at: new Date() }).where("user_id", "=", userId).where("read_at", "is", null);
  if (ids !== "all") {
    if (ids.length === 0) return;
    query = query.where("id", "in", ids);
  }
  await query.execute();
}

export async function saveSubscription(userId: string, subscription: { endpoint: string; p256dh: string; auth: string; lang: Lang }) {
  const values = { user_id: userId, p256dh: subscription.p256dh, auth: subscription.auth, lang: subscription.lang };
  await db
    .insertInto("push_subscription")
    .values({ endpoint: subscription.endpoint, ...values })
    .onConflict((oc) => oc.column("endpoint").doUpdateSet(values))
    .execute();
}

export async function removeSubscription(userId: string, endpoint: string) {
  await db.deleteFrom("push_subscription").where("user_id", "=", userId).where("endpoint", "=", endpoint).execute();
}

export async function hasSubscriptions(userId: string): Promise<boolean> {
  const row = await db.selectFrom("push_subscription").select("endpoint").where("user_id", "=", userId).limit(1).executeTakeFirst();
  return Boolean(row);
}
