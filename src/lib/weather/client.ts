"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { WeatherReport } from "./model";

/**
 * One shared copy of the gardener's weather for the navbar chip, the dashboard card and the
 * weather page: fetched once, refreshed when older than ten minutes (and when the tab regains
 * focus), and re-fetched right after the profile location changes.
 */
type Status = "idle" | "loading" | "ready" | "error";
interface WeatherState {
  status: Status;
  report: WeatherReport | null;
}

const STALE_MS = 10 * 60 * 1000;
const SERVER_STATE: WeatherState = { status: "idle", report: null };

let state: WeatherState = SERVER_STATE;
let loadedAt = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: WeatherState) {
  state = next;
  listeners.forEach((notify) => notify());
}

function load(force = false): Promise<void> {
  if (inflight) return inflight;
  if (!force && state.report && Date.now() - loadedAt < STALE_MS) return Promise.resolve();
  if (!state.report) setState({ status: "loading", report: null });
  inflight = fetch("/api/weather")
    .then(async (response) => {
      if (!response.ok) throw new Error(String(response.status));
      const { weather } = (await response.json()) as { weather: WeatherReport };
      loadedAt = Date.now();
      setState({ status: "ready", report: weather });
    })
    // A background widget never opens the sign-in modal; keep showing the last report if any.
    .catch(() => setState(state.report ? { ...state, status: "ready" } : { status: "error", report: null }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  const onFocus = () => void load();
  window.addEventListener("focus", onFocus);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("focus", onFocus);
  };
}

export function useWeather(enabled = true) {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
  useEffect(() => {
    if (enabled) void load();
  }, [enabled]);
  return { ...current, retry: () => void load(true) };
}

/** Call after the saved location changes. */
export function refreshWeather() {
  loadedAt = 0;
  void load(true);
}

/** Forget the report (e.g. on sign-out), so another account never sees it. */
export function clearWeather() {
  loadedAt = 0;
  setState(SERVER_STATE);
}
