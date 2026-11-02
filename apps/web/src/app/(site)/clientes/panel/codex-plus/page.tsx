import { CalendarCheck, Compass, FileText, MessageCircle, Sparkles, Video } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PanelShell } from "@/components/clientes/PortalShell";
import { MembershipControls, SubscribeButton } from "@/components/clientes/PortalActions";
import { getMembership } from "@/lib/clientes-api";
import { fmtDay, fmtMoney } from "@/lib/clientes-format";
import { site } from "@/lib/content";
import { offers } from "@/lib/portal-offers";

export const metadata: Metadata = { title: "CODEX+" };

const ICONS = { video: Video, compass: Compass, quote: FileText, chat: MessageCircle } as const;

export default function CodexPlusPage() {
  return (
    <Suspense fallback={<PanelShell eyebrow="Membresía" title="CODEX+"><div className="h-96 animate-pulse rounded-[28px] bg-mist" /></PanelShell>}>
      <CodexPlus />
    </Suspense>
  );
}

async function CodexPlus() {
  const res = await getMembership();
  if (!res.ok && res.status === 401) redirect("/clientes/entrar?next=/clientes/panel/codex-plus");
  if (!res.ok) {
    return (
      <PanelShell eyebrow="Membresía" title="El portal no responde.">
        <p className="text-slate">Intenta de nuevo en unos minutos.</p>
      </PanelShell>
    );
  }
  const m = res.data;
  const plan = offers.membership;
  const active = m.estado === "activa";
  const pending = m.estado === "pendiente";

  return (
    <PanelShell eyebrow="Membresía" title={plan.name} lede={plan.pitch}>
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <ul className="grid gap-4 sm:grid-cols-2">
          {plan.perks.map((p) => {
            const Icon = ICONS[p.icon as keyof typeof ICONS] ?? Sparkles;
            return (
              <li key={p.title} className={`rounded-[24px] border p-6 ${active ? "border-spark bg-spark/20" : "border-line"}`}>
                <Icon aria-hidden className="size-6 text-navy" strokeWidth={1.6} />
                <p className="display mt-5 text-xl">{p.title}</p>
                <p className="mt-1 text-sm text-slate">{p.text}</p>
              </li>
            );
          })}
        </ul>

        <aside className="relative overflow-hidden rounded-[28px] bg-navy p-8 text-paper" aria-labelledby="plan">
          <span aria-hidden className="absolute -right-20 -top-20 size-64 rounded-full bg-signal/40 blur-3xl" />
          <p id="plan" className="flex items-center gap-2 text-sm text-paper/75">
            <Sparkles aria-hidden className="size-4 text-spark" />
            {active ? "Tu membresía" : "Mensual, cancela cuando quieras"}
          </p>
          <p className="display mt-6 text-6xl text-spark">
            {fmtMoney(m.monto_centavos, m.moneda)}
            <span className="text-lg text-paper/70"> / {plan.period}</span>
          </p>

          {active ? (
            <dl className="mt-8 grid grid-cols-2 gap-6 text-sm">
              <div>
                <dt className="text-paper/70">Activa desde</dt>
                <dd className="display mt-1 text-xl">{m.activa_desde ? fmtDay(m.activa_desde, { day: "numeric", month: "short", year: "numeric" }) : "—"}</dd>
              </div>
              <div>
                <dt className="text-paper/70">Próximo cobro</dt>
                <dd className="display mt-1 text-xl">{m.proximo_cobro ? fmtDay(m.proximo_cobro) : "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-6 text-paper/80">{pending ? "Tu suscripción espera la confirmación del pago." : m.estado === "pausada" ? "Tu membresía está pausada." : "Se cobra cada mes con tu tarjeta en Mercado Pago."}</p>
          )}

          <div className="mt-8 flex flex-col items-start gap-4">
            {active ? (
              <a href={site.contact.calendly} target="_blank" rel="noopener" className="btn btn-primary min-h-12 gap-2 px-6">
                <CalendarCheck aria-hidden className="size-5" />
                Agendar mi asesoría
              </a>
            ) : m.pago_en_linea ? (
              !(pending && m.pasarela === "mock") && (
                <SubscribeButton label={pending ? "Reintentar el pago" : m.estado === "cancelada" ? "Reactivar CODEX+" : "Activar CODEX+"} />
              )
            ) : (
              <a href={site.contact.whatsapp} target="_blank" rel="noopener" className="btn btn-primary min-h-12 px-6">
                Quiero CODEX+
              </a>
            )}
            <div className="theme-dark">
              <MembershipControls estado={m.estado} simulated={m.pasarela === "mock"} />
            </div>
          </div>
        </aside>
      </div>
    </PanelShell>
  );
}
