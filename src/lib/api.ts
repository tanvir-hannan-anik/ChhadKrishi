import "server-only";

import type { z } from "zod";
import { getServerSession } from "@/lib/auth/session";

/** Shared helpers for JSON route handlers: authentication, body validation and error shape. */
export function apiError(code: string, status: number, details?: Record<string, unknown>) {
  return Response.json({ error: code, ...details }, { status });
}

export async function requireUser(request: Request): Promise<{ userId: string; name: string } | Response> {
  const session = await getServerSession(request.headers);
  if (!session) return apiError("UNAUTHORIZED", 401);
  return { userId: session.user.id, name: session.user.name };
}

export async function parseJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T> | Response> {
  const raw = await request.json().catch(() => undefined);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    // Field paths only — enough for the UI to highlight inputs without echoing values.
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))];
    return apiError("VALIDATION_FAILED", 400, { fields });
  }
  return parsed.data;
}
