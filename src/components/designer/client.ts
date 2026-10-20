"use client";

import { aiErrorCodeOf } from "@/lib/ai/client-errors";
import type { AiErrorCode } from "@/lib/ai/errors";
import { formatNumber, type Lang } from "@/lib/i18n/dictionary";

export type CallResult<T> = { ok: true; data: T } | { ok: false; code: AiErrorCode; aborted?: boolean };

/** POSTs to a designer endpoint and maps every failure to one of our stable AI error codes. */
export async function postDesigner<T>(url: string, body: FormData | object, signal: AbortSignal, as: "json" | "blob" = "json"): Promise<CallResult<T>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      signal,
      ...(body instanceof FormData ? { body } : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
    });
    if (response.ok) return { ok: true, data: (as === "blob" ? await response.blob() : await response.json()) as T };
    const data = await response.json().catch(() => ({}));
    return { ok: false, code: aiErrorCodeOf({ statusCode: response.status, responseBody: JSON.stringify(data) }) };
  } catch (error) {
    if (signal.aborted) return { ok: false, code: "AI_FAILED", aborted: true };
    return { ok: false, code: aiErrorCodeOf(error) };
  }
}

export function formatTaka(amount: number, lang: Lang): string {
  return `৳${formatNumber(Math.round(amount), lang)}`;
}

/** Reads the prepared photo's dimensions so the redesign can keep the same framing. */
export async function imageSize(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}
