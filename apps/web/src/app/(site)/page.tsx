import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BookingCalendar } from "@/components/BookingCalendar";
import { CourseList } from "@/components/CourseList";
import { Hero } from "@/components/home/Hero";
import { MethodSteps } from "@/components/home/MethodSteps";
import { ServicesRail } from "@/components/home/ServicesRail";
import { Counter, Magnetic, Marquee, ParallaxImage, ScrubText, SplitReveal } from "@/components/motion/primitives";
import { WarmSpotlight } from "@/components/motion/WarmSpotlight";
import { Reveal } from "@/components/Reveal";
import { getCourses } from "@/lib/api";
import { cases, projects, serviceGroups, services, site } from "@/lib/content";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/** Three pillars that group the six service families, each with its own photograph. */
const pillars = [
  {
    title: "Agentes e inteligencia artificial",
    groups: ["Agentes de IA", "Estrategia"],
    image: "/images/v4/ia.jpg",
    alt: "Analista frente a monitores con dashboards de datos",
  },
  {
    title: "Producto digital y crecimiento",
    groups: ["Producto digital", "Crecimiento"],
    image: "/images/v4/plataformas.jpg",
    alt: "Desarrollador frente a un pizarrón con diagramas de arquitectura",
  },
  {
    title: "Operación e ingeniería",
    groups: ["Operación", "Ingeniería"],
    image: "/images/v4/automatizacion.jpg",
    alt: "Pasillo de almacén con estanterías naranjas y personal trabajando",
  },
].map((p) => ({ ...p, items: serviceGroups.filter((g) => p.groups.includes(g.group)).flatMap((g) => g.items) }));

const methodImages = [
  ["/images/v4/diagnostico.jpg", "Facilitadora explicando un diagnóstico en un pizarrón"],
  ["/images/v4/diseno.jpg", "Bocetos de interfaz dibujados a mano en una libreta"],
  ["/images/v4/construccion.jpg", "Código en pantalla durante el desarrollo"],
  ["/images/v4/puesta-en-marcha.jpg", "Equipo revisando dashboards en una presentación"],
  ["/images/v4/operacion.jpg", "Dashboard de analítica en operación sobre una laptop"],
];

/** One photograph per service card in the rail. */
const serviceImages: Record<string, string> = {
  "agentes-whatsapp": "/images/v4/retail.jpg",
  "websites-ia": "/images/v4/plataformas.jpg",
  ecommerce: "/images/v4/ecommerce.jpg",
  "apps-moviles": "/images/v4/diseno.jpg",
  "campanas-meta": "/images/v4/puesta-en-marcha.jpg",
  automatizacion: "/images/v4/automatizacion.jpg",
  "email-automation": "/images/v4/operacion.jpg",
  dashboards: "/images/v4/ia.jpg",
  "simulacion-energetica": "/images/v4/energia.jpg",
  "sistemas-multiagente": "/images/v4/statement.jpg",
  "e-learning": "/images/v4/educacion.jpg",
  "consultoria-ia": "/images/v4/diagnostico.jpg",
};

const sectors = [...new Set([...projects.flatMap((p) => p.sector.split(", ")), ...cases.map((c) => c.sector)])];

