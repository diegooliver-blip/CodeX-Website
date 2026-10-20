import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ChatConsole } from "@/components/ChatConsole";
import { Constellation } from "@/components/Constellation";
import { CourseList } from "@/components/CourseList";
import { ServiceIcon } from "@/components/icons";
import { ProjectPlate } from "@/components/ProjectPlate";
import { Reveal } from "@/components/Reveal";
import { getCourses } from "@/lib/api";
import { capabilityGraph, featuredProjects, projects, serviceGroups, site } from "@/lib/content";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const graph = capabilityGraph();

export default function HomePage() {
  const [lead, ...rest] = featuredProjects;
  return (
    <>
      {/* ---------- hero ---------- */}
      <section className="relative isolate overflow-hidden pt-18">
        <div className="mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-[1440px] items-center gap-6 px-5 md:px-10 lg:grid-cols-[1.05fr_1fr]">
          <div className="relative z-10 py-14 lg:py-0">
            <h1 className="display text-[length:var(--text-h1)]">
              <span className="hero-line">Inteligencia</span>
              <span className="hero-line [animation-delay:120ms]">artificial que</span>
              <span className="hero-line [animation-delay:240ms]">opera tu negocio.</span>
            </h1>
            <p className="hero-line mt-8 max-w-[34rem] text-[length:var(--text-lede)] leading-relaxed text-ink/80 [animation-delay:420ms]">
              Agentes, plataformas, tiendas, apps y automatizaciones construidas a la medida y puestas en producción.
              Desde México, para empresas que quieren resultados y no presentaciones.
            </p>
            <div className="hero-line mt-10 flex flex-wrap gap-3 [animation-delay:560ms]">
              <a href={site.contact.calendly} target="_blank" rel="noopener" className="btn btn-primary">
                Agendar consultoría gratuita
              </a>
              <Link href="/proyectos" className="btn btn-ghost">
                Ver {projects.length} proyectos
              </Link>
            </div>
          </div>
          <div className="relative -mx-5 h-[min(110vw,560px)] md:mx-0 lg:h-[min(78vh,720px)]">
            <Constellation nodes={graph.nodes} edges={graph.edges} />
          </div>
        </div>
        <div className="mx-auto max-w-[1440px] px-5 pb-10 md:px-10">
          <dl className="grid grid-cols-2 gap-y-6 border-t border-line pt-6 md:grid-cols-4">
            {site.proof.map((p) => (
              <div key={p.label} className="pr-6">
                <dt className="sr-only">{p.label}</dt>
                <dd className="display text-4xl text-navy">{p.value}</dd>
                <dd className="mt-1 max-w-[16rem] text-[0.88rem] text-slate">{p.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------- capabilities index ---------- */}
      <section className="mx-auto max-w-[1440px] px-5 py-28 md:px-10 md:py-36" aria-labelledby="servicios">
        <Reveal className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-end">
          <h2 id="servicios" className="display text-[length:var(--text-h2)]">
            Todo lo que construimos, bajo un mismo techo.
          </h2>
          <p className="max-w-xl text-[length:var(--text-lede)] text-slate">
            Doce disciplinas que normalmente requieren cuatro proveedores. Aquí comparten arquitectura, datos y equipo,
            así que tu agente de WhatsApp, tu tienda y tu dashboard hablan entre sí desde el primer día.
          </p>
        </Reveal>

        <div className="mt-20 divide-y divide-line border-y border-line">
          {serviceGroups.map((g) => (
            <div key={g.group} className="grid gap-4 py-8 lg:grid-cols-[14rem_1fr] lg:gap-10">
              <p className="pt-2 text-navy">{g.group}</p>
              <ul className="grid gap-x-10 md:grid-cols-2">
                {g.items.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/servicios/${s.slug}`} className="group flex gap-5 py-4">
                      <ServiceIcon name={s.icon} className="mt-1.5 size-6 shrink-0 text-navy/80 transition-colors group-hover:text-navy" />
                      <span>
                        <span className="display block text-[1.7rem] leading-tight transition-colors group-hover:text-navy">
                          {s.title}
                        </span>
                        <span className="mt-1.5 block max-w-md text-[0.95rem] text-slate">{s.short}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- projects ---------- */}
      <section className="border-t border-line bg-mist/30" aria-labelledby="proyectos">
        <div className="mx-auto max-w-[1440px] px-5 py-28 md:px-10 md:py-36">
          <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h2 id="proyectos" className="display max-w-3xl text-[length:var(--text-h2)]">
              Sistemas en producción, contados sin nombres.
            </h2>
            <Link href="/proyectos" className="link-underline w-fit shrink-0 text-navy">
              Ver los {projects.length} proyectos
            </Link>
          </Reveal>
          <p className="mt-6 max-w-2xl text-slate">
            Protegemos a cada cliente: no verás marcas ni nombres, pero sí lo que construimos, con qué tecnología y los
            datos reales del sistema.
          </p>
          <div className="mt-16 grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2 lg:row-span-2">
              <ProjectPlate project={lead} large />
            </div>
            {rest.map((p) => (
              <ProjectPlate key={p.slug} project={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- method (a real sequence, so it is numbered) ---------- */}
      <section className="mx-auto max-w-[1440px] px-5 py-28 md:px-10 md:py-36" aria-labelledby="metodo">
        <Reveal>
          <h2 id="metodo" className="display max-w-3xl text-[length:var(--text-h2)]">
            Cinco etapas, cero cajas negras.
          </h2>
        </Reveal>
        <ol className="mt-16 grid gap-px overflow-hidden rounded-[22px] border border-line bg-line md:grid-cols-5">
          {site.method.map((m) => (
            <li key={m.step} className="bg-paper p-7">
              <span className="display text-5xl text-navy/90">{m.step}</span>
              <h3 className="mt-6 text-lg font-semibold">{m.title}</h3>
              <p className="mt-3 text-[0.94rem] text-slate">{m.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 max-w-4xl text-[0.95rem] leading-loose text-slate">
          Trabajamos con {site.stack.join(", ")}.
        </p>
      </section>

      {/* ---------- assistant ---------- */}
      <section className="border-y border-line bg-mist/30" aria-labelledby="asistente">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-28 md:px-10 md:py-36 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <Reveal>
            <h2 id="asistente" className="display text-[length:var(--text-h2)]">Pregúntale a CODEX.</h2>
            <p className="mt-6 max-w-lg text-[length:var(--text-lede)] text-slate">
              Nuestro asistente responde con lo que de verdad hemos construido: lee nuestros servicios, proyectos y
              cursos antes de contestar, y te dice de dónde sacó cada respuesta.
            </p>
            <p className="mt-6 max-w-lg text-slate">
              Es el mismo tipo de agente que instalamos en empresas: con fuentes, con límites y sin inventar.
            </p>
          </Reveal>
          <div className="h-[540px]">
            <ChatConsole />
          </div>
        </div>
      </section>

      {/* ---------- academy ---------- */}
      <section className="mx-auto max-w-[1440px] px-5 py-28 md:px-10 md:py-36" aria-labelledby="academia">
        <Reveal className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-end">
          <h2 id="academia" className="display text-[length:var(--text-h2)]">Academia CODEX.</h2>
          <p className="max-w-xl text-[length:var(--text-lede)] text-slate">
            Lo que aplicamos en proyectos reales, convertido en cursos: agentes, automatización y producto digital con IA.
          </p>
        </Reveal>
        <div className="mt-14">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-mist/60" />}>
            <AcademyPreview />
          </Suspense>
        </div>
      </section>

      {/* ---------- closing ---------- */}
      <section className="relative isolate overflow-hidden border-t border-line">
        <Image
          src="/images/hero-bg.jpg"
          alt=""
          fill
          sizes="100vw"
          quality={70}
          loading="lazy"
          className="-z-10 object-cover opacity-25 mix-blend-luminosity"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-paper via-paper/80 to-paper" />
        <div className="mx-auto max-w-[1440px] px-5 py-32 md:px-10 md:py-44">
          <div className="grid gap-10 md:grid-cols-3">
            {site.principles.map((p) => (
              <div key={p.title}>
                <h3 className="text-lg font-semibold text-navy">{p.title}</h3>
                <p className="mt-2 text-slate">{p.text}</p>
              </div>
            ))}
          </div>
          <h2 className="display mt-24 max-w-4xl text-[length:var(--text-h1)]">Hablemos de tu operación.</h2>
          <p className="mt-6 max-w-xl text-[length:var(--text-lede)] text-slate">
            Treinta minutos, sin costo: entendemos tu reto y te decimos con honestidad si la IA es la respuesta.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href={site.contact.calendly} target="_blank" rel="noopener" className="btn btn-primary">
              Agendar consultoría gratuita
            </a>
            <a href={site.contact.whatsapp} target="_blank" rel="noopener" className="btn btn-ghost">
              Escribir por WhatsApp
            </a>
          </div>
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
        <div className="flex flex-col justify-between gap-6 rounded-[22px] border border-line p-8 md:flex-row md:items-center">
          <p className="max-w-xl text-slate">
            Los primeros cursos están en producción. Déjanos tu correo en la academia y te avisamos cuando abran las
            inscripciones.
          </p>
          <Link href="/academia" className="btn btn-ghost shrink-0">Ir a la academia</Link>
        </div>
      }
    />
  );
}
