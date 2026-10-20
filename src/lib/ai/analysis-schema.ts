import { z } from "zod";

/** Structured result of a plant photo analysis. Shared by the API (validation) and UI (types). */
export const plantAnalysisSchema = z.object({
  isPlant: z.boolean().describe("Whether the photo actually shows a plant"),
  needsBetterPhoto: z.boolean().describe("True when the photo is too unclear to judge reliably"),
  photoTips: z.array(z.string()).max(3).describe("How to take a better photo, if needed"),
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
        signs: z.array(z.string()).max(4).describe("What in the photo points to this"),
      }),
    )
    .max(3),
  treatment: z
    .array(
      z.object({
        step: z.string().describe("One concrete action with quantity and timing where relevant"),
        organic: z.boolean(),
      }),
    )
    .max(6),
  prevention: z.array(z.string()).max(4),
  urgency: z.enum(["low", "medium", "high"]).describe("How soon the gardener should act"),
});

export type PlantAnalysis = z.infer<typeof plantAnalysisSchema>;

/** Client and server agree on these limits. Images are resized in the browser before upload. */
export const IMAGE_LIMITS = {
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  maxOriginalBytes: 10 * 1024 * 1024,
  // Comfortably below Vercel's 4.5 MB request body limit once resized/compressed.
  maxUploadBytes: 4 * 1024 * 1024,
  maxDimension: 1600,
  maxNoteLength: 500,
};
