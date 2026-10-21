"use client";

import type { Lang } from "@/lib/i18n/dictionary";

/** Browser side of Web Push: service worker registration and (un)subscribing this device. */
export type PushState = "unsupported" | "default" | "granted" | "denied";
export type EnableResult = "ok" | "denied" | "unsupported" | "not-configured" | "failed";

export function pushState(): PushState {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushState() === "unsupported") return null;
  const existing = await navigator.serviceWorker.getRegistration("/");
  return (await existing?.pushManager.getSubscription()) ?? null;
}

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function enablePush(lang: Lang): Promise<EnableResult> {
  if (pushState() === "unsupported") return "unsupported";
  try {
    const keyResponse = await fetch("/api/notifications/subscribe");
    const { publicKey } = (await keyResponse.json()) as { publicKey: string | null };
    if (!publicKey) return "not-configured";
    // Must follow the click directly, before other awaits on some browsers.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return permission === "denied" ? "denied" : "failed";
    const reg = await registration();
    await navigator.serviceWorker.ready;
    const subscription = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
    const json = subscription.toJSON();
    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, lang }),
    });
    return response.ok ? "ok" : response.status === 503 ? "not-configured" : "failed";
  } catch {
    return "failed";
  }
}

export async function disablePush(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await fetch("/api/notifications/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => {});
  await subscription.unsubscribe().catch(() => {});
}
