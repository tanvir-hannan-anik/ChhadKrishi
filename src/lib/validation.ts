import { z } from "zod";

/** Converts Bangla digits (০-৯) to ASCII so numbers typed on a Bangla keyboard validate. */
export function normalizeDigits(value: string): string {
  return value.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
}

/** Bangladeshi mobile numbers: 01[3-9]XXXXXXXX, optionally prefixed with +88 / 88. Returns 01XXXXXXXXX or null. */
export function normalizeBdPhone(value: string): string | null {
  const digits = normalizeDigits(value).replace(/[\s-]/g, "");
  const match = /^(?:\+?88)?(01[3-9]\d{8})$/.exec(digits);
  return match ? match[1] : null;
}

const trimmed = (max: number) => z.string().trim().max(max);

export const plantInput = z.object({
  name: trimmed(60).min(1),
  potCount: z.number().int().min(1).max(500),
  notes: trimmed(200).default(""),
});

export const careKind = z.enum(["water", "fertilize", "prune", "pest", "other"]);
export const timeOfDay = z.enum(["morning", "afternoon", "evening"]);

export const careTaskInput = z.object({
  plantId: z.string().max(64).nullable(),
  title: trimmed(80).min(1),
  kind: careKind,
  everyDays: z.number().int().min(1).max(60),
  timeOfDay,
});

export const checkoutInput = z.object({
  customerName: trimmed(80).min(2),
  phone: z.string().transform((v, ctx) => {
    const phone = normalizeBdPhone(v);
    if (!phone) ctx.addIssue({ code: "custom", message: "invalid phone" });
    return phone ?? "";
  }),
  address: trimmed(300).min(8),
  note: trimmed(300).default(""),
});
