import { ArrowUpRight, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LogoutButton } from "@/components/clientes/AuthForms";
import { Ring } from "@/components/clientes/Charts";
import { PanelShell } from "@/components/clientes/PortalShell";
import { StageTimeline, StatusPill, stageLabel } from "@/components/clientes/ServiceViews";
import { ServiceIcon } from "@/components/icons";
import { getMe, getOverview, type Overview, type ServiceCard } from "@/lib/clientes-api";
import { daysUntil, fmtDay, fmtMoney } from "@/lib/clientes-format";
import { site } from "@/lib/content";
import { combosFor, offers, serviceBySlug, servicesToDiscover } from "@/lib/portal-offers";

export const metadata: Metadata = { title: "Mi panel" };

export default function PanelPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Panel />
    </Suspense>
  );
}

async function Panel() {
  const [me, overview] = await Promise.all([getMe(), getOverview()]);
  if (!me.ok && me.status === 401) redirect("/clientes/entrar?next=/clientes/panel");
  if (!me.ok || !overview.ok) return <Unavailable />;
  const o = overview.data;
  const name = me.data.nombre.split(" ")[0];

  return (
    <PanelShell eyebrow={me.data.cliente} title={name ? `Hola, ${name}.` : "Hola."} actions={<LogoutButton />}>
      {me.data.es_demo && (
        <p className="mb-8 rounded-2xl border border-spark bg-spark/30 px-5 py-3 text-sm">Cuenta de demostración: los datos son de ejemplo.</p>
      )}

      <Kpis o={o} />

      <section aria-labelledby="servicios" className="mt-14">
        <h2 id="servicios" className="display text-3xl">Tus servicios</h2>
        {o.servicios.length === 0 ? (
          <div className="mt-6 rounded-[28px] border border-line bg-mist-2 p-10">
            <p className="display text-2xl">Tu proyecto está por arrancar.</p>
            <p className="mt-3 text-slate">Aquí verás cada etapa en cuanto empecemos.</p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-5 lg:grid-cols-2">
            {o.servicios.map((s) => (
              <li key={s.id}>
                <ServiceTile s={s} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ForYou o={o} />
    </PanelShell>
  );
}

function Kpis({ o }: { o: Overview }) {
  const building = o.servicios.filter((s) => s.etapa !== "operacion").length;
  const due = o.proximo_vencimiento ? daysUntil(o.proximo_vencimiento) : null;
  const member = o.membresia.estado === "activa";
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen">
      <Tile icon={<LayoutIcon />} label="Servicios" value={String(o.servicios.length)} foot={building ? `${building} en construcción` : "Todos en operación"} />
      <Tile
        icon={<Wallet aria-hidden className="size-5" />}
        label="Por pagar"
        value={fmtMoney(o.pendiente_centavos)}
        tone={o.vencido_centavos ? "alert" : undefined}
        foot={
          o.vencido_centavos
            ? `${fmtMoney(o.vencido_centavos)} vencido`
            : due !== null
              ? due === 0
                ? "Vence hoy"
                : `Vence en ${due} ${due === 1 ? "día" : "días"}`
              : "Estás al corriente"
        }
        href={o.pendiente_centavos ? "/clientes/panel/pagos" : undefined}
      />
      <Tile
        icon={<ShieldCheck aria-hidden className="size-5" />}
        label="Disponibilidad 30 días"
        value={o.disponibilidad_30d !== null ? `${o.disponibilidad_30d}%` : "—"}
        foot={o.disponibilidad_30d !== null ? "Monitoreo cada minuto" : "Inicia al salir a producción"}
      />
      <Tile
        icon={<Sparkles aria-hidden className="size-5" />}
        label="CODEX+"
        value={member ? "Activa" : fmtMoney(o.membresia.monto_centavos)}
        foot={member ? (o.membresia.proximo_cobro ? `Renueva ${fmtDay(o.membresia.proximo_cobro)}` : "Asesoría semanal incluida") : "al mes, asesoría semanal"}
        href="/clientes/panel/codex-plus"
        tone={member ? "member" : undefined}
      />
    </ul>
  );
}

const LayoutIcon = () => <ServiceIcon name="layout-dashboard" className="size-5" />;

function Tile({ icon, label, value, foot, href, tone }: { icon: React.ReactNode; label: string; value: string; foot: string; href?: string; tone?: "alert" | "member" }) {
  const body = (
    <>
      <span className="flex items-center justify-between text-sm text-slate">
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
        {href && <ArrowUpRight aria-hidden className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />}
      </span>
      <span className="display mt-5 block text-[2.4rem] leading-none">{value}</span>
      <span className={`mt-3 block text-sm ${tone === "alert" ? "font-semibold text-danger" : "text-slate"}`}>{foot}</span>
    </>
  );
  const cls = `group block h-full rounded-[24px] border p-6 transition-colors ${
    tone === "member" ? "border-spark bg-spark/25" : tone === "alert" ? "border-ember/60 bg-ember/5" : "border-line bg-paper"
  } ${href ? "hover:border-navy" : ""}`;
  return <li>{href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>}</li>;
}

function ServiceTile({ s }: { s: ServiceCard }) {
  const building = s.etapa !== "operacion";
  const svc = serviceBySlug(s.servicio_slug);
  return (
    <Link
      href={`/clientes/panel/servicios/${s.id}`}
      className="group flex h-full flex-col gap-6 rounded-[28px] border border-line bg-paper p-7 transition-[border-color,translate,box-shadow] duration-500 hover:-translate-y-1 hover:border-navy hover:shadow-[0_30px_60px_-35px_rgba(3,20,79,0.45)]"
    >
      <div className="flex items-start gap-5">
        <Ring value={s.avance} size={96} label={`Avance de ${s.nombre}`} tone={building ? "signal" : "navy"} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${building ? "bg-signal/15 text-navy" : "bg-navy text-paper"}`}>{stageLabel(s.etapa)}</span>
            <StatusPill estado={s.estado} />
          </div>
          <h3 className="display mt-3 text-[1.6rem] leading-[1.1] group-hover:text-navy">{s.nombre}</h3>
          {svc && <p className="mt-1 text-sm text-slate">{svc.label ?? svc.title}</p>}
        </div>
      </div>
      {building ? (
        <StageTimeline etapa={s.etapa} />
      ) : (
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate">Disponibilidad 30 d</dt>
            <dd className="display text-2xl">{s.estado.disponibilidad_30d !== null ? `${s.estado.disponibilidad_30d}%` : "—"}</dd>
          </div>
          <div>
            <dt className="text-slate">Respuesta</dt>
            <dd className="display text-2xl">{s.estado.latencia_ms !== null ? `${s.estado.latencia_ms} ms` : "—"}</dd>
          </div>
        </dl>
      )}
      {s.ultimo_avance && (
        <p className="mt-auto border-t border-line pt-4 text-sm text-slate">
          <span className="font-semibold text-ink">{s.ultimo_avance.titulo}</span> {fmtDay(s.ultimo_avance.publicado_en)}
        </p>
      )}
    </Link>
  );
}

/** One quiet suggestion per slot, based on what the client doesn't have yet. */
function ForYou({ o }: { o: Overview }) {
  const combo = combosFor(o.contratados)[0];
  const next = servicesToDiscover(o.contratados)[0];
  const member = o.membresia.estado === "activa";
  if (!combo && !next && member) return null;
  return (
    <section aria-labelledby="para-ti" className="mt-16">
      <h2 id="para-ti" className="display text-3xl">Para tu siguiente paso</h2>
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {!member && (
          <Link href="/clientes/panel/codex-plus" className="group relative overflow-hidden rounded-[28px] bg-navy p-7 text-paper">
            <span aria-hidden className="absolute -right-16 -top-16 size-48 rounded-full bg-signal/40 blur-2xl" />
            <Sparkles aria-hidden className="size-6 text-spark" />
            <p className="display mt-6 text-2xl">{offers.membership.name}</p>
            <p className="mt-2 text-paper/80">{offers.membership.pitch}</p>
            <p className="display mt-6 text-3xl text-spark">
              {fmtMoney(offers.membership.priceMxn * 100)}
              <span className="text-base text-paper/70"> / {offers.membership.period}</span>
            </p>
          </Link>
        )}
        {combo && (
          <Link href="/clientes/panel/descubrir#combos" className="group rounded-[28px] border border-line p-7 hover:border-navy">
            <p className="text-sm text-slate">Combo{combo.owned ? `, ya tienes ${combo.owned} de ${combo.services.length}` : ""}</p>
            <p className="display mt-3 text-2xl group-hover:text-navy">{combo.name}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {combo.services.map((slug) => (
                <li key={slug} className={`rounded-full px-3 py-1 text-xs font-semibold ${o.contratados.includes(slug) ? "bg-navy text-paper" : "bg-mist text-navy"}`}>
                  {serviceBySlug(slug)?.label ?? slug}
                </li>
              ))}
            </ul>
          </Link>
        )}
        {next && (
          <Link href="/clientes/panel/descubrir" className="group rounded-[28px] border border-line p-7 hover:border-navy">
            <ServiceIcon name={next.icon} className="size-7 text-navy" />
            <p className="display mt-6 text-2xl group-hover:text-navy">{next.title}</p>
            <p className="mt-2 text-slate">{next.short}</p>
          </Link>
        )}
      </div>
    </section>
  );
}

function Unavailable() {
  return (
    <PanelShell eyebrow="Portal de clientes" title="El portal no responde." nav={false}>
      <p className="max-w-xl text-slate">
        Intenta de nuevo en unos minutos o{" "}
        <a href={site.contact.whatsapp} className="link-underline text-navy" target="_blank" rel="noopener">
          escríbenos por WhatsApp
        </a>
        .
      </p>
    </PanelShell>
  );
}

function PanelSkeleton() {
  return (
    <PanelShell eyebrow="Portal de clientes" title="Cargando tu panel…">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-[24px] bg-mist" />
        ))}
      </div>
      <div className="mt-14 grid gap-5 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-[28px] bg-mist" />
        ))}
      </div>
    </PanelShell>
  );
}
