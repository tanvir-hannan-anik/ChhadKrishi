import "server-only";

import { todayLocal } from "@/lib/dates";
import { getLocation } from "@/lib/profile/store";
import { comingDays, conditionOf, pastDays, seasonOf, todayOf, type DailyWeather, type WeatherReport } from "./model";

/**
 * Forecasts from Open-Meteo (free, no API key): the past seven days, today and the coming week
 * in one request. Responses are cached per ~1 km grid cell for 15 minutes, so the navbar chip,
 * the dashboard and the chat share one upstream call.
 */
const ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const CACHE_MS = 15 * 60 * 1000;
const TIMEOUT_MS = 8000;

/** Used until the gardener saves their own location. */
export const DEFAULT_LOCATION = { latitude: 23.8103, longitude: 90.4125 } as const;

interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    wind_speed_10m: number;
  };
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[]; precipitation_probability: (number | null)[]; is_day: number[] };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: (number | null)[];
    precipitation_probability_max: (number | null)[];
    uv_index_max: (number | null)[];
    wind_speed_10m_max: number[];
    sunrise: string[];
    sunset: string[];
  };
}

const globalCache = globalThis as unknown as { chhadkrishiWeather?: Map<string, { at: number; data: Promise<OpenMeteoResponse> }> };
const cache = (globalCache.chhadkrishiWeather ??= new Map());

function fetchForecast(latitude: number, longitude: number): Promise<OpenMeteoResponse> {
  const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m",
    hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,wind_speed_10m_max,sunrise,sunset",
    past_days: "7",
    forecast_days: "8",
    timezone: "Asia/Dhaka",
  });
  const data = fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) }).then(async (response) => {
    if (!response.ok) throw new Error(`Open-Meteo responded ${response.status}`);
    return (await response.json()) as OpenMeteoResponse;
  });
  cache.set(key, { at: Date.now(), data });
  // A failed request must not be served from the cache.
  data.catch(() => cache.delete(key));
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return data;
}

function toReport(raw: OpenMeteoResponse, place: WeatherReport["place"]): WeatherReport {
  const d = raw.daily;
  const daily: DailyWeather[] = d.time.map((date, i) => ({
    date,
    code: d.weather_code[i],
    max: d.temperature_2m_max[i],
    min: d.temperature_2m_min[i],
    rain: d.precipitation_sum[i] ?? 0,
    rainChance: d.precipitation_probability_max[i],
    uvMax: d.uv_index_max[i],
    windMax: d.wind_speed_10m_max[i],
    sunrise: d.sunrise[i],
    sunset: d.sunset[i],
  }));
  // Hourly times are local (Asia/Dhaka) like `current.time`, so they compare as strings.
  const currentHour = raw.current.time.slice(0, 13);
  const start = Math.max(0, raw.hourly.time.findIndex((time) => time.slice(0, 13) === currentHour));
  const hourly = raw.hourly.time.slice(start, start + 24).map((time, i) => ({
    time,
    temperature: raw.hourly.temperature_2m[start + i],
    code: raw.hourly.weather_code[start + i],
    rainChance: raw.hourly.precipitation_probability[start + i],
    isDay: raw.hourly.is_day[start + i] === 1,
  }));
  const c = raw.current;
  return {
    place,
    current: {
      time: c.time,
      temperature: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      windSpeed: c.wind_speed_10m,
      precipitation: c.precipitation,
      cloudCover: c.cloud_cover,
      code: c.weather_code,
      isDay: c.is_day === 1,
    },
    today: todayLocal(),
    daily,
    hourly,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getWeather(latitude: number, longitude: number, place: Omit<WeatherReport["place"], "latitude" | "longitude">): Promise<WeatherReport> {
  return toReport(await fetchForecast(latitude, longitude), { ...place, latitude, longitude });
}

/** Weather at the gardener's saved location, or Dhaka until they set one. */
export async function getWeatherForUser(userId: string): Promise<WeatherReport> {
  const location = await getLocation(userId);
  if (!location) return getWeather(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude, { label: "", isDefault: true });
  return getWeather(location.latitude, location.longitude, { label: location.placeLabel, isDefault: false });
}

const SEASON_NAMES = {
  grishmo: "Grishmo (summer, mid-April to mid-June)",
  borsha: "Borsha (monsoon, mid-June to mid-August)",
  shorot: "Shorot (early autumn, mid-August to mid-October)",
  hemonto: "Hemonto (late autumn, mid-October to mid-December)",
  sheet: "Sheet (winter, mid-December to mid-February)",
  boshonto: "Boshonto (spring, mid-February to mid-April)",
} as const;

const CONDITION_NAMES = {
  clear: "clear",
  partly: "partly cloudy",
  cloudy: "overcast",
  fog: "foggy",
  drizzle: "drizzle",
  rain: "rain",
  storm: "thunderstorm",
} as const;

/**
 * Appended to the chat system prompt: the gardener's local weather, so answers about watering,
 * spraying, sowing or protecting plants can take it into account.
 */
export function weatherContextNote(report: WeatherReport): string {
  const c = report.current;
  const today = todayOf(report);
  const days = comingDays(report)
    .slice(1, 4)
    .map((day) => `${day.date}: ${CONDITION_NAMES[conditionOf(day.code)]}, ${Math.round(day.min)}–${Math.round(day.max)}°C, rain ${day.rain.toFixed(1)} mm${day.rainChance != null ? ` (${day.rainChance}% chance)` : ""}`)
    .join("; ");
  const lastWeekRain = pastDays(report).reduce((sum, day) => sum + day.rain, 0);
  const place = report.place.isDefault ? "Dhaka (default — the gardener has not set a location)" : report.place.label || "the gardener's saved location";
  return `

Live local weather for ${place} (from Open-Meteo, Bangladesh time ${c.time.replace("T", " ")}). Season: ${SEASON_NAMES[seasonOf(report.today)]}.
- Now: ${CONDITION_NAMES[conditionOf(c.code)]}, ${Math.round(c.temperature)}°C (feels like ${Math.round(c.feelsLike)}°C), humidity ${c.humidity}%, wind ${Math.round(c.windSpeed)} km/h.
- Today: ${today ? `${Math.round(today.min)}–${Math.round(today.max)}°C, rain ${today.rain.toFixed(1)} mm, UV ${today.uvMax ?? "n/a"}` : "n/a"}.
- Next days: ${days || "n/a"}.
- Rain over the past 7 days: ${lastWeekRain.toFixed(1)} mm.
Use this weather only when it matters to the question (watering, spraying, sowing, transplanting, fertilising, harvesting, protecting plants, or when the gardener asks about the weather). Then say briefly how it changes the advice (e.g. skip watering before heavy rain, spray when no rain is expected, shade plants in a heatwave). Never invent weather beyond these numbers.`;
}
