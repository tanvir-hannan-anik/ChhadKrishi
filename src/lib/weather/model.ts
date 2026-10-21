/**
 * Weather shapes and pure helpers shared by the server (alerts, chat context) and the UI (scene,
 * tips). Forecast data comes from Open-Meteo; codes are WMO weather interpretation codes.
 */
export type Condition = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "storm";

/** Bangladesh's six seasons (ষড়ঋতু), by the revised Bangla calendar (1 Boishakh = 14 April). */
export type Season = "grishmo" | "borsha" | "shorot" | "hemonto" | "sheet" | "boshonto";

export interface CurrentWeather {
  time: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  cloudCover: number;
  code: number;
  isDay: boolean;
}

export interface DailyWeather {
  date: string;
  code: number;
  max: number;
  min: number;
  /** Total precipitation in mm. */
  rain: number;
  /** Highest hourly chance of rain, 0–100 (null when the model has none). */
  rainChance: number | null;
  uvMax: number | null;
  windMax: number;
  sunrise: string;
  sunset: string;
}

export interface HourlyWeather {
  time: string;
  temperature: number;
  code: number;
  rainChance: number | null;
  isDay: boolean;
}

export interface WeatherReport {
  place: { label: string; latitude: number; longitude: number; isDefault: boolean };
  current: CurrentWeather;
  /** Today's date in Bangladesh (YYYY-MM-DD). */
  today: string;
  /** The past seven days, today, then the coming days — in date order. */
  daily: DailyWeather[];
  /** The next 24 hours. */
  hourly: HourlyWeather[];
  fetchedAt: string;
}

export function conditionOf(code: number): Condition {
  if (code <= 1) return "clear";
  if (code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code >= 95) return "storm";
  // Snow codes (71–77, 85–86) do not occur in Bangladesh; treat them as overcast.
  return "cloudy";
}

export function seasonOf(isoDate: string): Season {
  const [, month, day] = isoDate.split("-").map(Number);
  const md = month * 100 + day;
  if (md >= 414 && md <= 614) return "grishmo";
  if (md >= 615 && md <= 815) return "borsha";
  if (md >= 816 && md <= 1015) return "shorot";
  if (md >= 1016 && md <= 1215) return "hemonto";
  if (md >= 1216 || md <= 213) return "sheet";
  return "boshonto";
}

export function todayOf(report: WeatherReport): DailyWeather | undefined {
  return report.daily.find((day) => day.date === report.today);
}

export function pastDays(report: WeatherReport): DailyWeather[] {
  return report.daily.filter((day) => day.date < report.today);
}

export function comingDays(report: WeatherReport): DailyWeather[] {
  return report.daily.filter((day) => day.date >= report.today);
}

export type TipKey = "storm" | "heavyRain" | "rainSoon" | "heat" | "humid" | "windy" | "dry" | "cold" | "uv";

export interface WeatherTip {
  key: TipKey;
  /** Number shown in the tip (mm, °C, km/h or UV index), when it has one. */
  value?: number;
}

/** Practical garden tips for the next couple of days, most urgent first (at most four). */
export function weatherTips(report: WeatherReport): WeatherTip[] {
  const next = comingDays(report).slice(0, 2);
  const today = todayOf(report);
  const tips: WeatherTip[] = [];
  if (next.some((day) => conditionOf(day.code) === "storm")) tips.push({ key: "storm" });
  const heavy = next.find((day) => day.rain >= 20);
  if (heavy) tips.push({ key: "heavyRain", value: Math.round(heavy.rain) });
  else if (next.some((day) => (day.rainChance ?? 0) >= 60 || day.rain >= 5)) tips.push({ key: "rainSoon" });
  if (today && today.max >= 34) tips.push({ key: "heat", value: Math.round(today.max) });
  if (report.current.humidity >= 85 && report.current.temperature >= 24) tips.push({ key: "humid", value: Math.round(report.current.humidity) });
  const windy = next.find((day) => day.windMax >= 35);
  if (windy) tips.push({ key: "windy", value: Math.round(windy.windMax) });
  const lastWeekRain = pastDays(report).reduce((sum, day) => sum + day.rain, 0);
  if (lastWeekRain < 2 && !tips.some((tip) => tip.key === "rainSoon" || tip.key === "heavyRain")) tips.push({ key: "dry" });
  if (today && today.min <= 12) tips.push({ key: "cold", value: Math.round(today.min) });
  if (today?.uvMax != null && today.uvMax >= 9) tips.push({ key: "uv", value: Math.round(today.uvMax) });
  return tips.slice(0, 4);
}

export type AlertKind = "storm" | "heavyRain" | "heat" | "wind" | "cold";

/** The most severe condition worth a notification today or tomorrow, if any. */
export function weatherAlert(report: WeatherReport): { kind: AlertKind; value: number; date: string } | null {
  const next = comingDays(report).slice(0, 2);
  const storm = next.find((day) => conditionOf(day.code) === "storm");
  if (storm) return { kind: "storm", value: Math.round(storm.rain), date: storm.date };
  const heavy = next.find((day) => day.rain >= 20);
  if (heavy) return { kind: "heavyRain", value: Math.round(heavy.rain), date: heavy.date };
  const hot = next.find((day) => day.max >= 36);
  if (hot) return { kind: "heat", value: Math.round(hot.max), date: hot.date };
  const windy = next.find((day) => day.windMax >= 40);
  if (windy) return { kind: "wind", value: Math.round(windy.windMax), date: windy.date };
  const cold = next.find((day) => day.min <= 10);
  if (cold) return { kind: "cold", value: Math.round(cold.min), date: cold.date };
  return null;
}
