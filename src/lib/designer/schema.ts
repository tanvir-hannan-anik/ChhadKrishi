import { z } from "zod";

/**
 * Shared contract for the AI Garden Designer: what the consultation collects, what the model
 * returns each turn, and the final design plan. Used by the API (validation) and the UI (types).
 * Model-facing schemas carry no numeric bounds (some providers reject them); the server clamps
 * values afterwards with `normalizeRequirements`.
 */

export const SPACE_TYPES = ["balcony", "rooftop", "terrace", "windowsill", "yard", "indoor", "other"] as const;
export const SUNLIGHT = ["full", "partial", "shade"] as const;
export const EXPERIENCE = ["beginner", "intermediate", "experienced"] as const;
export const MAINTENANCE = ["low", "medium", "high"] as const;

export const requirementsSchema = z.object({
  spaceType: z.enum(SPACE_TYPES).nullable().describe("Kind of space"),
  areaSqft: z.number().nullable().describe("Usable area in square feet"),
  budgetBdt: z.number().nullable().describe("Total budget in Bangladeshi taka"),
  sunlight: z.enum(SUNLIGHT).nullable().describe("full = 6h+ direct sun, partial = 3-6h, shade = under 3h"),
  preferredPlants: z.array(z.string()).describe("Plant types or specific plants the gardener wants"),
  experience: z.enum(EXPERIENCE).nullable(),
  style: z.string().nullable().describe("Design style, e.g. lush tropical, kitchen garden, minimal modern"),
  potCount: z.number().nullable().describe("How many pots/containers the gardener wants"),
  maintenance: z.enum(MAINTENANCE).nullable().describe("How much care time the gardener can give"),
  notes: z.array(z.string()).describe("Other constraints: water access, weight limits, pets, wind, seating, etc."),
});

export type Requirements = z.infer<typeof requirementsSchema>;
export type RequirementField = Exclude<keyof Requirements, "notes">;

/** Fields that must be known before a design is produced, in the order they are usually asked. */
export const REQUIRED_FIELDS: RequirementField[] = [
  "spaceType",
  "areaSqft",
  "sunlight",
  "budgetBdt",
  "preferredPlants",
  "experience",
  "style",
  "potCount",
  "maintenance",
];

export const EMPTY_REQUIREMENTS: Requirements = {
  spaceType: null,
  areaSqft: null,
  budgetBdt: null,
  sunlight: null,
  preferredPlants: [],
  experience: null,
  style: null,
  potCount: null,
  maintenance: null,
  notes: [],
};

export function missingFields(r: Requirements): RequirementField[] {
  return REQUIRED_FIELDS.filter((field) => {
    const value = r[field];
    return value === null || (Array.isArray(value) && value.length === 0);
  });
}

const clamp = (n: number | null, min: number, max: number) => (n === null || !Number.isFinite(n) ? null : Math.min(max, Math.max(min, Math.round(n))));
const text = (s: string | null, max: number) => (s?.trim() ? s.trim().slice(0, max) : null);
const list = (items: string[], maxItems: number, maxLength: number) =>
  // Drops fragments with no letters at all (e.g. stray JSON punctuation from a model).
  [...new Set(items.map((s) => s.trim().slice(0, maxLength)).filter((s) => /\p{L}/u.test(s)))].slice(0, maxItems);

/** Bounds every value so model or client output can never carry oversized data forward. */
export function normalizeRequirements(r: Requirements): Requirements {
  return {
    spaceType: r.spaceType,
    areaSqft: clamp(r.areaSqft, 1, 20_000),
    budgetBdt: clamp(r.budgetBdt, 0, 10_000_000),
    sunlight: r.sunlight,
    preferredPlants: list(r.preferredPlants, 12, 60),
    experience: r.experience,
    style: text(r.style, 120),
    potCount: clamp(r.potCount, 0, 500),
    maintenance: r.maintenance,
    notes: list(r.notes, 8, 200),
  };
}

/** Known values from `next` win; a null/empty value never erases something already known. */
export function mergeRequirements(base: Requirements, next: Requirements): Requirements {
  const merged = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(next)) {
    if (value === null || (Array.isArray(value) && value.length === 0)) continue;
    merged[key] = value;
  }
  return normalizeRequirements(merged as Requirements);
}

/** The photo, as the model understood it on the first turn. Carried by the client afterwards. */
export const spaceAnalysisSchema = z.object({
  isGardenSpace: z.boolean().describe("False if the photo does not show a balcony, roof, terrace, window or similar space"),
  spaceType: z.enum(SPACE_TYPES).nullable(),
  summary: z.string().describe("Two sentences describing the space as seen in the photo"),
  estimatedAreaSqft: z.number().nullable().describe("Rough visual estimate, or null if impossible"),
  lightGuess: z.enum(SUNLIGHT).nullable().describe("Best guess from shadows/orientation, or null"),
  features: z.array(z.string()).describe("Visible features to preserve: railings, walls, floor, water tank, door, etc."),
  constraints: z.array(z.string()).describe("Likely constraints: narrow width, heat, wind, weight, drainage"),
});

export type SpaceAnalysis = z.infer<typeof spaceAnalysisSchema>;

