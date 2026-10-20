import "server-only";

/**
 * Per-user sliding-window limiter for the AI endpoints, protecting the AI budget from abuse.
 * In-memory: limits apply per server instance. For multi-instance production, back this with
 * a shared store (e.g. Upstash Redis) behind the same function signature.
 */
const RULES = {
  chat: { windowMs: 60_000, max: 20 },
  analyze: { windowMs: 60_000, max: 6 },
  suggest: { windowMs: 60_000, max: 3 },
  resources: { windowMs: 60_000, max: 10 },
  designerTurn: { windowMs: 60_000, max: 20 },
  designerPlan: { windowMs: 60_000, max: 3 },
  // Image generation is the costliest call in the app.
  designerRender: { windowMs: 10 * 60_000, max: 5 },
} as const;

const globalForLimits = globalThis as unknown as { chhadkrishiAiHits?: Map<string, number[]> };
const hits = (globalForLimits.chhadkrishiAiHits ??= new Map());

export function takeAiQuota(kind: keyof typeof RULES, userId: string): boolean {
  const { windowMs, max } = RULES[kind];
  const key = `${kind}:${userId}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t: number) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
