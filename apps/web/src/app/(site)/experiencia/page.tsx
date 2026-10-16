import type { Metadata } from "next";
import { CtaBand, PageHero } from "@/components/PageHero";
import { cases, site } from "@/lib/content";

export const metadata: Metadata = {
  title: "Experiencia",
  description: "Experiencia en industria, sistemas de gestión ISO, gestión ambiental, inteligencia corporativa y transformación digital.",
  alternates: { canonical: "/experiencia" },
};

const domains = [
  { title: "Automatización industrial", text: "Flujos productivos con n8n y agentes de IA en manufactura y logística." },
  { title: "Gestión ambiental", text: "Reporte y trazabilidad de indicadores ambientales alineados a ISO 14001." },
  { title: "Normatividad ISO", text: "Sistemas de gestión bajo ISO 9001, 45001 y 14001 con integración digital." },
  { title: "Regulación internacional", text: "Procesos adecuados a marcos regulatorios en industria, finanzas y servicios." },
  { title: "Dirección corporativa", text: "Centros de inteligencia y sistemas de decisión ejecutiva con datos en tiempo real." },
  { title: "Dirección de proyectos", text: "PMI/PMBOK y marcos ágiles en transformación digital de mediana y gran escala." },
];

export default function ExperiencePage() {
  return (
    <>
      <PageHero
        title="Experiencia en operación real."
        lede="Antes de los agentes, la operación: plantas, sistemas de gestión, cumplimiento y dirección de proyectos. Por eso nuestra IA aterriza en procesos que funcionan."
      />
      <section className="mx-auto max-w-[1440px] px-5 pb-24 md:px-10">
        <div className="divide-y divide-line border-y border-line">
          {cases.map((c) => (
            <article key={c.slug} className="grid gap-4 py-12 lg:grid-cols-[14rem_1fr_1fr] lg:gap-12">
              <p className="text-gold">{c.sector}</p>
              <h2 className="display text-[clamp(1.9rem,3vw,2.6rem)] leading-[1.05]">{c.title}</h2>
              <div>
                <p className="text-ash">{c.text}</p>
                <p className="mt-4 text-[0.9rem] text-champagne">{c.tags.join(", ")}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="border-t border-line bg-graphite/30">
        <div className="mx-auto max-w-[1440px] px-5 py-24 md:px-10">
          <h2 className="display text-[length:var(--text-h2)]">Dominio técnico y regulatorio.</h2>
          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {domains.map((d) => (
              <div key={d.title}>
                <h3 className="text-lg font-semibold text-champagne">{d.title}</h3>
                <p className="mt-2 text-ash">{d.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaBand calendly={site.contact.calendly} whatsapp={site.contact.whatsapp} />
    </>
  );
}
