"use client";

import Image from "next/image";
import { useRef, type ElementType, type ReactNode } from "react";
import { FINE_POINTER, gsap, SplitText, useMotion } from "./gsap";

/** Heading whose lines rise out of a mask as it scrolls into view. */
export function SplitReveal({
  children,
  as: Tag = "h2",
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  useMotion(ref, (el) => {
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 110,
          stagger: 0.08,
          duration: 1.3,
          delay: delay / 1000,
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        }),
    });
  });
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

/** Long statement whose words light up one by one as the reader scrolls through it. */
export function ScrubText({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useMotion(ref, (el) => {
    const split = SplitText.create(el, { type: "words" });
    gsap.fromTo(
      split.words,
      { opacity: 0.14 },
      { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true } },
    );
  });
  return (
    <p ref={ref} className={className}>
      {text}
    </p>
  );
}

/** Animates the leading number of a proof value ("17+", "2M+", "80+"); non-numeric values stay as written. */
export function Counter({ value, className = "" }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const match = value.match(/^(\d+)(.*)$/);
  useMotion(ref, (el) => {
    if (!match) return;
    const target = Number(match[1]);
    const state = { n: 0 };
    gsap.to(state, {
      n: target,
      duration: 2,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
      onUpdate: () => {
        el.textContent = `${Math.round(state.n)}${match[2]}`;
      },
    });
  });
  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}

/** Pulls its child toward the cursor (fine pointers only). */
export function Magnetic({ children, strength = 0.35, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useMotion(
    ref,
    (el) => {
      const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      };
      const leave = () => {
        xTo(0);
        yTo(0);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      };
    },
    [],
    FINE_POINTER,
  );
  return (
    <span ref={ref} className={`inline-block ${className}`}>
      {children}
    </span>
  );
}

/** Photo that wipes in on enter and drifts slower than the page (parallax). */
export function ParallaxImage({
  src,
  alt,
  className = "",
  sizes = "100vw",
  priority = false,
  speed = 14,
  reveal = true,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  speed?: number;
  reveal?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref, (el) => {
    const img = el.querySelector("img");
    if (img) {
      gsap.fromTo(
        img,
        { yPercent: -speed / 2, scale: 1.12 },
        { yPercent: speed / 2, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } },
      );
    }
    if (reveal) {
      gsap.fromTo(
        el,
        { clipPath: "inset(18% 12% 18% 12% round 24px)" },
        {
          clipPath: "inset(0% 0% 0% 0% round 0px)",
          duration: 1.6,
          ease: "expo.inOut",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        },
      );
    }
  });
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} quality={70} className="object-cover" />
    </div>
  );
}

/** Infinite horizontal ticker; pauses on hover and stops entirely with reduced motion. */
export function Marquee({ items, className = "" }: { items: string[]; className?: string }) {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-10 pr-10">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-10 whitespace-nowrap">
          <span>{item}</span>
          <span aria-hidden className="size-2.5 rounded-full bg-ember" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className={`marquee overflow-hidden ${className}`}>
      <div className="marquee-track flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
