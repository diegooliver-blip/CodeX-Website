"use client";

import Link from "next/link";
import { useRef } from "react";
import { ServiceIcon } from "@/components/icons";
import { gsap, useMotion } from "@/components/motion/gsap";

type Item = { slug: string; title: string; short: string; icon: string; group: string };

/**
 * All twelve services on one horizontal rail. On large screens with motion allowed the section pins and
 * vertical scrolling drives the rail sideways; everywhere else it is a native, snap-scrolling row.
 */
export function ServicesRail({ items }: { items: Item[] }) {
  const root = useRef<HTMLElement>(null);

  useMotion(
    root,
    (el) => {
      const track = el.querySelector<HTMLElement>("[data-track]");
      if (!track) return;
      const distance = () => track.scrollWidth - track.clientWidth;
      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });
      gsap.to(el.querySelector("[data-rail-progress]"), {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: () => `+=${distance()}`, scrub: true },
      });
    },
    [],
    "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
  );

  return (
    <section ref={root} className="overflow-hidden bg-mist-2 lg:flex lg:h-[100svh] lg:flex-col lg:justify-center" aria-labelledby="servicios">
      <div className="mx-auto w-full max-w-[1440px] px-5 pt-24 md:px-10 lg:pt-0">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">Servicios</p>
            <h2 id="servicios" className="display mt-4 max-w-3xl text-[length:var(--text-h2)]">
              Doce disciplinas, un mismo equipo.
            </h2>
          </div>
          <Link href="/servicios" className="link-underline w-fit shrink-0 font-semibold text-navy">
            Ver todos los servicios
          </Link>
        </div>
      </div>

      <ul
        data-track
        className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-24 [scrollbar-width:none] md:px-10 lg:snap-none lg:overflow-visible lg:pb-0 lg:pl-[max(2.5rem,calc((100vw-1440px)/2+2.5rem))]"
      >
        {items.map((s) => (
          <li key={s.slug} className="w-[82vw] shrink-0 snap-start sm:w-[22rem]">
            <Link
              href={`/servicios/${s.slug}`}
              data-cursor="Ver"
              className="group flex h-[26rem] flex-col justify-between rounded-[28px] border border-line bg-paper p-8 transition-[background-color,color,border-color,translate] duration-500 hover:-translate-y-2 hover:border-navy hover:bg-navy hover:text-paper"
            >
              <span className="flex items-start justify-between">
                <span className="grid size-14 place-items-center rounded-2xl bg-mist text-navy transition-colors duration-500 group-hover:bg-ember group-hover:text-ink">
                  <ServiceIcon name={s.icon} className="size-6" />
                </span>
                <span className="text-sm text-slate transition-colors duration-500 group-hover:text-paper/70">{s.group}</span>
              </span>
              <span>
                <span className="display block text-[1.9rem] leading-[1.05]">{s.title}</span>
                <span className="mt-4 block text-[0.95rem] leading-relaxed text-slate transition-colors duration-500 group-hover:text-paper/80">
                  {s.short}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mx-auto hidden w-full max-w-[1440px] px-10 pt-12 lg:block">
        <div className="h-px w-full bg-line">
          <div data-rail-progress className="h-px origin-left scale-x-0 bg-navy" />
        </div>
      </div>
    </section>
  );
}
