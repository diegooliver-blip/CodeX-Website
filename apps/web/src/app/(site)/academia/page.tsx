import type { Metadata } from "next";
import { Suspense } from "react";
import { CourseList } from "@/components/CourseList";
import { LeadForm } from "@/components/LeadForm";
import { PageHero } from "@/components/PageHero";
import { getCourses } from "@/lib/api";

export const metadata: Metadata = {
  title: "Academia",
  description: "Cursos de agentes de IA, automatización y producto digital, creados a partir de proyectos reales.",
  alternates: { canonical: "/academia" },
};

const tracks = [
  { title: "Agentes de IA", text: "Diseño, herramientas, memoria y control humano para agentes que trabajan de verdad." },
  { title: "Automatización", text: "n8n, APIs y flujos que eliminan trabajo manual sin romper la operación." },
  { title: "Producto digital con IA", text: "De la idea al despliegue: webs, tiendas y dashboards construidos con IA." },
];

export default function AcademyPage() {
  return (
    <>
      <PageHero
        title="Academia CODEX."
        lede="Aprende lo que aplicamos en proyectos reales. Lecciones en video, material descargable y ejercicios, a tu ritmo."
      />
      <section className="mx-auto max-w-[1440px] px-5 pb-20 md:px-10">
        <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-mist/60" />}>
          <Catalog />
        </Suspense>
      </section>
      <section className="border-t border-line bg-mist/30">
        <div className="mx-auto grid max-w-[1440px] gap-16 px-5 py-24 md:px-10 lg:grid-cols-2">
          <div>
            <h2 className="display text-[clamp(2rem,4vw,3.25rem)]">Rutas de aprendizaje</h2>
            <div className="mt-10 space-y-8">
              {tracks.map((t) => (
                <div key={t.title}>
                  <h3 className="text-lg font-semibold text-navy">{t.title}</h3>
                  <p className="mt-1 max-w-md text-slate">{t.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="display text-[clamp(1.8rem,3vw,2.5rem)]">Recibe los próximos lanzamientos</h2>
            <p className="mt-3 mb-8 text-slate">Te escribimos solo cuando abra un curso nuevo.</p>
            <LeadForm source="academia" submitLabel="Avisarme" />
          </div>
        </div>
      </section>
    </>
  );
}

async function Catalog() {
  const courses = await getCourses();
  return (
    <CourseList
      courses={courses}
      empty={
        <p className="rounded-[22px] border border-line p-8 text-slate">
          Estamos grabando los primeros cursos. Déjanos tu correo abajo y te avisamos el día que abran.
        </p>
      }
    />
  );
}
