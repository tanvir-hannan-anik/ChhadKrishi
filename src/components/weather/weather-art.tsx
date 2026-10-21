import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Moon, Sun, type LucideIcon } from "lucide-react";
import type { Condition, Season } from "@/lib/weather/model";

/**
 * Animated weather scenes, drawn with CSS only (keyframes in globals.css): the sky follows the
 * current condition and time of day; a gentle layer for the Bangla season sits on top — spring
 * petals, monsoon ripples, kash flowers, falling autumn leaves, winter mist, summer heat haze.
 * Positions are fixed (never random) so server and client render the same markup.
 */
const SKY: Record<Condition, { day: string; night: string }> = {
  clear: { day: "from-sky-400 via-sky-300 to-amber-100", night: "from-indigo-950 via-indigo-900 to-slate-800" },
  partly: { day: "from-sky-400 via-sky-300 to-slate-100", night: "from-indigo-950 via-slate-800 to-slate-700" },
  cloudy: { day: "from-slate-400 via-slate-300 to-slate-200", night: "from-slate-900 via-slate-800 to-slate-700" },
  fog: { day: "from-slate-300 via-slate-200 to-stone-100", night: "from-slate-800 via-slate-700 to-slate-600" },
  drizzle: { day: "from-slate-500 via-slate-400 to-sky-200", night: "from-slate-900 via-slate-800 to-slate-700" },
  rain: { day: "from-slate-600 via-slate-500 to-slate-300", night: "from-slate-950 via-slate-900 to-slate-800" },
  storm: { day: "from-slate-800 via-indigo-900 to-slate-600", night: "from-slate-950 via-indigo-950 to-slate-900" },
};

/** Whether text on the scene should be light (dark sky) or dark (bright sky). */
export function sceneIsDark(condition: Condition, isDay: boolean) {
  return !isDay || condition === "rain" || condition === "storm" || condition === "drizzle";
}

export function WeatherScene({ condition, isDay, season, className = "" }: { condition: Condition; isDay: boolean; season: Season; className?: string }) {
  const wet = condition === "rain" || condition === "storm" || condition === "drizzle";
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-br [container-type:size] ${isDay ? SKY[condition].day : SKY[condition].night} ${className}`}>
      {!isDay && <Stars dim={condition !== "clear" && condition !== "partly"} />}
      {(condition === "clear" || condition === "partly") && (isDay ? <SunDisc /> : <MoonDisc />)}
      {condition !== "clear" && <Clouds dense={condition !== "partly"} dark={wet || !isDay} />}
      {wet && <Rain drops={condition === "drizzle" ? 14 : 34} slow={condition === "drizzle"} />}
      {condition === "storm" && <div className="absolute inset-0 animate-wx-flash bg-white/70 mix-blend-overlay" />}
      {condition === "fog" && <Fog />}
      <SeasonLayer season={season} wet={wet} />
    </div>
  );
}

function SunDisc() {
  return (
    <div className="absolute -top-8 right-4 h-36 w-36 sm:right-10">
      <div className="absolute inset-0 animate-wx-pulse rounded-full bg-amber-200/60 blur-xl" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 animate-wx-spin text-amber-300/80">
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x="48.5" y="4" width="3" height="14" rx="1.5" fill="currentColor" transform={`rotate(${i * 30} 50 50)`} />
        ))}
      </svg>
      <div className="absolute inset-[26%] rounded-full bg-gradient-to-br from-amber-200 to-amber-400 shadow-[0_0_40px_rgb(251_191_36/0.7)]" />
    </div>
  );
}

function MoonDisc() {
  return (
    <div className="absolute top-4 right-8 h-16 w-16 sm:right-14">
      <div className="absolute inset-0 animate-wx-pulse rounded-full bg-slate-100/30 blur-lg" />
      <div className="absolute inset-2 rounded-full bg-slate-100 shadow-[inset_-8px_-4px_0_rgb(203_213_225)]" />
    </div>
  );
}

const STARS = [
  [8, 12],
  [18, 30],
  [27, 8],
  [36, 22],
  [44, 6],
  [52, 34],
  [61, 14],
  [70, 26],
  [79, 9],
  [88, 30],
  [14, 44],
  [40, 48],
  [66, 42],
  [93, 50],
] as const;

function Stars({ dim }: { dim: boolean }) {
  return (
    <div className={dim ? "opacity-40" : ""}>
      {STARS.map(([left, top], i) => (
        <span key={i} className="absolute h-1 w-1 animate-wx-twinkle rounded-full bg-white" style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${(i % 5) * 0.6}s` }} />
      ))}
    </div>
  );
}

function CloudShape({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 120 60" className={className} style={style}>
      <path d="M28 52h66a20 20 0 0 0 2-40 26 26 0 0 0-49-6A18 18 0 0 0 28 52Z" fill="currentColor" />
    </svg>
  );
}

function Clouds({ dense, dark }: { dense: boolean; dark: boolean }) {
  const tone = dark ? "text-slate-300/70" : "text-white/90";
  return (
    <>
      <CloudShape className={`absolute top-3 -left-6 w-44 animate-wx-drift ${tone}`} />
      <CloudShape className={`absolute top-10 right-0 w-36 animate-wx-drift ${tone}`} style={{ animationDelay: "-7s", animationDuration: "22s" }} />
      {dense && (
        <>
          <CloudShape className={`absolute -top-4 left-1/3 w-52 animate-wx-drift ${dark ? "text-slate-400/70" : "text-white/80"}`} style={{ animationDelay: "-12s" }} />
          <CloudShape className={`absolute top-16 left-1/4 w-32 animate-wx-drift ${tone}`} style={{ animationDelay: "-3s", animationDuration: "26s" }} />
        </>
      )}
    </>
  );
}

