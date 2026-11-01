"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap, MOTION_OK, useMotion } from "@/components/motion/gsap";
import { Magnetic } from "@/components/motion/primitives";

/**
 * Full-bleed photographic hero. The headline and photo render (and count for LCP) without JS via the CSS
 * `hero-line` rise; GSAP only adds the scroll-out: the photo slowly zooms while the copy lifts and fades.
 */
export function Hero({ calendly, projectCount }: { calendly: string; projectCount: number }) {
  const root = useRef<HTMLElement>(null);

  useMotion(root, (el) => {
    const scrollTrigger = { trigger: el, start: "top top", end: "bottom top", scrub: true };
    gsap.to(el.querySelector("[data-hero-img]"), { scale: 1.18, ease: "none", scrollTrigger });
    gsap.to(el.querySelector("[data-hero-copy]"), { yPercent: -18, opacity: 0.1, ease: "none", scrollTrigger });
    gsap.from(el.querySelector("[data-hero-card]"), { x: 60, opacity: 0, duration: 1.4, delay: 0.9 });
  }, [], MOTION_OK, "now");

  return (
    <section ref={root} className="theme-dark relative isolate flex min-h-[100svh] items-end overflow-hidden bg-ink">
      <div data-hero-img className="absolute inset-0 -z-10 will-change-transform">
        <Image
          src="/images/v4/hero.jpg"
          alt="Equipo trabajando con laptops en una oficina de vidrio con vista a la ciudad"
          fill
          priority
          sizes="100vw"
          quality={70}
          className="object-cover object-[70%_center]"
        />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-navy/95 via-navy/70 to-navy/10" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-ink/80 to-transparent" />
      <div aria-hidden className="warm-glow warm-glow-drift -bottom-[18rem] -left-[12rem] size-[52rem]" />
      <div aria-hidden className="warm-glow right-[8%] top-[12%] size-[28rem] opacity-60" />

      <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 pb-14 pt-36 md:px-10 md:pb-20 lg:grid-cols-[1fr_auto] lg:items-end">
        <div data-hero-copy>
          <p className="eyebrow hero-line">Agencia de inteligencia artificial en México</p>
          <h1 className="display mt-6 text-[length:var(--text-h1)]">
            <span className="hero-line [animation-delay:80ms]">Inteligencia</span>
            <span className="hero-line [animation-delay:180ms]">artificial que</span>
            <span className="hero-line [animation-delay:280ms]">
              opera tu <span className="text-spark">negocio.</span>
            </span>
          </h1>
          <p className="hero-line mt-8 max-w-[36rem] text-[length:var(--text-lede)] leading-relaxed text-paper/85 [animation-delay:420ms]">
            Agentes, plataformas, tiendas, apps y automatizaciones construidas a la medida y puestas en producción.
            Para empresas que quieren resultados y no presentaciones.
          </p>
          <div className="hero-line mt-10 flex flex-wrap gap-3 [animation-delay:560ms]">
            <Magnetic>
              <a href={calendly} target="_blank" rel="noopener" className="btn btn-primary">
                Agendar consultoría gratuita
              </a>
            </Magnetic>
            <Magnetic>
              <Link href="/proyectos" className="btn btn-ghost">
                Ver {projectCount} proyectos
              </Link>
            </Magnetic>
          </div>
        </div>

        <aside
          data-hero-card
          aria-label="Estado de nuestros sistemas"
          className="hidden w-80 rounded-[22px] border border-paper/15 bg-paper/10 p-6 backdrop-blur-xl lg:block"
        >
          <p className="flex items-center gap-2 text-sm text-paper/80">
            <span className="relative flex size-2.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-spark/70" />
              <span className="relative size-2.5 rounded-full bg-spark" />
            </span>
            Agentes en operación
          </p>
          <p className="display mt-4 text-5xl">24/7</p>
          <p className="mt-2 text-sm leading-relaxed text-paper/75">
            Atendiendo clientes, moviendo datos y generando reportes mientras tu equipo se enfoca en decidir.
          </p>
        </aside>
      </div>

      <div aria-hidden className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs text-paper/60 md:flex">
        <span>Desliza</span>
        <span className="h-10 w-px origin-top animate-[pulse-dot_2s_ease-in-out_infinite] bg-paper/60" />
      </div>
    </section>
  );
}
