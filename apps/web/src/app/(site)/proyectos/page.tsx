import type { Metadata } from "next";
import { CtaBand, PageHero } from "@/components/PageHero";
import { ProjectExplorer } from "@/components/ProjectExplorer";
import { ProjectPlate } from "@/components/ProjectPlate";
import { projectCategories, projects, site } from "@/lib/content";

export const metadata: Metadata = {
  title: "Proyectos",
  description: "Agentes de IA, plataformas, tiendas en línea, e-learning y simulación energética que hemos construido, presentados sin nombres de clientes.",
  alternates: { canonical: "/proyectos" },
};

export default function ProjectsPage() {
  return (
    <>
      <PageHero
        title="Lo que hemos construido."
        lede={`${projects.length} sistemas entre producción, despliegue y prototipo funcional. Sin nombres ni marcas de clientes: solo el problema, la solución y los datos del sistema.`}
      />
      <section className="mx-auto max-w-[1440px] px-5 pb-28 md:px-10" aria-labelledby="portafolio">
        <h2 id="portafolio" className="sr-only">Portafolio</h2>
        <ProjectExplorer
          categories={projectCategories}
          plates={projects.map((p) => ({ slug: p.slug, category: p.category, node: <ProjectPlate project={p} /> }))}
        />
      </section>
      <CtaBand calendly={site.contact.calendly} whatsapp={site.contact.whatsapp} title="Tu proyecto puede ser el siguiente." />
    </>
  );
}
