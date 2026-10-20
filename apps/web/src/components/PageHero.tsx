import Link from "next/link";

export function PageHero({
  trail,
  title,
  lede,
  children,
}: {
  trail?: { href: string; label: string };
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-[1440px] px-5 pb-16 pt-36 md:px-10 md:pb-24 md:pt-48">
      {trail && (
        <Link href={trail.href} className="link-underline text-[0.92rem] text-navy">
          {trail.label}
        </Link>
      )}
      <h1 className="display hero-line mt-6 max-w-5xl text-[clamp(2.6rem,6vw,5.5rem)]">{title}</h1>
      {lede && (
        <p className="hero-line mt-8 max-w-2xl text-[length:var(--text-lede)] leading-relaxed text-slate [animation-delay:160ms]">
          {lede}
        </p>
      )}
      {children}
    </section>
  );
}

export function CtaBand({ calendly, whatsapp, title = "¿Lo construimos para ti?" }: { calendly: string; whatsapp: string; title?: string }) {
  return (
    <section className="border-t border-line">
      <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 px-5 py-20 md:flex-row md:items-center md:px-10">
        <h2 className="display text-[clamp(2rem,4vw,3.25rem)]">{title}</h2>
        <div className="flex flex-wrap gap-3">
          <a href={calendly} target="_blank" rel="noopener" className="btn btn-primary">Agendar consultoría gratuita</a>
          <a href={whatsapp} target="_blank" rel="noopener" className="btn btn-ghost">Escribir por WhatsApp</a>
        </div>
      </div>
    </section>
  );
}
