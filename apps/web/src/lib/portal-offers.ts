import offersJson from "@content/portal-offers.json";
import { services, type Service } from "./content";

/** Catalog for the client panel (content/portal-offers.json): CODEX+, service combos and short skills. */
export const offers = offersJson;
export type Combo = (typeof offersJson.combos)[number];
export type Skill = (typeof offersJson.skills)[number];

export const serviceBySlug = (slug: string) => services.find((s) => s.slug === slug);

/** Services the client doesn't have yet, most related first (same group as something they already use). */
export function servicesToDiscover(owned: string[]): Service[] {
  const groups = new Set(owned.map((slug) => serviceBySlug(slug)?.group).filter(Boolean));
  return services
    .filter((s) => !owned.includes(s.slug))
    .sort((a, b) => Number(groups.has(b.group)) - Number(groups.has(a.group)));
}

/** Combos ranked by how many of their pieces the client already has (one owned piece = easiest upgrade). */
export function combosFor(owned: string[]): (Combo & { owned: number })[] {
  return offers.combos
    .map((c) => ({ ...c, owned: c.services.filter((s) => owned.includes(s)).length }))
    .filter((c) => c.owned < c.services.length)
    .sort((a, b) => b.owned - a.owned);
}
