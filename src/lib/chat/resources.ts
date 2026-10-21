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
  image: string | null;
}

/** A reference-book passage the answer drew on (RAG). */
export interface BookSource {
  title: string;
  publisher: string;
  year: number | null;
  section: string;
  /** Link to the source; empty when there is none (e.g. a book without a DOI). */
  url: string;
  /** Original page reference, e.g. "Vol. 1, p. 37 (PDF p. 66)". */
  page?: string;
  /** The verified sentence from that page the answer relies on. */
  quote?: string;
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
