import "server-only";

import { generateText } from "ai";
import { activeProvider, getModel, isFixtureMode } from "./config";

/**
 * Two-step photo handling for providers whose vision model writes weak Bangla (Groq: the Qwen
 * vision model invents Bangla words, while gpt-oss writes it well but cannot see). The vision
 * model only describes the photo, in English, which it does reliably; the text model then
 * writes the gardener-facing answer from that description.
 */
export function describesPhotos(): boolean {
  return !isFixtureMode() && activeProvider() === "groq";
}

const FOCUS = {
  plant: `Describe this plant photo for a plant-care expert who cannot see it. Be objective and specific:
- The plant: your best identification (common and Latin name) and how sure you are.
- What is visible: which parts (leaves, stems, fruit, soil), and the photo's angle and distance.
- Every sign of a problem: colours and patterns on leaves (yellowing where, spots with their colour, size and edges, curling, holes, wilting, powder, webs), any insects or eggs and where, and damage to stems or fruit.
- Setting: pot or ground, soil surface, light.
- Photo quality: blur, darkness, glare, or the problem being out of view.
If it is not a plant, say what it is. No advice. At most 200 words.`,
  space: `Describe this photo of a place someone wants to turn into a garden, for a garden designer who cannot see it. Be objective and specific:
- Type of space (rooftop, balcony, terrace, window, yard) and how sure you are.
- Rough size and shape; the floor surface; railings, walls, parapets.
- Light: open sky, shade, sun direction cues.
- What is already there: pots, plants, water tanks, pipes, furniture, drains, clutter.
- Constraints: narrow walkways, weak-looking surfaces, wind exposure.
If it is not a garden-able space, say what it is. No advice. At most 200 words.`,
} as const;

export async function describePhoto(input: {
  image: Uint8Array;
  mediaType: string;
  focus: keyof typeof FOCUS;
  abortSignal?: AbortSignal;
}): Promise<string> {
  const { text } = await generateText({
    model: await getModel("vision"),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: FOCUS[input.focus] },
          { type: "file", mediaType: input.mediaType, data: input.image },
        ],
      },
    ],
    maxOutputTokens: 600,
    abortSignal: input.abortSignal,
  });
  return text.trim();
}

/** How a described photo is given to the text model in place of the image itself. */
export function photoNote(description: string): string {
  return `[The gardener attached a photo. You cannot see it; a vision model described it in English:]\n${description}\n[End of photo description. Base what you say about the photo only on this description, and be honest about uncertainty.]`;
}
