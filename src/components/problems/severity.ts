import type { Severity } from "@/lib/problems/data";

export const SEVERITY_TONE: Record<Severity, string> = {
  low: "bg-sprout/70 text-forest",
  medium: "bg-[#f4e3b5] text-[#7a5a12]",
  high: "bg-clay/15 text-clay",
};
