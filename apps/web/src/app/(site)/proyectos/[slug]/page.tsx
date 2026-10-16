import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaBand, PageHero } from "@/components/PageHero";
import { ProjectPlate } from "@/components/ProjectPlate";
import { getProject, getService, projects, relatedProjects, site } from "@/lib/content";

export async function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/proyectos/[slug]">): Promise<Metadata> {
  const p = getProject((await params).slug);
  if (!p) return {};
  return { title: p.title, description: p.summary, alternates: { canonical: `/proyectos/${p.slug}` } };
}

export default async function ProjectPage({ params }: PageProps<"/proyectos/[slug]">) {
  const project = getProject((await params).slug);
  if (!project) notFound();
  const related = relatedProjects(project);

  return (
    <>
      <PageHero trail={{ href: "/proyectos", label: project.category }} title={project.title} lede={project.summary}>
        <dl className="hero-line mt-14 grid max-w-4xl grid-cols-2 gap-8 border-t border-line pt-8 sm:grid-cols-3 [animation-delay:280ms]">
          {project.facts.map((f) => (
            <div key={f.label}>
              <dt className="sr-only">{f.label}</dt>
              <dd className="display text-5xl text-gold">{f.value}</dd>
              <dd className="mt-2 text-ash">{f.label}</dd>
            </div>
          ))}
        </dl>
      </PageHero>

      <section className="mx-auto grid max-w-[1440px] gap-14 border-t border-line px-5 py-20 md:px-10 lg:grid-cols-2">
        <div>
          <h2 className="text-gold">El reto</h2>
          <p className="prose-codex mt-4 text-[1.15rem] leading-relaxed">{project.challenge}</p>
          <h2 className="mt-12 text-gold">Lo que construimos</h2>
          <p className="prose-codex mt-4 text-[1.15rem] leading-relaxed">{project.solution}</p>
        </div>
        <div>
          <h2 className="text-gold">Funciones clave</h2>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {project.features.map((f) => (
              <li key={f} className="flex gap-4 py-4">
                <span aria-hidden className="mt-[0.75rem] h-px w-5 shrink-0 bg-gold" />
                {f}
              </li>
            ))}
          </ul>
          <dl className="mt-10 grid gap-8 sm:grid-cols-3">
            <div>
              <dt className="text-gold">Sector</dt>
              <dd className="mt-2 text-ash">{project.sector}</dd>
            </div>
            <div>
              <dt className="text-gold">Estado</dt>
              <dd className="mt-2 text-ash">{project.status}</dd>
            </div>
            <div>
              <dt className="text-gold">Servicios</dt>
              <dd className="mt-2 space-y-1">
                {project.services.map((slug) => {
                  const s = getService(slug);
                  return s ? (
                    <Link key={slug} href={`/servicios/${slug}`} className="link-underline block w-fit text-champagne">{s.label}</Link>
                  ) : null;
                })}
              </dd>
            </div>
          </dl>
          <p className="mt-10 text-[0.95rem] text-ash">Tecnología: {project.stack.join(", ")}</p>
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-t border-line bg-graphite/30">
          <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-10">
            <h2 className="display text-[clamp(2rem,4vw,3.25rem)]">Proyectos relacionados</h2>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {related.map((p) => <ProjectPlate key={p.slug} project={p} />)}
            </div>
          </div>
        </section>
      )}

      <CtaBand calendly={site.contact.calendly} whatsapp={site.contact.whatsapp} title="¿Necesitas algo parecido?" />
    </>
  );
}
