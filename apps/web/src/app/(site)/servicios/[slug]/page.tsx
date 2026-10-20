import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceIcon } from "@/components/icons";
import { CtaBand, PageHero } from "@/components/PageHero";
import { ProjectPlate } from "@/components/ProjectPlate";
import { getService, projectsForService, services, site } from "@/lib/content";

export async function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/servicios/[slug]">): Promise<Metadata> {
  const s = getService((await params).slug);
  if (!s) return {};
  return { title: s.title, description: s.short, alternates: { canonical: `/servicios/${s.slug}` } };
}

export default async function ServicePage({ params }: PageProps<"/servicios/[slug]">) {
  const service = getService((await params).slug);
  if (!service) notFound();
  const work = projectsForService(service.slug);

  return (
    <>
      <PageHero trail={{ href: "/servicios", label: service.group }} title={service.title} lede={service.short}>
        <div className="hero-line mt-10 flex flex-wrap gap-3 [animation-delay:280ms]">
          <a href={site.contact.calendly} target="_blank" rel="noopener" className="btn btn-primary">Agendar consultoría gratuita</a>
          <a href={site.contact.whatsapp} target="_blank" rel="noopener" className="btn btn-ghost">Preguntar por WhatsApp</a>
        </div>
      </PageHero>

      <section className="mx-auto grid max-w-[1440px] gap-14 border-t border-line px-5 py-20 md:px-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <ServiceIcon name={service.icon} className="size-10 text-navy" />
          <p className="prose-codex mt-8 text-[length:var(--text-lede)] leading-relaxed">{service.description}</p>
        </div>
        <div>
          <h2 className="text-navy">Qué incluye</h2>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {service.capabilities.map((c) => (
              <li key={c} className="flex gap-4 py-4 text-[1.05rem]">
                <span aria-hidden className="mt-[0.75rem] h-px w-5 shrink-0 bg-signal" />
                {c}
              </li>
            ))}
          </ul>
          <div className="mt-12 grid gap-10 sm:grid-cols-2">
            <div>
              <h2 className="text-navy">Lo que te entregamos</h2>
              <ul className="mt-4 space-y-2 text-slate">
                {service.deliverables.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </div>
            <div>
              <h2 className="text-navy">Tecnología</h2>
              <p className="mt-4 text-slate">{service.stack.join(", ")}</p>
            </div>
          </div>
        </div>
      </section>

      {work.length > 0 && (
        <section className="border-t border-line bg-mist/30">
          <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-10">
            <h2 className="display text-[clamp(2rem,4vw,3.25rem)]">Lo hemos construido antes.</h2>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {work.slice(0, 6).map((p) => <ProjectPlate key={p.slug} project={p} />)}
            </div>
          </div>
        </section>
      )}

      <CtaBand calendly={site.contact.calendly} whatsapp={site.contact.whatsapp} title={`Hablemos de tu proyecto de ${service.label.toLowerCase()}.`} />
    </>
  );
}
