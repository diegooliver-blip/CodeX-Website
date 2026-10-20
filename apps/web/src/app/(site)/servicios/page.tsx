import type { Metadata } from "next";
import Link from "next/link";
import { ServiceIcon } from "@/components/icons";
import { CtaBand, PageHero } from "@/components/PageHero";
import { projectsForService, serviceGroups, site } from "@/lib/content";

export const metadata: Metadata = {
  title: "Servicios",
  description: "Agentes de IA, websites, tiendas en línea, apps, campañas, automatización, dashboards, simulación energética y más.",
  alternates: { canonical: "/servicios" },
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        title="Doce disciplinas, un solo equipo."
        lede="Del agente que responde en WhatsApp a la simulación eléctrica de una planta: lo diseñamos, lo construimos y lo dejamos operando."
      />
      <div className="mx-auto max-w-[1440px] px-5 pb-28 md:px-10">
        {serviceGroups.map((g) => (
          <section key={g.group} className="border-t border-line py-14" aria-labelledby={`g-${g.group}`}>
            <h2 id={`g-${g.group}`} className="text-navy">{g.group}</h2>
            <div className="mt-8 grid gap-x-12 gap-y-14 lg:grid-cols-2">
              {g.items.map((s) => {
                const count = projectsForService(s.slug).length;
                return (
                  <Link key={s.slug} href={`/servicios/${s.slug}`} className="group block">
                    <ServiceIcon name={s.icon} className="size-7 text-navy" />
                    <h3 className="display mt-5 text-[clamp(2rem,3vw,2.75rem)] leading-[1.04] group-hover:text-navy">{s.title}</h3>
                    <p className="mt-4 max-w-xl text-slate">{s.description}</p>
                    <p className="mt-5 text-[0.9rem] text-navy">
                      {count > 0 ? `${count} ${count === 1 ? "proyecto" : "proyectos"} construidos` : "Conoce el servicio"}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <CtaBand calendly={site.contact.calendly} whatsapp={site.contact.whatsapp} />
    </>
  );
}
