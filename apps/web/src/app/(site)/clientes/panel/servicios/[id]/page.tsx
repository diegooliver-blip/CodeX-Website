import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { DownloadButton } from "@/components/clientes/AuthForms";
import { PanelShell } from "@/components/clientes/PortalShell";
import { fmtDate, Progress, StageTimeline, StatusPill, stageLabel } from "@/components/clientes/ServiceViews";
import { getService } from "@/lib/clientes-api";

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
  const res = await getService(id);
  if (!res.ok && res.status === 401) redirect(`/clientes/entrar?next=/clientes/panel/servicios/${id}`);
  if (!res.ok && (res.status === 404 || res.status === 422)) notFound();
  if (!res.ok) {
    return (
      <PanelShell eyebrow="Servicio" title="El portal no responde." back={{ href: "/clientes/panel", label: "Mis servicios" }}>
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
      back={{ href: "/clientes/panel", label: "Mis servicios" }}
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
