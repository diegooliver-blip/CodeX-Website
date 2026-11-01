import Image from "next/image";
import Link from "next/link";
import { Magnetic, SplitReveal } from "@/components/motion/primitives";

/**
 * Interior-page hero: full-bleed photograph under a navy wash, same language as the home hero.
 * Title and lede render visible without JS (CSS `hero-line`), so they count for LCP immediately.
 */
export function PageHero({
  trail,
  title,
  lede,
  image,
  alt = "",
  children,
}: {
  trail?: { href: string; label: string };
  title: string;
  lede?: string;
  image: string;
  alt?: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <section className="theme-dark relative isolate overflow-hidden bg-ink">
        <Image src={image} alt={alt} fill priority sizes="100vw" quality={70} className="-z-10 object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-navy/95 via-navy/80 to-navy/35" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink/60 to-transparent" />
        <div aria-hidden className="warm-glow -bottom-[16rem] -left-[10rem] size-[44rem]" />
        <div className="mx-auto flex min-h-[78svh] max-w-[1440px] flex-col justify-end px-5 pb-16 pt-36 md:px-10 md:pb-24 md:pt-48">
          {trail && (
            <Link href={trail.href} className="hero-line link-underline w-fit text-[0.92rem] text-spark">
              {trail.label}
            </Link>
          )}
          <h1 className="display hero-line mt-6 max-w-5xl text-[clamp(2.6rem,6.4vw,6rem)]">{title}</h1>
          {lede && (
            <p className="hero-line mt-8 max-w-2xl text-[length:var(--text-lede)] leading-relaxed text-paper/85 [animation-delay:160ms]">
              {lede}
            </p>
          )}
          {children}
        </div>
      </section>
      <div aria-hidden className="h-20 md:h-28" />
    </>
  );
}

export function CtaBand({ calendly, whatsapp, title = "¿Lo construimos para ti?" }: { calendly: string; whatsapp: string; title?: string }) {
  return (
    <section className="px-5 pb-20 md:px-10 md:pb-28">
      <div className="relative isolate mx-auto flex max-w-[1440px] flex-col justify-between gap-10 overflow-hidden rounded-[32px] bg-ember px-8 py-14 md:flex-row md:items-end md:px-14 md:py-20">
        <div aria-hidden className="absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-spark/60 blur-3xl" />
        <SplitReveal className="display max-w-3xl text-[clamp(2.2rem,4.6vw,4rem)] text-ink">{title}</SplitReveal>
        <div className="flex flex-wrap gap-3">
          <Magnetic>
            <a href={calendly} target="_blank" rel="noopener" className="btn btn-dark">Agendar consultoría gratuita</a>
          </Magnetic>
          <Magnetic>
            <a href={whatsapp} target="_blank" rel="noopener" className="btn btn-ghost">Escribir por WhatsApp</a>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
