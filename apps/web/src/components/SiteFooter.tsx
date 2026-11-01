import Link from "next/link";
import { Logo } from "@/components/Logo";
import { serviceGroups, site } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="theme-dark relative isolate overflow-hidden bg-ink">
      <div aria-hidden className="warm-glow -left-[14rem] -top-[14rem] size-[42rem]" />
      <div className="mx-auto max-w-[1440px] px-5 pt-24 md:px-10">
        <div className="grid gap-14 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Logo variant="light" className="h-12 w-auto md:h-14" />
            <p className="eyebrow mt-12">Hablemos</p>
            <p className="display mt-5 max-w-md text-4xl md:text-5xl">{site.tagline}</p>
            <div className="mt-10 space-y-2 text-[0.98rem]">
              <a className="link-underline block w-fit" href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
              <a className="link-underline block w-fit" href={site.contact.phoneHref}>{site.contact.phone}</a>
              <a className="link-underline block w-fit text-spark" href={site.contact.whatsapp} target="_blank" rel="noopener">
                Escríbenos por WhatsApp
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3">
            {serviceGroups.slice(0, 4).map((g) => (
              <div key={g.group}>
                <p className="mb-4 text-sm font-semibold text-paper">{g.group}</p>
                <ul className="space-y-2.5 text-[0.92rem] text-paper/65">
                  {g.items.map((s) => (
                    <li key={s.slug}>
                      <Link className="transition-colors hover:text-paper" href={`/servicios/${s.slug}`}>{s.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <p className="mb-4 text-sm font-semibold text-paper">CODEX</p>
              <ul className="space-y-2.5 text-[0.92rem] text-paper/65">
                <li><Link className="transition-colors hover:text-paper" href="/proyectos">Proyectos</Link></li>
                <li><Link className="transition-colors hover:text-paper" href="/experiencia">Experiencia</Link></li>
                <li><Link className="transition-colors hover:text-paper" href="/academia">Academia</Link></li>
                <li><Link className="transition-colors hover:text-paper" href="/contacto">Contacto</Link></li>
                <li><Link className="transition-colors hover:text-paper" href="/portal">Portal</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="rule mt-20" />
        <div className="mt-6 flex flex-col justify-between gap-3 text-[0.85rem] text-paper/60 sm:flex-row">
          <p>© 2026 CODEX AI Consulting. {site.location}.</p>
          <p>Nunca publicamos nombres ni marcas de nuestros clientes.</p>
        </div>
      </div>
      {/* Oversized wordmark bleeding off the bottom edge */}
      <p
        aria-hidden
        className="display pointer-events-none mt-10 select-none whitespace-nowrap text-center text-[25vw] leading-[0.72] tracking-[-0.06em] text-paper/[0.07]"
      >
        CODEX
      </p>
    </footer>
  );
}
