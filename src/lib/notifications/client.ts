"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { AppNotification } from "./store";

/**
 * The gardener's notification list, shared by every bell on the page. Loaded once, then
 * refreshed every five minutes and whenever the tab regains focus.
 */
interface NotificationState {
  items: AppNotification[];
  unread: number;
  loaded: boolean;
}

const REFRESH_MS = 5 * 60 * 1000;
const EMPTY: NotificationState = { items: [], unread: 0, loaded: false };

let state: NotificationState = EMPTY;
let loadedAt = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: NotificationState) {
  state = next;
  listeners.forEach((notify) => notify());
}

export function loadNotifications(force = false): Promise<void> {
  if (inflight) return inflight;
  if (!force && state.loaded && Date.now() - loadedAt < REFRESH_MS) return Promise.resolve();
  inflight = fetch("/api/notifications")
    .then(async (response) => {
      if (!response.ok) return;
      const data = (await response.json()) as { items: AppNotification[]; unread: number };
      loadedAt = Date.now();
      setState({ ...data, loaded: true });
    })
    .catch(() => {})
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function markNotificationsRead(ids: string[] | "all") {
  const unreadIds = new Set(state.items.filter((item) => !item.read && (ids === "all" || ids.includes(item.id))).map((item) => item.id));
  if (unreadIds.size === 0) return;
  setState({
    ...state,
    items: state.items.map((item) => (unreadIds.has(item.id) ? { ...item, read: true } : item)),
    unread: Math.max(0, state.unread - unreadIds.size),
  });
  await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }).catch(() => {});
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  const onFocus = () => void loadNotifications();
  window.addEventListener("focus", onFocus);
  const timer = window.setInterval(() => void loadNotifications(), REFRESH_MS);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("focus", onFocus);
    window.clearInterval(timer);
  };
}

export function useNotifications() {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY,
  );
  useEffect(() => {
    void loadNotifications();
  }, []);
  return current;
}

export function clearNotifications() {
  loadedAt = 0;
  setState(EMPTY);
}
