import "server-only";

import type { Lang } from "@/lib/i18n/dictionary";
import type { VideoResource } from "@/lib/chat/resources";

/**
 * YouTube video search for chat resources. With YOUTUBE_API_KEY (YouTube Data API v3, server
 * only) it returns real videos with thumbnails; without it, a single search link so the
 * gardener can still find videos, and nothing is invented.
 */
const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const TIMEOUT_MS = 6000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_LIMIT = 200;
const cache = new Map<string, { at: number; videos: VideoResource[] }>();

const ENTITIES: Record<string, string> = { "&amp;": "&", "&quot;": '"', "&#39;": "'", "&lt;": "<", "&gt;": ">" };
const decode = (text: string) => text.replace(/&(amp|quot|#39|lt|gt);/g, (entity) => ENTITIES[entity] ?? entity);

export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

interface SearchItem {
  id?: { videoId?: string };
  snippet?: { title?: string; channelTitle?: string };
}

export async function searchVideos(query: string, lang: Lang, limit = 4): Promise<VideoResource[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [{ videoId: null, title: query, channel: "YouTube", thumbnail: null, url: youtubeSearchUrl(query) }];

  const cacheKey = `${lang}:${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.videos;

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    q: query,
    maxResults: String(limit),
    safeSearch: "strict",
    regionCode: "BD",
    relevanceLanguage: lang,
    videoEmbeddable: "true",
    key,
  });
  // A plain timer: AbortSignal.timeout combined via AbortSignal.any can be collected before firing.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${SEARCH_URL}?${params}`, { signal: controller.signal });
    if (!response.ok) return [];
    const { items = [] } = (await response.json()) as { items?: SearchItem[] };
    const videos = items.flatMap((item): VideoResource[] => {
      const videoId = item.id?.videoId;
      const title = item.snippet?.title;
      if (!videoId || !/^[\w-]{11}$/.test(videoId) || !title) return [];
      return [
        {
          videoId,
          title: decode(title),
          channel: decode(item.snippet?.channelTitle ?? ""),
          // Built from the id, so the image always comes from YouTube's own thumbnail host.
          thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${videoId}`,
        },
      ];
    });
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
    cache.set(cacheKey, { at: Date.now(), videos });
    return videos;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
