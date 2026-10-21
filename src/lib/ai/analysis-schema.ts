import { z } from "zod";

/**
 * Structured result of a plant photo analysis. Shared by the API (validation) and UI (types).
 * List lengths are stated in the descriptions and enforced by limitAnalysis: providers that
 * validate output against the schema (Groq) reject the whole analysis over one extra item.
 */
export const plantAnalysisSchema = z.object({
  isPlant: z.boolean().describe("Whether the photo actually shows a plant"),
  needsBetterPhoto: z.boolean().describe("True when the photo is too unclear to judge reliably"),
  photoTips: z.array(z.string()).describe("Up to 3 tips for a better photo, if needed"),
  plant: z.object({
    commonName: z.string().describe("Common name, or empty if unknown"),
    scientificName: z.string().describe("Latin binomial, or empty if unknown"),
  }),
  healthStatus: z.enum(["healthy", "issues", "unclear"]),
  confidence: z.enum(["low", "medium", "high"]).describe("Honest certainty of the identification and diagnosis"),
  summary: z.string().describe("Two or three sentence overview for the gardener"),
  issues: z
    .array(
      z.object({
        name: z.string().describe("Disease, pest or deficiency name"),
        likelihood: z.enum(["low", "medium", "high"]),
        signs: z.array(z.string()).describe("Up to 4 signs in the photo that point to this"),
      }),
    )
    .describe("At most 3 likely issues, most likely first"),
  treatment: z
    .array(
      z.object({
        step: z.string().describe("One concrete action with quantity and timing where relevant"),
        organic: z.boolean(),
      }),
    )
    .describe("At most 6 steps, most urgent first"),
  prevention: z.array(z.string()).describe("Up to 4 prevention tips"),
  urgency: z.enum(["low", "medium", "high"]).describe("How soon the gardener should act"),
});

export type PlantAnalysis = z.infer<typeof plantAnalysisSchema>;

/** Applies the list limits the schema only describes. */
export function limitAnalysis(a: PlantAnalysis): PlantAnalysis {
  return {
    ...a,
    photoTips: a.photoTips.slice(0, 3),
    issues: a.issues.slice(0, 3).map((issue) => ({ ...issue, signs: issue.signs.slice(0, 4) })),
    treatment: a.treatment.slice(0, 6),
    prevention: a.prevention.slice(0, 4),
  };
}

/**
 * Evidence from the Agriculture Encyclopedia for a photo (rag-service /v1/diagnose), shared by the
 * analyze API and UI. `status` "abstained" means the book has no matching evidence: the UI says so
 * rather than showing unverified treatments.
 */
export interface AnalysisKnowledge {
  status: "answered" | "partial" | "abstained" | "needs_clarification";
  answer: string;
  candidates: { name: string; detail: string; likelihood: "low" | "medium" | "high" | ""; citations: number[] }[];
  citations: { n: number; article: string; section: string; pageRef: string; quote: string; url: string }[];
  conflicts: { description: string; citations: number[] }[];
  clarifyingQuestions: string[];
  uncertainty: string;
}

/** Client and server agree on these limits. Images are resized in the browser before upload. */
export const IMAGE_LIMITS = {
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  maxOriginalBytes: 10 * 1024 * 1024,
  // Comfortably below Vercel's 4.5 MB request body limit once resized/compressed.
  maxUploadBytes: 4 * 1024 * 1024,
  maxDimension: 1600,
  maxNoteLength: 500,
};
