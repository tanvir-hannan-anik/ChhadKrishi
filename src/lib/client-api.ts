"use client";

import { openAuthModal } from "@/lib/auth/flow";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string; fields?: string[] };

/**
 * JSON fetch for the app's own API. On 401 (session expired) it opens the sign-in modal and,
 * after a successful login, repeats the same request through `onRetry` when provided.
 */
export async function apiFetch<T>(url: string, init: RequestInit & { json?: unknown } = {}, onRetry?: () => void): Promise<ApiResult<T>> {
  const { json, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    return { ok: false, status: 0, error: "NETWORK" };
  }
  if (response.status === 204) return { ok: true, data: undefined as T };
  const data = (await response.json().catch(() => null)) as (T & { error?: string; fields?: string[] }) | null;
  if (response.ok) return { ok: true, data: data as T };
  if (response.status === 401) openAuthModal({ expired: true, pending: onRetry ? { kind: "retry", run: onRetry } : { kind: "refresh", reason: "protected" } });
  return { ok: false, status: response.status, error: data?.error ?? "GENERIC", fields: data?.fields };
}