export default function HomePage() {
  return (
    <>
      <Hero calendly={site.contact.calendly} projectCount={projects.length} />

      {/* ---------- statement ---------- */}
      <section className="mx-auto grid max-w-[1440px] gap-14 px-5 py-28 md:px-10 md:py-40 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div>
          <p className="eyebrow">Quiénes somos</p>
          <ScrubText text={site.statement} className="display mt-8 text-[clamp(1.9rem,4.2vw,3.6rem)] leading-[1.12] tracking-[-0.025em]" />
        </div>
        <ParallaxImage
          src="/images/v4/statement.jpg"
          alt="Fibras ópticas iluminadas en azul"
          sizes="(min-width: 1024px) 22rem, 100vw"
          className="aspect-[4/5] rounded-[28px]"
        />
      </section>

      {/* ---------- pillars ---------- */}
      <section className="mx-auto max-w-[1440px] px-5 pb-28 md:px-10 md:pb-40" aria-labelledby="pilares">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-end">
          <SplitReveal className="display text-[length:var(--text-h2)]">
            <span id="pilares">Todo lo que construimos, bajo un mismo techo.</span>
          </SplitReveal>
          <Reveal>
            <p className="max-w-xl text-[length:var(--text-lede)] text-slate">
              Disciplinas que normalmente requieren cuatro proveedores. Aquí comparten arquitectura, datos y equipo,
              así que tu agente de WhatsApp, tu tienda y tu dashboard hablan entre sí desde el primer día.
            </p>
          </Reveal>
        </div>
        <Reveal variant="stagger" className="mt-16 grid gap-5 lg:grid-cols-3">
          {pillars.map((p) => (
            <article key={p.title} className="group relative isolate flex min-h-[34rem] flex-col justify-end overflow-hidden rounded-[28px] bg-navy p-8 text-paper">
              <Image
                src={p.image}
                alt={p.alt}
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                quality={70}
                className="-z-10 object-cover transition-transform duration-[1400ms] ease-[var(--ease-codex)] group-hover:scale-110"
              />
              <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/60 to-ink/0" />
              <h3 className="display text-[2rem] leading-[1.05]">{p.title}</h3>
              <ul className="mt-6 flex flex-wrap gap-2">
                {p.items.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/servicios/${s.slug}`}
                      className="block rounded-full border border-paper/30 bg-paper/10 px-3.5 py-1.5 text-sm backdrop-blur-md transition-colors hover:border-ember hover:bg-ember hover:text-ink"
                    >
                      {s.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </Reveal>
      </section>

      <ServicesRail
        items={services.map(({ slug, title, short, icon, group }) => ({
          slug,
          title,
          short,
          icon,
          group,
          image: serviceImages[slug] ?? "/images/v4/plataformas.jpg",
        }))}
      />

      <MethodSteps
        steps={site.method.map((m, i) => ({ ...m, image: methodImages[i][0], alt: methodImages[i][1] }))}
      />

      {/* ---------- proof ---------- */}
      <section className="theme-dark relative isolate overflow-hidden bg-navy" aria-labelledby="cifras">
        <div aria-hidden className="absolute -right-40 -top-40 -z-10 size-[36rem] rounded-full bg-signal/30 blur-3xl" />
        <WarmSpotlight />
        <div className="mx-auto max-w-[1440px] px-5 py-28 md:px-10 md:py-36">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-end">
            <SplitReveal className="display text-[length:var(--text-h2)]">
              <span id="cifras">Cifras de sistemas reales.</span>
            </SplitReveal>
            <p className="prose-codex text-[length:var(--text-lede)]">
              Sin clientes inventados ni porcentajes de catálogo: estos números salen de lo que construimos y operamos.
            </p>
          </div>
          <dl className="mt-20 grid gap-px overflow-hidden rounded-[28px] bg-paper/15 sm:grid-cols-2 lg:grid-cols-4">
            {site.proof.map((p) => (
              <div key={p.label} className="flex flex-col-reverse justify-end bg-navy p-8 md:p-10">
                <dt className="mt-4 max-w-[16rem] text-[0.95rem] text-paper/75">{p.label}</dt>
                <dd className="display text-[clamp(3.5rem,6vw,5.5rem)] leading-none text-spark">
                  <Counter value={p.value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------- sectors ---------- */}
      <section aria-label="Sectores en los que hemos trabajado" className="border-y border-line bg-mist-2 py-10">
        <Marquee items={sectors} className="display text-[clamp(1.6rem,3vw,2.6rem)] text-ink/85" />
      </section>

      {/* ---------- academy ---------- */}
      <section className="mx-auto max-w-[1440px] px-5 py-28 md:px-10 md:py-40" aria-labelledby="academia">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-end">
          <div>
            <p className="eyebrow">Academia</p>
            <SplitReveal className="display mt-4 text-[length:var(--text-h2)]">
              <span id="academia">Academia CODEX.</span>
            </SplitReveal>
          </div>
          <p className="max-w-xl text-[length:var(--text-lede)] text-slate">
            Lo que aplicamos en proyectos reales, convertido en cursos: agentes, automatización y producto digital con IA.
          </p>
        </div>
        <div className="mt-14">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-[22px] bg-mist" />}>
            <AcademyPreview />
          </Suspense>
        </div>
      </section>

      {/* ---------- founder ---------- */}
      <section className="border-t border-line bg-mist-2" aria-labelledby="fundador">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-28 md:px-10 md:py-36 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow">Quién está detrás</p>
            <h2 id="fundador" className="display mt-4 text-[length:var(--text-h2)]">{site.founder.name}</h2>
            <p className="mt-3 text-lg text-navy">{site.founder.role}</p>
          </div>
          <Reveal>
            <p className="text-[length:var(--text-lede)] leading-relaxed text-slate">{site.founder.text}</p>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {site.principles.map((p) => (
                <div key={p.title} className="border-t-2 border-ink pt-5">
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="mt-2 text-[0.95rem] text-slate">{p.text}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- closing ---------- */}
      <section className="theme-dark relative isolate overflow-hidden bg-ink" aria-labelledby="cierre">
        <ParallaxImage
          src="/images/v4/cierre.jpg"
          alt=""
          reveal={false}
          speed={20}
          className="!absolute inset-0 -z-10 opacity-60"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
        <div aria-hidden className="warm-glow warm-glow-drift left-[-10%] top-[10%] size-[46rem]" />
        <div className="mx-auto max-w-[1440px] px-5 py-36 md:px-10 md:py-52">
          <div>
            <p className="eyebrow">Contacto</p>
            <SplitReveal as="h2" className="display mt-6 max-w-5xl text-[length:var(--text-h1)]">
              <span id="cierre">Hablemos de tu operación.</span>
            </SplitReveal>
            <p className="prose-codex mt-8 max-w-xl text-[length:var(--text-lede)]">
              Treinta minutos, sin costo: entendemos tu reto y te decimos con honestidad si la IA es la respuesta.
            </p>
            <div className="mt-12 flex flex-wrap gap-3">
              <Magnetic>
                {site.contact.calcom ? (
                  <a href="#agendar" className="btn btn-primary">Agendar consultoría gratuita</a>
                ) : (
                  <a href={site.contact.calendly} target="_blank" rel="noopener" className="btn btn-primary">
                    Agendar consultoría gratuita
                  </a>
                )}
              </Magnetic>
              <Magnetic>
                <a href={site.contact.whatsapp} target="_blank" rel="noopener" className="btn btn-ghost">
                  Escribir por WhatsApp
                </a>
              </Magnetic>
            </div>
          </div>
          {site.contact.calcom ? (
            <div id="agendar" className="mt-16 scroll-mt-24 md:mt-20">
              <Reveal variant="right">
                <BookingCalendar calLink={site.contact.calcom} fallbackHref={`https://cal.com/${site.contact.calcom}`} />
              </Reveal>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

async function AcademyPreview() {
  const courses = (await getCourses()).slice(0, 4);
  return (
    <CourseList
      courses={courses}
      empty={
        <div className="flex flex-col justify-between gap-6 rounded-[28px] border border-line bg-mist-2 p-8 md:flex-row md:items-center md:p-10">
          <p className="max-w-xl text-slate">
            Los primeros cursos están en producción. Déjanos tu correo en la academia y te avisamos cuando abran las
            inscripciones.
          </p>
          <Link href="/academia" className="btn btn-dark shrink-0">Ir a la academia</Link>
        </div>
      }
    />
  );
}
