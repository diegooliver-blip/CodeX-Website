import Link from "next/link";
import { STAGES, type ServiceCard as Card, type Stage, type Uptime } from "@/lib/clientes-api";

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" }).format(
    new Date(iso),
  );

export const stageLabel = (s: Stage) => STAGES.find((x) => x.key === s)?.label ?? s;

export function StatusPill({ estado }: { estado: Uptime }) {
  if (!estado.monitoreado) return null;
  const state = estado.en_linea === null ? "pendiente" : estado.en_linea ? "en_linea" : "caido";
  const styles = {
    en_linea: "bg-emerald-50 text-emerald-800 border-emerald-200",
    caido: "bg-red-50 text-danger border-red-200",
    pendiente: "bg-mist text-slate border-line",
  }[state];
  const label = { en_linea: "En línea", caido: "Sin respuesta", pendiente: "Midiendo" }[state];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}>
      <span aria-hidden className={`size-2 rounded-full ${state === "en_linea" ? "bg-emerald-500" : state === "caido" ? "bg-danger" : "bg-steel"}`} />
      {label}
    </span>
  );
}

export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-slate">{label}</span>
        <span className="display text-xl">{value}%</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-mist"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="h-full rounded-full bg-gradient-to-r from-signal to-navy" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/** The method's stages as a horizontal timeline; completed ones filled, the current one highlighted. */
export function StageTimeline({ etapa }: { etapa: Stage }) {
  const current = STAGES.findIndex((s) => s.key === etapa);
  return (
    <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Etapas del proyecto">
      {STAGES.map((s, i) => (
        <li key={s.key} aria-current={i === current ? "step" : undefined}>
          <span className={`block h-1.5 rounded-full ${i < current ? "bg-navy" : i === current ? "bg-ember" : "bg-mist"}`} />
          <span className={`mt-2 block text-xs ${i === current ? "font-semibold text-ink" : "text-slate"}`}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function ServiceCardView({ s }: { s: Card }) {
  return (
    <Link
      href={`/clientes/panel/servicios/${s.id}`}
      className="group flex h-full flex-col justify-between rounded-[28px] border border-line bg-paper p-7 transition-[border-color,translate,box-shadow] duration-500 hover:-translate-y-1 hover:border-navy hover:shadow-[0_30px_60px_-35px_rgba(3,20,79,0.45)] md:p-8"
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-navy">{stageLabel(s.etapa)}</span>
          <StatusPill estado={s.estado} />
        </div>
        <h2 className="display mt-6 text-[1.9rem] leading-[1.05] group-hover:text-navy">{s.nombre}</h2>
        {s.ultimo_avance && (
          <p className="mt-4 text-[0.95rem] text-slate">
            <span className="font-semibold text-ink">Último avance:</span> {s.ultimo_avance.titulo}
            <span className="block text-xs">{fmtDate(s.ultimo_avance.publicado_en)}</span>
          </p>
        )}
      </div>
      <div className="mt-8 space-y-5">
        <Progress value={s.avance} label="Avance general" />
        <StageTimeline etapa={s.etapa} />
        {s.fecha_estimada && <p className="text-sm text-slate">Entrega estimada: {fmtDate(s.fecha_estimada)}</p>}
      </div>
    </Link>
  );
}

export { fmtDate };
