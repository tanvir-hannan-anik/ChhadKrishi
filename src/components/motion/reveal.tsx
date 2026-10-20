"use client";

import { motion, type Variants } from "motion/react";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const VIEWPORT = { once: true, margin: "0px 0px -12% 0px" } as const;

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}

/** Fades and lifts its content into place the first time it scrolls into view. */
export function Reveal({ children, className, delay = 0, y = 24 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.7, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

const groupVariants: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE_OUT } },
};

/** Staggers its `motion` children (use `variants={staggerItem}` on each) when scrolled into view. */
export function StaggerGroup({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol";
}) {
  const Component = motion[as];
  return (
    <Component className={className} variants={groupVariants} initial="hidden" whileInView="shown" viewport={VIEWPORT}>
      {children}
    </Component>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <Reveal className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <p className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-leaf">
        <span aria-hidden className="h-px w-6 bg-leaf/50" />
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-3xl leading-tight text-ink text-balance sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-base text-ink-soft text-pretty sm:text-lg">{subtitle}</p>}
    </Reveal>
  );
}
