import { CircleAlert, CircleCheck, Clock } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Bars, SplitMeter } from "@/components/clientes/Charts";
import { PanelShell } from "@/components/clientes/PortalShell";
import { InvoiceButton, PayButton, SimulatedPayment } from "@/components/clientes/PortalActions";
import { getPayments, type Charge } from "@/lib/clientes-api";
import { daysUntil, fmtDay, fmtMoney, fmtMonth } from "@/lib/clientes-format";
import { site } from "@/lib/content";

export const metadata: Metadata = { title: "Pagos" };

export default function PaymentsPage({ searchParams }: { searchParams: Promise<{ pago?: string }> }) {
  return (
    <Suspense fallback={<PanelShell eyebrow="Pagos" title="Cargando…"><div className="h-96 animate-pulse rounded-[28px] bg-mist" /></PanelShell>}>
      <Payments searchParams={searchParams} />
    </Suspense>
  );
}

async function Payments({ searchParams }: { searchParams: Promise<{ pago?: string }> }) {
  const [res, { pago }] = await Promise.all([getPayments(), searchParams]);
  if (!res.ok && res.status === 401) redirect("/clientes/entrar?next=/clientes/panel/pagos");
  if (!res.ok) {
    return (
      <PanelShell eyebrow="Pagos" title="El portal no responde.">
        <p className="text-slate">Intenta de nuevo en unos minutos.</p>
      </PanelShell>
    );
  }
  const p = res.data;
  const pending = p.cargos.filter((c) => c.estado === "pendiente");
  const paid = p.cargos.filter((c) => c.estado === "pagado");
  const paidYear = p.historial.reduce((a, m) => a + m.pagado_centavos, 0);
  const total = pending.reduce((a, c) => a + c.monto_centavos, 0);
  const returned = !!pago && /^[0-9a-f-]{36}$/.test(pago);
  const simulated = returned && p.pasarela === "mock" && pending.length > 0;

  return (
    <PanelShell eyebrow="Pagos" title={total ? fmtMoney(total) : "Estás al corriente."} lede={total ? "pendiente de pago" : undefined}>
      {simulated && (
        <div className="mb-10">
          <SimulatedPayment pagoId={pago!} />
        </div>
      )}
      {returned && p.pasarela === "mercadopago" && (
        <p role="status" className="mb-10 flex items-center gap-2 rounded-2xl bg-mist-2 px-5 py-4 text-sm">
          <Clock aria-hidden className="size-4" /> Recibimos tu pago. Mercado Pago lo confirma en unos minutos.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <section aria-labelledby="balance" className="rounded-[28px] border border-line p-7">
          <h2 id="balance" className="text-sm text-slate">Últimos 12 meses</h2>
          <p className="display mt-3 text-4xl">{fmtMoney(paidYear)}</p>
          <p className="text-sm text-slate">pagado</p>
          <div className="mt-8">
            <SplitMeter
              label="Pagado, pendiente y vencido"
              parts={[
                { name: "Pagado", value: paidYear, className: "bg-navy" },
                { name: "Pendiente", value: p.pendiente_centavos - p.vencido_centavos, className: "bg-signal" },
                { name: "Vencido", value: p.vencido_centavos, className: "bg-ember" },
              ]}
            />
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Legend swatch="bg-navy" label="Pagado" value={fmtMoney(paidYear)} />
              <Legend swatch="bg-signal" label="Pendiente" value={fmtMoney(p.pendiente_centavos - p.vencido_centavos)} />
              {p.vencido_centavos > 0 && <Legend swatch="bg-ember" label="Vencido" value={fmtMoney(p.vencido_centavos)} />}
            </ul>
          </div>
        </section>
        <section aria-labelledby="historial" className="rounded-[28px] border border-line p-7">
          <h2 id="historial" className="text-sm text-slate">Pagado por mes</h2>
          <div className="mt-6">
            <Bars
              title="Pagado por mes, últimos 12 meses"
              data={p.historial.map((m, i) => ({
                key: m.mes,
                label: fmtMonth(m.mes, "short"),
                value: m.pagado_centavos,
                display: fmtMoney(m.pagado_centavos),
                highlight: i === p.historial.length - 1,
              }))}
            />
          </div>
        </section>
      </div>

      <section aria-labelledby="pendientes" className="mt-14">
        <h2 id="pendientes" className="display text-3xl">Por pagar</h2>
        {pending.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-slate">
            <CircleCheck aria-hidden className="size-5 text-navy" /> Nada pendiente.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {pending.map((c) => (
              <ChargeCard key={c.id} c={c} online={p.pago_en_linea} />
            ))}
          </ul>
        )}
        {pending.length > 0 && !p.pago_en_linea && (
          <p className="mt-6 text-sm text-slate">
            El pago en línea se activa pronto. Mientras tanto,{" "}
            <a href={site.contact.whatsapp} className="link-underline text-navy" target="_blank" rel="noopener">
              pídenos los datos de transferencia
            </a>
            .
          </p>
        )}
      </section>

      {paid.length > 0 && (
        <section aria-labelledby="pagados" className="mt-14">
          <h2 id="pagados" className="display text-3xl">Pagados</h2>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {paid.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <span>
                  <span className="block font-semibold">{c.concepto}</span>
                  <span className="text-sm text-slate">
                    {c.servicio ? `${c.servicio}, ` : ""}
                    {c.pagado_en ? `pagado ${fmtDay(c.pagado_en, { day: "numeric", month: "short", year: "numeric" })}` : "pagado"}
                  </span>
                </span>
                <span className="flex items-center gap-5">
                  {c.tiene_factura && <InvoiceButton chargeId={c.id} />}
                  <span className="display text-xl">{fmtMoney(c.monto_centavos, c.moneda)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PanelShell>
  );
}

function Legend({ swatch, label, value }: { swatch: string; label: string; value: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className={`size-2.5 rounded-full ${swatch}`} />
      <span className="text-slate">{label}</span>
      <span className="font-semibold">{value}</span>
    </li>
  );
}

function ChargeCard({ c, online }: { c: Charge; online: boolean }) {
  const days = c.vence_en ? daysUntil(c.vence_en) : null;
  const status = c.vencido
    ? { icon: <CircleAlert aria-hidden className="size-4" />, text: `Vencido hace ${Math.abs(days ?? 0)} ${Math.abs(days ?? 0) === 1 ? "día" : "días"}`, cls: "text-danger" }
    : days !== null
      ? { icon: <Clock aria-hidden className="size-4" />, text: days === 0 ? "Vence hoy" : `Vence en ${days} ${days === 1 ? "día" : "días"}`, cls: "text-slate" }
      : { icon: <Clock aria-hidden className="size-4" />, text: "Sin fecha límite", cls: "text-slate" };
  return (
    <li className={`flex flex-col justify-between gap-6 rounded-[24px] border p-6 ${c.vencido ? "border-ember/60 bg-ember/5" : "border-line"}`}>
      <div>
        <p className={`flex items-center gap-2 text-sm font-semibold ${status.cls}`}>
          {status.icon}
          {status.text}
        </p>
        <p className="mt-3 font-semibold">{c.concepto}</p>
        {c.servicio && <p className="text-sm text-slate">{c.servicio}</p>}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <span className="display text-3xl">{fmtMoney(c.monto_centavos, c.moneda)}</span>
        {online && <PayButton chargeId={c.id} />}
      </div>
    </li>
  );
}
