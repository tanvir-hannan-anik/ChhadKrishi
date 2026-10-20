import Image from "next/image";

export function LogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-line ${className}`}
      style={{ width: size, height: size }}
    >
      {/* The source PNG has generous white padding, so scale it up to fill the tile */}
      <Image src="/logo.png" alt="" width={size * 2} height={size * 2} className="h-full w-full scale-[1.55] object-cover" priority />
    </span>
  );
}

/** A single stylised leaf, echoing the logo's shape. */
export function Leaf({ className = "", tone = "leaf" }: { className?: string; tone?: "leaf" | "lime" | "forest" }) {
  const fill = { leaf: "var(--leaf)", lime: "var(--lime)", forest: "var(--forest)" }[tone];
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <path d="M10 56C6 34 20 10 56 6c2 30-16 50-46 50Z" fill={fill} />
      <path d="M12 54C22 40 32 28 46 16" stroke="var(--paper)" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.8" />
    </svg>
  );
}

/** Small potted sprout used as a quiet decorative accent. */
export function Sprout({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 96" aria-hidden className={className}>
      <path d="M40 58V30" stroke="var(--leaf)" strokeWidth="3" strokeLinecap="round" />
      <path d="M40 40C40 26 28 18 14 20c0 14 12 22 26 20Z" fill="var(--leaf)" />
      <path d="M40 34c0-14 12-22 26-20 0 14-12 22-26 20Z" fill="var(--lime)" />
      <path d="M18 58h44l-6 32a4 4 0 0 1-4 3H28a4 4 0 0 1-4-3l-6-32Z" fill="var(--clay)" />
      <rect x="14" y="54" width="52" height="9" rx="3" fill="#a9552d" />
    </svg>
  );
}
