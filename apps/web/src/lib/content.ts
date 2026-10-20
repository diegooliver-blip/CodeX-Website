import casesJson from "@content/cases.json";
import projectsJson from "@content/projects.json";
import servicesJson from "@content/services.json";
import siteJson from "@content/site.json";

export type Service = {
  slug: string;
  title: string;
  label: string;
  short: string;
  icon: string;
  group: string;
  description: string;
  capabilities: string[];
  deliverables: string[];
  stack: string[];
};

export type Project = {
  slug: string;
  title: string;
  category: string;
  sector: string;
  summary: string;
  challenge: string;
  solution: string;
  features: string[];
  stack: string[];
  facts: { value: string; label: string }[];
  services: string[];
  status: string;
  cover: string;
};

export type Case = { slug: string; sector: string; title: string; text: string; tags: string[] };

export const site = siteJson;
export const services = servicesJson as Service[];
export const projects = projectsJson as Project[];
export const cases = casesJson as Case[];

export const serviceGroups = [...new Set(services.map((s) => s.group))].map((group) => ({
  group,
  items: services.filter((s) => s.group === group),
}));

export const projectCategories = [...new Set(projects.map((p) => p.category))];

export const getService = (slug: string) => services.find((s) => s.slug === slug);
export const getProject = (slug: string) => projects.find((p) => p.slug === slug);

export const projectsForService = (slug: string) => projects.filter((p) => p.services.includes(slug));

/** Home selection: breadth across categories, and never two projects from the same client side by side. */
export const featuredProjects = [
  "orquestador-whatsapp",
  "pos-multisucursal",
  "simulacion-energetica",
  "agencia-50-agentes",
  "ecosistema-dtc",
  "tutor-posgrado",
].map((slug) => getProject(slug)!);

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? site.domain;

// Projects built for the same client. They are never cross-linked, so the
// combination of details can't point to who the client is.
const sameClient = [
  ["pos-multisucursal", "kiosko-3d", "catalogacion-fotografica"],
  ["ecosistema-dtc", "oficina-virtual"],
  ["tienda-coleccionables", "agencia-50-agentes"],
];

export function relatedProjects(project: Project, limit = 3) {
  const blocked = new Set(sameClient.find((g) => g.includes(project.slug)) ?? [project.slug]);
  return projects
    .filter((p) => !blocked.has(p.slug) && p.services.some((s) => project.services.includes(s)))
    .slice(0, limit);
}

/** Capability graph for the hero: an edge wherever a real project combined two services. */
export function capabilityGraph() {
  const index = new Map(services.map((s, i) => [s.slug, i]));
  const weights = new Map<string, number>();
  for (const p of projects) {
    const ids = p.services.map((s) => index.get(s)).filter((i): i is number => i !== undefined);
    for (let a = 0; a < ids.length; a++)
      for (let b = a + 1; b < ids.length; b++) {
        const key = [ids[a], ids[b]].sort((x, y) => x - y).join("-");
        weights.set(key, (weights.get(key) ?? 0) + 1);
      }
  }
  const edges = [...weights].map(([key, w]) => {
    const [a, b] = key.split("-").map(Number);
    return [a, b, w] as [number, number, number];
  });
  return { nodes: services.map((s) => ({ slug: s.slug, title: s.label })), edges };
}