function Rain({ drops, slow }: { drops: number; slow: boolean }) {
  return (
    <div className="absolute inset-0">
      {Array.from({ length: drops }, (_, i) => (
        <span
          key={i}
          className="absolute top-0 w-px animate-wx-fall rounded-full bg-gradient-to-b from-transparent to-sky-100/90"
          style={{
            left: `${(i * 37) % 100}%`,
            height: slow ? "10%" : "16%",
            animationDelay: `${((i * 13) % 20) / 20}s`,
            animationDuration: `${slow ? 1.6 : 0.7 + ((i * 7) % 5) / 10}s`,
          }}
        />
      ))}
      {/* Splash ripples along the ground. */}
      {[12, 34, 58, 81].map((left, i) => (
        <span key={left} className="absolute bottom-2 h-2 w-8 animate-wx-ripple rounded-[50%] border border-sky-100/60" style={{ left: `${left}%`, animationDelay: `${i * 0.6}s` }} />
      ))}
    </div>
  );
}

function Fog() {
  return (
    <>
      {[28, 50, 70].map((top, i) => (
        <div key={top} className="absolute -inset-x-1/4 h-10 animate-wx-fog rounded-full bg-white/50 blur-md" style={{ top: `${top}%`, animationDelay: `${i * -4}s` }} />
      ))}
    </>
  );
}

const FLUTTER = [6, 22, 41, 58, 73, 90];

function SeasonLayer({ season, wet }: { season: Season; wet: boolean }) {
  switch (season) {
    case "boshonto":
      // Spring: palash/shimul petals drifting down.
      return (
        <>
          {FLUTTER.map((left, i) => (
            <span
              key={left}
              className="absolute -top-3 h-2.5 w-2 animate-wx-flutter rounded-[60%_10%] bg-rose-400/80"
              style={{ left: `${left}%`, animationDelay: `${i * -1.6}s`, animationDuration: `${8 + (i % 3)}s` }}
            />
          ))}
        </>
      );
    case "hemonto":
      // Late autumn: golden paddy leaves falling.
      return (
        <>
          {FLUTTER.map((left, i) => (
            <span
              key={left}
              className="absolute -top-3 h-3 w-1.5 animate-wx-flutter rounded-full bg-amber-500/80"
              style={{ left: `${left}%`, animationDelay: `${i * -1.4}s`, animationDuration: `${9 + (i % 4)}s` }}
            />
          ))}
        </>
      );
    case "shorot":
      // Early autumn: kash flowers swaying along the bottom.
      return (
        <div className="absolute inset-x-0 bottom-0 flex h-16 items-end justify-around px-2">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span key={i} className="relative block h-14 w-px origin-bottom animate-wx-sway bg-lime-100/70" style={{ animationDelay: `${i * -0.5}s`, height: `${40 + (i % 3) * 14}px` }}>
              <span className="absolute -top-3 -left-1.5 h-5 w-3 rounded-full bg-white/90 blur-[1px]" />
            </span>
          ))}
        </div>
      );
    case "sheet":
      // Winter: low morning mist.
      return <div className="absolute inset-x-0 bottom-0 h-1/3 animate-wx-fog bg-gradient-to-t from-white/60 to-transparent" />;
    case "grishmo":
      // Summer: heat shimmer above the roof (not while it rains).
      return wet ? null : (
        <div className="absolute inset-x-0 bottom-1 flex justify-around">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="block h-6 w-10 animate-wx-heat rounded-full border-t-2 border-amber-50/70" style={{ animationDelay: `${i * -0.7}s` }} />
          ))}
        </div>
      );
    case "borsha":
      // Monsoon: puddle ripples even between showers.
      return wet ? null : (
        <>
          {[18, 46, 74].map((left, i) => (
            <span key={left} className="absolute bottom-2 h-2 w-10 animate-wx-ripple rounded-[50%] border border-sky-100/70" style={{ left: `${left}%`, animationDelay: `${i * 0.8}s` }} />
          ))}
        </>
      );
  }
}

const GLYPHS: Record<Condition, LucideIcon> = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  storm: CloudLightning,
};

/** A small animated weather icon for the navbar chip and forecast lists. */
export function WeatherGlyph({ condition, isDay = true, className = "h-5 w-5" }: { condition: Condition; isDay?: boolean; className?: string }) {
  const Icon = condition === "clear" && !isDay ? Moon : GLYPHS[condition];
  const motion = condition === "clear" && isDay ? "animate-wx-spin" : "animate-wx-bob";
  const tone =
    condition === "clear"
      ? isDay
        ? "text-amber-500"
        : "text-indigo-400"
      : condition === "partly"
        ? "text-amber-500"
        : condition === "storm"
          ? "text-indigo-600"
          : condition === "rain" || condition === "drizzle"
            ? "text-sky-600"
            : "text-slate-500";
  return <Icon aria-hidden className={`${className} ${motion} ${tone}`} />;
}
