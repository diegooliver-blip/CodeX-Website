"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, useMotion } from "./motion/gsap";

type Variant = "up" | "clip" | "left" | "right" | "fade" | "stagger";

/**
 * Scroll reveal. `up`/`fade`/`left`/`right` move the block; `clip` wipes it in like a curtain;
 * `stagger` reveals each direct child in turn. Content is visible without JS and with reduced motion.
 */
export function Reveal({
  children,
  as: Tag = "div",
  className = "",
  delay = 0,
  variant = "up",
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
  variant?: Variant;
}) {
  const ref = useRef<HTMLElement>(null);
  useMotion(ref, (el) => {
    const scrollTrigger = { trigger: el, start: "top 88%", once: true };
    const d = delay / 1000;
    switch (variant) {
      case "clip":
        gsap.fromTo(
          el,
          { clipPath: "inset(100% 0% 0% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut", delay: d, scrollTrigger },
        );
        break;
      case "stagger":
        gsap.from(el.children, { autoAlpha: 0, y: 48, stagger: 0.09, delay: d, scrollTrigger });
        break;
      case "fade":
        gsap.from(el, { autoAlpha: 0, duration: 1.4, delay: d, scrollTrigger });
        break;
      default: {
        const x = variant === "left" ? -80 : variant === "right" ? 80 : 0;
        gsap.from(el, { autoAlpha: 0, x, y: x ? 0 : 56, delay: d, scrollTrigger });
      }
    }
  });
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
