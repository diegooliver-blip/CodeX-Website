import type { MetadataRoute } from "next";
import { getCourses } from "@/lib/api";
import { projects, services, siteUrl } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/servicios", "/proyectos", "/experiencia", "/academia", "/contacto"];
  const courses = await getCourses();
  return [
    ...pages.map((p) => ({ url: `${siteUrl}${p}`, changeFrequency: "weekly" as const, priority: p ? 0.8 : 1 })),
    ...services.map((s) => ({ url: `${siteUrl}/servicios/${s.slug}`, priority: 0.8 })),
    ...projects.map((p) => ({ url: `${siteUrl}/proyectos/${p.slug}`, priority: 0.6 })),
    ...courses.map((c) => ({ url: `${siteUrl}/academia/${c.slug}`, priority: 0.7 })),
  ];
}
