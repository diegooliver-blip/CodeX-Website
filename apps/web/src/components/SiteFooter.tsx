import Link from "next/link";
import { serviceGroups, site } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-line">
      <div className="mx-auto max-w-[1440px] px-5 pb-10 pt-20 md:px-10">
        <div className="grid gap-14 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <p className="display text-5xl tracking-[0.04em]">CODEX</p>
            <p className="mt-5 max-w-sm text-slate">{site.tagline}</p>
            <div className="mt-8 space-y-2 text-[0.95rem]">
              <a className="link-underline block w-fit text-ink" href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
              <a className="link-underline block w-fit text-ink" href={site.contact.phoneHref}>{site.contact.phone}</a>
              <a className="link-underline block w-fit text-navy" href={site.contact.whatsapp} target="_blank" rel="noopener">
                Escríbenos por WhatsApp
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3">
            {serviceGroups.slice(0, 4).map((g) => (
              <div key={g.group}>
                <p className="mb-4 text-sm text-navy">{g.group}</p>
                <ul className="space-y-2.5 text-[0.92rem] text-slate">
                  {g.items.map((s) => (
                    <li key={s.slug}>
                      <Link className="hover:text-ink" href={`/servicios/${s.slug}`}>{s.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <p className="mb-4 text-sm text-navy">CODEX</p>
              <ul className="space-y-2.5 text-[0.92rem] text-slate">
                <li><Link className="hover:text-ink" href="/proyectos">Proyectos</Link></li>
                <li><Link className="hover:text-ink" href="/experiencia">Experiencia</Link></li>
                <li><Link className="hover:text-ink" href="/academia">Academia</Link></li>
                <li><Link className="hover:text-ink" href="/contacto">Contacto</Link></li>
                <li><Link className="hover:text-ink" href="/portal">Portal</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="rule mt-16 opacity-40" />
        <div className="mt-6 flex flex-col justify-between gap-3 text-[0.85rem] text-slate sm:flex-row">
          <p>© 2026 CODEX AI Consulting. {site.location}.</p>
          <p>Nunca publicamos nombres ni marcas de nuestros clientes.</p>
        </div>
      </div>
    </footer>
  );
}
