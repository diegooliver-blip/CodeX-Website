import type { Metadata } from "next";
import { LeadForm } from "@/components/LeadForm";
import { PageHero } from "@/components/PageHero";
import { services, site } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Agenda una consultoría gratuita de 30 minutos o cuéntanos tu proyecto.",
  alternates: { canonical: "/contacto" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Cuéntanos qué quieres resolver."
        lede="Respondemos en menos de un día hábil. Si prefieres hablar, agenda 30 minutos sin costo."
      />
      <section className="mx-auto grid max-w-[1440px] gap-16 px-5 pb-28 md:px-10 lg:grid-cols-[1.4fr_1fr]">
        <LeadForm services={services.map((s) => ({ value: s.slug, label: s.title }))} />
        <aside className="space-y-10 lg:border-l lg:border-line lg:pl-12">
          <div>
            <h2 className="text-navy">Consultoría gratuita</h2>
            <p className="mt-3 text-slate">Treinta minutos para entender tu operación y decirte con honestidad qué haríamos.</p>
            <a href={site.contact.calendly} target="_blank" rel="noopener" className="btn btn-primary mt-5">Elegir horario</a>
          </div>
          <div>
            <h2 className="text-navy">Directo</h2>
            <ul className="mt-3 space-y-2">
              <li><a className="link-underline" href={site.contact.whatsapp} target="_blank" rel="noopener">WhatsApp {site.contact.phone}</a></li>
              <li><a className="link-underline" href={site.contact.phoneHref}>Llamar al {site.contact.phone}</a></li>
              <li><a className="link-underline" href={`mailto:${site.contact.email}`}>{site.contact.email}</a></li>
            </ul>
          </div>
          <p className="text-[0.9rem] text-slate">{site.location}.</p>
        </aside>
      </section>
    </>
  );
}
