import "server-only";

import { CONFIDENT_DETECTION, type VisionReport } from "./vision";

export type { VisionReport } from "./vision";

/**
 * Client for the self-hosted ML service (ml-service/): Microsoft neural text-to-speech and
 * OpenCV + YOLO photo measurements. The service is called only from
 * the server, with a shared token; the browser never sees its URL or token.
 *
 *   ML_SERVICE_URL     e.g. https://chhadkrishi-ml.onrender.com
 *   ML_SERVICE_TOKEN   the same long random string the service is started with
 */
export function isMlConfigured(): boolean {
  return Boolean(process.env.ML_SERVICE_URL && process.env.ML_SERVICE_TOKEN);
}

export class MlServiceError extends Error {
  constructor(readonly status: number) {
    super(`ML service responded ${status}`);
    this.name = "MlServiceError";
  }
}

/** Calls the service with a deadline; a free-tier host waking from sleep can take ~1 min. */
export async function mlFetch(path: string, init: RequestInit & { timeoutMs?: number; signal?: AbortSignal }): Promise<Response> {
  const base = process.env.ML_SERVICE_URL?.replace(/\/+$/, "");
  const token = process.env.ML_SERVICE_TOKEN;
  if (!base || !token) throw new MlServiceError(503);

  const { timeoutMs = 90_000, signal, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Deadline exceeded", "TimeoutError")), timeoutMs);
  const forward = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", forward, { once: true });
  try {
    const response = await fetch(`${base}${path}`, {
      ...rest,
      headers: { ...rest.headers, Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new MlServiceError(response.status);
    return response;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forward);
  }
}


export async function analyzeWithVision(image: Uint8Array, mediaType: string, signal?: AbortSignal): Promise<VisionReport> {
  const form = new FormData();
  form.append("image", new Blob([image as BlobPart], { type: mediaType }), "photo");
  const response = await mlFetch("/vision/analyze", { method: "POST", body: form, signal, timeoutMs: 25_000 });
  return (await response.json()) as VisionReport;
}


/**
 * Turns the measurements into evidence for the vision model. They support, but never replace,
 * what the model sees: species labels come from a 46-crop detector and colour shares are pixel
 * counts, not a diagnosis.
 */
export function visionEvidenceNote(report: VisionReport): string {
  const lines: string[] = [];
  if (report.quality.issues.length) lines.push(`Photo quality checks flagged: ${report.quality.issues.join(", ")} (sharpness ${report.quality.sharpness}, brightness ${report.quality.brightness}/255).`);
  // Only the leaf count: the detector's crop labels are often wrong on real photos (it called
  // an ornamental shrub "gram" at 86%), and a confident wrong species would mislead the model.
  const confident = report.detections.filter((d) => d.confidence >= CONFIDENT_DETECTION);
  if (confident.length) lines.push(`A leaf detector located ${confident.length} leaf region(s).`);
  const c = report.colour;
  if (c) {
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const where = c.scope === "leaves" ? "inside the detected leaves" : "across the whole photo (may include soil or pots)";
    lines.push(`Measured foliage colour ${where}: green ${pct(c.green)}, yellow ${pct(c.yellow)}, brown ${pct(c.brown)}, pale/white ${pct(c.pale)}; ${c.spots} small dark/brown spot(s) on green tissue.`);
  }
  if (!lines.length) return "";
  return `\n\nComputer-vision measurements of this photo (OpenCV + YOLO). Use them to check your reading of the image and to calibrate confidence; do not quote the numbers unless helpful:\n- ${lines.join("\n- ")}`;
}