export function normalizeSpace(space: SpaceAnalysis): SpaceAnalysis {
  return {
    isGardenSpace: space.isGardenSpace,
    spaceType: space.spaceType,
    summary: space.summary.trim().slice(0, 600),
    estimatedAreaSqft: clamp(space.estimatedAreaSqft, 1, 20_000),
    lightGuess: space.lightGuess,
    features: list(space.features, 8, 120),
    constraints: list(space.constraints, 6, 160),
  };
}

export const QUESTION_FIELDS = [...REQUIRED_FIELDS, "notes", "followup"] as const;
export type QuestionField = (typeof QUESTION_FIELDS)[number];

export const questionSchema = z.object({
  field: z.enum(QUESTION_FIELDS).describe("Requirement this question fills; 'followup' for clarifying questions"),
  text: z.string().describe("The question, warm and short"),
  hint: z.string().describe("One short line explaining why it matters, or empty"),
  inputKind: z.enum(["single", "multi", "number", "text"]),
  options: z
    .array(z.object({ label: z.string(), value: z.string().describe("Enum value for enum fields; a number as text for numeric fields") }))
    .describe("3 to 6 tappable answers; empty for free text"),
  allowCustom: z.boolean().describe("Whether the gardener may type their own answer"),
  unit: z.string().describe("Unit for number answers, e.g. sq ft, ৳, pots; else empty"),
});

export type Question = z.infer<typeof questionSchema>;

export const turnSchema = z.object({
  acknowledgement: z.string().describe("One short, friendly sentence reacting to the last answer (or greeting on the first turn)"),
  requirements: requirementsSchema.describe("Everything known so far, updated with the latest answer"),
  done: z.boolean().describe("True only when every requirement is known and no important follow-up remains"),
  question: questionSchema.nullable().describe("The single next question, or null when done"),
});

export const firstTurnSchema = turnSchema.extend({ space: spaceAnalysisSchema });

export type Turn = z.infer<typeof turnSchema>;

/** One answered question, as the client sends it back each turn. */
export const answerSchema = z.object({
  field: z.enum(QUESTION_FIELDS),
  question: z.string().max(400),
  answer: z.string().min(1).max(400),
  /** Structured value when the answer came from options or a number input. */
  value: z.union([z.string().max(120), z.number(), z.array(z.string().max(60)).max(12)]).optional(),
});

export type Answer = z.infer<typeof answerSchema>;

export const DESIGNER_LIMITS = {
  maxTurns: 12,
  maxPromptLength: 1500,
  aspectRatios: ["1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16", "5:4", "4:5"] as const,
};

export type AspectRatio = (typeof DESIGNER_LIMITS.aspectRatios)[number];

/** The supported aspect ratio closest to the photo's own, so the redesign keeps its framing. */
export function nearestAspectRatio(width: number, height: number): AspectRatio {
  const target = width / height;
  let best: AspectRatio = "1:1";
  let bestDiff = Infinity;
  for (const ratio of DESIGNER_LIMITS.aspectRatios) {
    const [w, h] = ratio.split(":").map(Number);
    const diff = Math.abs(Math.log(w / h / target));
    if (diff < bestDiff) {
      best = ratio;
      bestDiff = diff;
    }
  }
  return best;
}

export const designPlanSchema = z.object({
  title: z.string().describe("Short evocative name for the design"),
  concept: z.string().describe("Two or three sentences on the idea and why it suits this space"),
  layout: z
    .array(z.object({ zone: z.string(), placement: z.string().describe("Where in the photo/space"), items: z.string().describe("What goes there") }))
    .describe("2 to 5 zones"),
  plants: z
    .array(
      z.object({
        name: z.string(),
        localName: z.string().describe("Bangla/local name, or empty"),
        why: z.string().describe("One line on why it fits"),
        quantity: z.number(),
        potSize: z.string().describe("e.g. 12-inch pot, half drum, grow bag 15 L"),
        sunlight: z.enum(SUNLIGHT),
        care: z.enum(["easy", "moderate", "demanding"]),
        estCostBdt: z.number().describe("Total for this line in BDT (plants only)"),
      }),
    )
    .describe("4 to 10 plants"),
  materials: z.array(z.object({ item: z.string(), quantity: z.string(), estCostBdt: z.number() })).describe("Pots, soil mix, trellis, drip kit, etc."),
  budget: z.object({
    totalBdt: z.number(),
    breakdown: z.array(z.object({ category: z.string(), amountBdt: z.number() })).describe("2 to 6 categories summing to the total"),
    fitsBudget: z.boolean(),
    note: z.string().describe("How to save or where to spend extra"),
  }),
  steps: z.array(z.object({ title: z.string(), detail: z.string() })).describe("4 to 8 implementation steps in order"),
  maintenance: z.array(z.object({ frequency: z.string(), task: z.string() })).describe("3 to 6 routine items"),
  tips: z.array(z.string()).describe("2 to 5 practical tips for Bangladesh's climate"),
  imagePrompt: z
    .string()
    .describe(
      "ENGLISH instructions for an image editor: which plants, pots, and arrangements to add where in THIS photo, colours and materials. Do not describe changing walls, floor, railings or camera angle.",
    ),
});

export type DesignPlan = z.infer<typeof designPlanSchema>;
