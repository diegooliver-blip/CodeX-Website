"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ScrollTrigger, useMotion } from "@/components/motion/gsap";

type Step = { step: string; title: string; text: string; image: string; alt: string };

/**
 * The method is a real sequence, so it is numbered. On wide screens the photo column sticks while each step
 * scrolls past and swaps the photo; the active step is also the state used without motion (no pin needed).
 */
export function MethodSteps({ steps }: { steps: Step[] }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [tracking, setTracking] = useState(false); // steps only dim while scroll tracking runs (not with reduced motion)

  useMotion(root, (el) => {
    setTracking(true);
    const triggers = [...el.querySelectorAll<HTMLElement>("[data-step]")].map((node, i) =>
      ScrollTrigger.create({
        trigger: node,
        start: "top 60%",
        end: "bottom 60%",
        onToggle: (self) => self.isActive && setActive(i),
      }),
    );
    return () => {
      triggers.forEach((t) => t.kill());
      setTracking(false);
    };
  });

  return (
    <section ref={root} className="relative isolate overflow-x-clip mx-auto max-w-[1440px] px-5 py-28 md:px-10 md:py-40" aria-labelledby="metodo">
      <div aria-hidden className="warm-glow warm-glow-soft -left-[14rem] top-0 size-[40rem]" />
      <p className="eyebrow">Método</p>
      <h2 id="metodo" className="display mt-4 max-w-3xl text-[length:var(--text-h2)]">
        Cinco etapas, cero cajas negras.
      </h2>

      <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="relative hidden lg:block">
          <div className="sticky top-28 aspect-[4/5] overflow-hidden rounded-[28px] bg-mist">
            {steps.map((s, i) => (
              <Image
                key={s.step}
                src={s.image}
                alt={s.alt}
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                quality={70}
                className={`object-cover transition-[opacity,scale] duration-[1200ms] ease-[var(--ease-codex)] ${
                  active === i ? "scale-100 opacity-100" : "scale-110 opacity-0"
                }`}
              />
            ))}
            <div className="absolute inset-x-6 bottom-6 flex gap-2">
              {steps.map((s, i) => (
                <span key={s.step} className="h-1 flex-1 overflow-hidden rounded-full bg-paper/35">
                  <span className={`block h-full bg-paper transition-[width] duration-700 ${i <= active ? "w-full" : "w-0"}`} />
                </span>
              ))}
            </div>
          </div>
        </div>

        <ol className="lg:py-[18vh]">
          {steps.map((s, i) => (
            <li
              key={s.step}
              data-step
              className={`border-t border-line py-10 transition-opacity duration-700 lg:min-h-[52vh] ${
                active === i || !tracking ? "opacity-100" : "lg:opacity-35"
              }`}
            >
              <div className="relative mb-8 aspect-[16/10] overflow-hidden rounded-[22px] lg:hidden">
                <Image src={s.image} alt={s.alt} fill sizes="100vw" quality={70} className="object-cover" />
              </div>
              <span className="display text-6xl text-signal md:text-7xl">{s.step}</span>
              <h3 className="display mt-6 text-[length:var(--text-h3)]">{s.title}</h3>
              <p className="mt-4 max-w-lg text-[length:var(--text-lede)] leading-relaxed text-slate">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
