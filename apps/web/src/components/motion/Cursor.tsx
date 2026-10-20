"use client";

import { useEffect, useRef } from "react";
import { FINE_POINTER, gsap } from "./gsap";

/**
 * Custom cursor for fine pointers: a dot that tracks exactly and a ring that trails.
 * Elements with `data-cursor="Ver"` grow the ring and show that label; links and buttons just grow it.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!window.matchMedia(FINE_POINTER).matches || !dot.current || !ring.current || !label.current) return;
    const d = dot.current;
    const r = ring.current;
    const l = label.current;
    document.documentElement.classList.add("has-cursor");
    gsap.set([d, r], { xPercent: -50, yPercent: -50, autoAlpha: 0 });
    const dx = gsap.quickTo(d, "x", { duration: 0.08 });
    const dy = gsap.quickTo(d, "y", { duration: 0.08 });
    const rx = gsap.quickTo(r, "x", { duration: 0.45, ease: "power3.out" });
    const ry = gsap.quickTo(r, "y", { duration: 0.45, ease: "power3.out" });

    const move = (e: PointerEvent) => {
      gsap.to([d, r], { autoAlpha: 1, duration: 0.3, overwrite: "auto" });
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
    };
    const over = (e: PointerEvent) => {
      const target = (e.target as Element).closest<HTMLElement>("[data-cursor], a, button, [role='button'], input, textarea, select");
      const text = target?.dataset.cursor ?? "";
      l.textContent = text;
      gsap.to(r, { scale: text ? 3.2 : target ? 1.8 : 1, backgroundColor: text ? "#ff6b15" : "rgba(0,0,0,0)", duration: 0.4 });
      gsap.to(l, { autoAlpha: text ? 1 : 0, duration: 0.2 });
      gsap.to(d, { autoAlpha: text ? 0 : 1, duration: 0.2 });
    };
    const leave = () => gsap.to([d, r], { autoAlpha: 0, duration: 0.3 });

    window.addEventListener("pointermove", move);
    document.addEventListener("pointerover", over);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90] hidden [@media(pointer:fine)]:block">
      <div ref={dot} className="fixed left-0 top-0 size-2 rounded-full bg-ember mix-blend-difference opacity-0" />
      <div
        ref={ring}
        className="fixed left-0 top-0 grid size-10 place-items-center rounded-full border border-ink/40 opacity-0"
      >
        <span ref={label} className="scale-[0.32] text-sm font-semibold text-ink opacity-0" />
      </div>
    </div>
  );
}
