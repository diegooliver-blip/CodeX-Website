import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { DownloadButton } from "@/components/clientes/AuthForms";
import { Bars } from "@/components/clientes/Charts";
import { SettingsForm } from "@/components/clientes/PortalActions";
import { PanelShell } from "@/components/clientes/PortalShell";
import { fmtDate, Progress, StageTimeline, StatusPill, stageLabel } from "@/components/clientes/ServiceViews";
import { getMetrics, getService, getServiceSettings, type MetricSeries } from "@/lib/clientes-api";
import { fmtCompact, fmtDay } from "@/lib/clientes-format";

export const metadata: Metadata = { title: "Detalle del servicio" };

const fmtSize = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n >= 1e3 ? `${Math.round(n / 1e3)} KB` : n ? `${n} B` : "");

export default function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PanelShell eyebrow="Servicio" title="Cargando…"><div className="h-96 animate-pulse rounded-[28px] bg-mist" /></PanelShell>}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [res, metrics, settings] = await Promise.all([getService(id), getMetrics(id), getServiceSettings(id)]);
  if (!res.ok && res.status === 401) redirect(`/clientes/entrar?next=/clientes/panel/servicios/${id}`);
  if (!res.ok && (res.status === 404 || res.status === 422)) notFound();
  if (!res.ok) {
    return (
      <PanelShell eyebrow="Servicio" title="El portal no responde." back={{ href: "/clientes/panel", label: "Mi panel" }}>
        <p className="text-slate">Intenta de nuevo en unos minutos.</p>
      </PanelShell>
    );
  }
  const s = res.data;
  const u = s.estado;

  return (
    <PanelShell
      eyebrow={stageLabel(s.etapa)}
      title={s.nombre}
      lede={s.descripcion || undefined}
      back={{ href: "/clientes/panel", label: "Mi panel" }}
      actions={<StatusPill estado={u} />}
    >
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-10">
          <section className="rounded-[28px] border border-line p-7 md:p-8" aria-labelledby="etapa">
            <h2 id="etapa" className="display text-2xl">Etapa del proyecto</h2>
            <div className="mt-6 space-y-6">
              <StageTimeline etapa={s.etapa} />
              <Progress value={s.avance} label="Avance general" />
              {s.fecha_estimada && <p className="text-sm text-slate">Entrega estimada: {fmtDate(s.fecha_estimada)}</p>}
            </div>
          </section>

          {metrics.ok && metrics.data.length > 0 && <Metrics series={metrics.data} />}

          <section aria-labelledby="bitacora">
            <h2 id="bitacora" className="display text-2xl">Bitácora de avances</h2>
            {s.avances.length === 0 ? (
              <p className="mt-4 text-slate">Aún no hay avances publicados.</p>
            ) : (
              <ol className="mt-6 border-l-2 border-mist pl-6">
                {s.avances.map((a) => (
                  <li key={a.id} className="relative pb-8 last:pb-0">
                    <span aria-hidden className="absolute -left-[1.95rem] top-1.5 size-3 rounded-full border-2 border-paper bg-navy" />
                    <time className="text-xs text-slate" dateTime={a.publicado_en}>{fmtDate(a.publicado_en)}</time>
                    <h3 className="mt-1 font-semibold">{a.titulo}</h3>
                    {a.cuerpo && <p className="mt-2 whitespace-pre-line text-[0.95rem] text-slate">{a.cuerpo}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-10">
          <section className="rounded-[28px] bg-navy p-7 text-paper md:p-8" aria-labelledby="operacion">
            <h2 id="operacion" className="display text-2xl">Estado operativo</h2>
            {u.monitoreado ? (
              <dl className="mt-6 grid grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm text-paper/70">Últimas 24 h</dt>
                  <dd className="display text-4xl text-spark">{u.disponibilidad_24h ?? "–"}{u.disponibilidad_24h !== null && "%"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-paper/70">Últimos 30 días</dt>
                  <dd className="display text-4xl text-spark">{u.disponibilidad_30d ?? "–"}{u.disponibilidad_30d !== null && "%"}</dd>
                </div>
                <div className="col-span-2 text-sm text-paper/70">
                  {u.ultima_revision
                    ? `Última revisión ${fmtDate(u.ultima_revision)}${u.latencia_ms !== null ? `, respuesta en ${u.latencia_ms} ms` : ""}.`
                    : "Midiendo por primera vez."}
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-paper/75">Lo monitorearemos en vivo cuando el sistema entre en operación.</p>
            )}
          </section>

          {settings.ok && (
            <section className="rounded-[28px] border border-line p-7 md:p-8" aria-labelledby="ajustes">
              <h2 id="ajustes" className="display text-2xl">Ajustes</h2>
              <div className="mt-4">
                <SettingsForm serviceId={s.id} initial={settings.data} />
              </div>
            </section>
          )}

          <section aria-labelledby="entregables">
            <h2 id="entregables" className="display text-2xl">Entregables</h2>
            {s.entregables.length === 0 ? (
              <p className="mt-4 text-slate">Todavía no hay documentos publicados.</p>
            ) : (
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {s.entregables.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <span>
                      <span className="block font-semibold">{d.titulo}</span>
                      <span className="text-xs text-slate">{fmtDate(d.publicado_en)} {fmtSize(d.tamano_bytes)}</span>
                    </span>
                    <DownloadButton id={d.id} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </PanelShell>
  );
}

/** Last 30 days per metric: the first one charted, every one as a total. */
function Metrics({ series }: { series: MetricSeries[] }) {
  const [main] = series;
  return (
    <section className="rounded-[28px] border border-line p-7 md:p-8" aria-labelledby="desempeno">
      <h2 id="desempeno" className="display text-2xl">Desempeño, 30 días</h2>
      <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
        {series.map((m) => (
          <div key={m.clave}>
            <dt className="text-sm text-slate">{m.etiqueta}</dt>
            <dd className="display text-4xl">{fmtCompact(m.total)}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8">
        <Bars
          title={`${main.etiqueta} por día`}
          height={140}
          tickEvery={5}
          data={main.puntos.map(([day, v], i) => ({
            key: day,
            label: fmtDay(day),
            tick: String(Number(day.slice(8, 10))),
            value: v,
            display: fmtCompact(v),
            highlight: i === main.puntos.length - 1,
          }))}
        />
      </div>
    </section>
  );
}
