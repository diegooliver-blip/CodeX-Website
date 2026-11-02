import { Bot, ChartColumn, Mail, Sparkles, Timer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PanelShell } from "@/components/clientes/PortalShell";
import { InterestButton } from "@/components/clientes/PortalActions";
import { ServiceIcon } from "@/components/icons";
import { getOverview } from "@/lib/clientes-api";
import { combosFor, offers, serviceBySlug, servicesToDiscover } from "@/lib/portal-offers";

export const metadata: Metadata = { title: "Descubrir" };

const SKILL_ICONS = { spark: Sparkles, mail: Mail, chart: ChartColumn, bot: Bot } as const;

export default function DiscoverPage() {
  return (
    <Suspense fallback={<PanelShell eyebrow="Descubrir" title="Cargando…"><div className="h-96 animate-pulse rounded-[28px] bg-mist" /></PanelShell>}>
      <Discover />
    </Suspense>
  );
}

async function Discover() {
  const res = await getOverview();
  if (!res.ok && res.status === 401) redirect("/clientes/entrar?next=/clientes/panel/descubrir");
  const owned = res.ok ? res.data.contratados : [];
  const combos = combosFor(owned);
  const discover = servicesToDiscover(owned);

  return (
    <PanelShell eyebrow="Descubrir" title="Lo siguiente para tu negocio.">
      {combos.length > 0 && (
        <section id="combos" aria-labelledby="combos-title" className="scroll-mt-32">
          <h2 id="combos-title" className="display text-3xl">Combos</h2>
          <p className="mt-2 text-slate">Precio especial al contratarlos juntos.</p>
          <ul className="mt-6 grid gap-5 lg:grid-cols-3">
            {combos.map((c) => (
              <li key={c.slug} className="flex flex-col justify-between gap-8 rounded-[28px] border border-line p-7">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    {"badge" in c && c.badge ? <span className="rounded-full bg-spark px-3 py-1 text-xs font-semibold">{c.badge}</span> : <span />}
                    {c.owned > 0 && <span className="text-xs text-slate">Tienes {c.owned} de {c.services.length}</span>}
                  </div>
                  <p className="display mt-5 text-2xl">{c.name}</p>
                  <p className="mt-2 text-slate">{c.pitch}</p>
                  <ul className="mt-6 space-y-3">
                    {c.services.map((slug) => {
                      const s = serviceBySlug(slug);
                      const has = owned.includes(slug);
                      return (
                        <li key={slug} className="flex items-center gap-3">
                          <span className={`grid size-9 place-items-center rounded-full ${has ? "bg-navy text-paper" : "bg-mist text-navy"}`}>
                            <ServiceIcon name={s?.icon ?? "compass"} className="size-4" />
                          </span>
                          <span className={has ? "text-slate line-through decoration-1" : "font-semibold"}>{s?.label ?? slug}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <InterestButton tipo="combo" slug={c.slug} label="Cotizar combo" className="btn btn-primary min-h-11 px-5 text-sm" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="skills" className="mt-16">
        <h2 id="skills" className="display text-3xl">Skills para tu equipo</h2>
        <p className="mt-2 text-slate">Talleres en línea cortos. Resultado el mismo día.</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {offers.skills.map((k) => {
            const Icon = SKILL_ICONS[k.icon as keyof typeof SKILL_ICONS] ?? Sparkles;
            return (
              <li key={k.slug} className="flex flex-col justify-between gap-6 rounded-[24px] bg-mist-2 p-6">
                <div>
                  <div className="flex items-center justify-between">
                    <Icon aria-hidden className="size-6 text-navy" strokeWidth={1.6} />
                    <span className="flex items-center gap-1 text-xs text-slate">
                      <Timer aria-hidden className="size-3.5" />
                      {k.minutes} min
                    </span>
                  </div>
                  <p className="display mt-5 text-xl">{k.name}</p>
                  <p className="mt-1 text-sm text-slate">{k.gain}</p>
                </div>
                <InterestButton tipo="skill" slug={k.slug} label="Lo quiero" />
              </li>
            );
          })}
        </ul>
      </section>

      {discover.length > 0 && (
        <section aria-labelledby="servicios" className="mt-16">
          <h2 id="servicios" className="display text-3xl">Más servicios</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {discover.map((s) => (
              <li key={s.slug} className="flex flex-col justify-between gap-6 rounded-[24px] border border-line p-6">
                <div>
                  <ServiceIcon name={s.icon} className="size-7 text-navy" />
                  <p className="display mt-5 text-xl">{s.title}</p>
                  <p className="mt-1 text-sm text-slate">{s.short}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <InterestButton tipo="servicio" slug={s.slug} />
                  <Link href={`/servicios/${s.slug}`} className="link-underline text-sm">
                    Ver detalle
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PanelShell>
  );
}
