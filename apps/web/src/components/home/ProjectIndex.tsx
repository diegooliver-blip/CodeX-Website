"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { FINE_POINTER, gsap, useMotion } from "@/components/motion/gsap";

type Row = { slug: string; title: string; category: string; sector: string; cover: string };

/**
 * Editorial project index. On fine pointers a cover photo follows the cursor over the list (hover reveal);
 * on touch screens every row shows its own thumbnail instead.
 */
export function ProjectIndex({ rows }: { rows: Row[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  useMotion(
    root,
    (el) => {
      const float = el.querySelector<HTMLElement>("[data-float]");
      if (!float) return;
      gsap.set(float, { xPercent: -50, yPercent: -50, scale: 0.6, autoAlpha: 0 });
      const xTo = gsap.quickTo(float, "x", { duration: 0.6, ease: "power3.out" });
      const yTo = gsap.quickTo(float, "y", { duration: 0.6, ease: "power3.out" });
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        xTo(e.clientX - r.left);
        yTo(e.clientY - r.top);
      };
      const enter = () => gsap.to(float, { scale: 1, autoAlpha: 1, duration: 0.5 });
      const leave = () => gsap.to(float, { scale: 0.6, autoAlpha: 0, duration: 0.4 });
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerenter", enter);
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerenter", enter);
        el.removeEventListener("pointerleave", leave);
      };
    },
    [],
    FINE_POINTER,
  );

  return (
    <div ref={root} className="relative" onPointerLeave={() => setHover(null)}>
      <ul className="border-b border-line">
        {rows.map((p, i) => (
          <li key={p.slug} className="border-t border-line">
            <Link
              href={`/proyectos/${p.slug}`}
              data-cursor="Ver"
              onPointerEnter={() => setHover(i)}
              className={`group grid items-center gap-4 py-7 transition-[opacity,padding] duration-500 md:grid-cols-[1fr_14rem_12rem] md:py-9 md:hover:pl-6 ${
                hover !== null && hover !== i ? "md:opacity-40" : ""
              }`}
            >
              <span className="flex items-center gap-5">
                <span className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl [@media(pointer:fine)]:hidden">
                  <Image src={p.cover} alt="" fill sizes="96px" quality={70} className="object-cover" />
                </span>
                <span className="display text-[clamp(1.6rem,3.4vw,3rem)] leading-[1.05]">{p.title}</span>
              </span>
              <span className="text-slate">{p.sector}</span>
              <span className="w-fit rounded-full border border-line px-4 py-1.5 text-sm text-navy transition-colors duration-500 group-hover:border-navy group-hover:bg-navy group-hover:text-paper md:justify-self-end">
                {p.category}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div
        data-float
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-10 hidden aspect-[4/3] w-[24rem] overflow-hidden rounded-[22px] shadow-2xl [@media(pointer:fine)]:block"
      >
        {rows.map((p, i) => (
          <Image
            key={p.slug}
            src={p.cover}
            alt=""
            fill
            sizes="384px"
            quality={70}
            className={`object-cover transition-[opacity,scale] duration-500 ${hover === i ? "scale-100 opacity-100" : "scale-110 opacity-0"}`}
          />
        ))}
      </div>
    </div>
  );
}
