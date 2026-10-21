import "server-only";

import type { Lang } from "@/lib/i18n/dictionary";

/**
 * Address ⇄ coordinates through OpenStreetMap's Nominatim (free, no key). Its usage policy asks
 * for an identifying User-Agent and light use; the app only calls it when a gardener saves an
 * address or taps "use my location", never in a loop.
 */
const NOMINATIM = "https://nominatim.openstreetmap.org";
const USER_AGENT = "ChhadKrishi/1.0 (rooftop gardening assistant, Bangladesh)";
const TIMEOUT_MS = 8000;

interface NominatimAddress {
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state_district?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

async function nominatim<T>(path: string, lang: Lang): Promise<T | null> {
  try {
    const response = await fetch(`${NOMINATIM}${path}`, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": lang === "bn" ? "bn,en" : "en" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** "Area, City" — short enough for the weather chip. */
function placeLabelOf(address: NominatimAddress): string {
  const area = address.suburb ?? address.neighbourhood ?? address.quarter ?? address.city_district ?? address.village ?? address.town;
  const city = address.city ?? address.town ?? address.municipality ?? address.county ?? address.state_district ?? address.state;
  return [...new Set([area, city].filter(Boolean))].join(", ");
}

/** A readable postal-style address, most specific part first, without the country. */
function addressLineOf(address: NominatimAddress): string {
  const parts = [
    address.road,
    address.neighbourhood ?? address.quarter,
    address.suburb ?? address.city_district,
    address.city ?? address.town ?? address.village ?? address.municipality,
    address.state_district ?? address.county,
    address.postcode,
  ];
  return [...new Set(parts.filter(Boolean))].join(", ");
}

export async function reverseGeocode(latitude: number, longitude: number, lang: Lang): Promise<{ address: string; placeLabel: string } | null> {
  const result = await nominatim<{ address?: NominatimAddress; display_name?: string }>(
    `/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2&zoom=17&addressdetails=1`,
    lang,
  );
  if (!result?.address) return null;
  return {
    address: addressLineOf(result.address) || result.display_name || "",
    placeLabel: placeLabelOf(result.address),
  };
}

/**
 * Best match for a typed address, preferring Bangladesh. House and road numbers rarely match, so
 * on a miss the most specific part is dropped and the search repeated (at most three tries,
 * spaced to respect Nominatim's one-request-per-second limit).
 */
export async function geocode(query: string, lang: Lang): Promise<{ latitude: number; longitude: number; placeLabel: string } | null> {
  let parts = query
    .slice(0, 200)
    .split(/[,،\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
  for (let attempt = 0; attempt < 3 && parts.length > 0; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
    const q = encodeURIComponent(parts.join(", "));
    const results = await nominatim<{ lat: string; lon: string; address?: NominatimAddress }[]>(
      `/search?q=${q}&format=jsonv2&limit=1&addressdetails=1&countrycodes=bd`,
      lang,
    );
    const first = results?.[0];
    const latitude = Number(first?.lat);
    const longitude = Number(first?.lon);
    if (first && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude, placeLabel: first.address ? placeLabelOf(first.address) : "" };
    }
    parts = parts.slice(1);
  }
  return null;
}
