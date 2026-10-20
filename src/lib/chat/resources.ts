import type { UIMessage } from "ai";
import type { ProductCategory } from "@/lib/shop/store";

/**
 * Supplementary resources shown below an AI chat answer: how-to videos and ChhadKrishi Shop
 * items. Shared by the server (which writes them as a `data-resources` message part) and the
 * chat UI (which renders them after the answer).
 */
export interface VideoResource {
  /** null for a plain YouTube search link (used when no YouTube API key is configured). */
  videoId: string | null;
  title: string;
  channel: string;
  thumbnail: string | null;
  url: string;
}

export interface ProductResource {
  id: string;
  nameBn: string;
  nameEn: string;
  category: ProductCategory;
  priceBdt: number;
}

/** A reference-book passage the answer drew on (RAG). */
export interface BookSource {
  title: string;
  publisher: string;
  year: number | null;
  section: string;
  url: string;
  /** The [n] the answer uses for this passage. */
  n?: number;
}

export interface ChatResources {
  status: "loading" | "ready";
  videos: VideoResource[];
  products: ProductResource[];
  /** Book passages given to the model, in citation order ([1], [2]…). */
  sources?: BookSource[];
}

export type ChatUIMessage = UIMessage<never, { resources: ChatResources }>;
