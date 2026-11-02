import "server-only";
import { cookies } from "next/headers";
import { API_URL, apiHeaders } from "./api-base";
import { CLIENT_COOKIE } from "./client-session";

/** Server-side reads for the client panel. Session-specific, so never cached; call inside <Suspense>. */

export type Stage = "diagnostico" | "diseno" | "desarrollo" | "pruebas" | "entrega" | "operacion";

export type Uptime = {
  monitoreado: boolean;
  en_linea: boolean | null;
  ultima_revision: string | null;
  disponibilidad_24h: number | null;
  disponibilidad_30d: number | null;
  latencia_ms: number | null;
};

export type ServiceUpdate = { id: string; titulo: string; cuerpo: string; publicado_en: string };

export type ServiceCard = {
  id: string;
  nombre: string;
  servicio_slug: string;
  etapa: Stage;
  avance: number;
  fecha_estimada: string | null;
  actualizado_en: string;
  ultimo_avance: ServiceUpdate | null;
  estado: Uptime;
};

export type ServiceDetail = ServiceCard & {
  descripcion: string;
  avances: ServiceUpdate[];
  entregables: { id: string; titulo: string; tipo_contenido: string; tamano_bytes: number; publicado_en: string }[];
};

export type ClientMe = { nombre: string; email: string; cliente: string; es_demo: boolean };

export const STAGES: { key: Stage; label: string }[] = [
  { key: "diagnostico", label: "Diagnóstico" },
  { key: "diseno", label: "Diseño" },
  { key: "desarrollo", label: "Desarrollo" },
  { key: "pruebas", label: "Pruebas" },
  { key: "entrega", label: "Entrega" },
  { key: "operacion", label: "En operación" },
];

export type Result<T> = { ok: true; data: T } | { ok: false; status: number };

async function read<T>(path: string): Promise<Result<T>> {
  const session = (await cookies()).get(CLIENT_COOKIE)?.value;
  if (!session) return { ok: false, status: 401 };
  const res = await fetch(`${API_URL}/v1/clientes/${path}`, {
    headers: apiHeaders({ "x-client-session": session }),
    cache: "no-store",
  }).catch(() => null);
  if (!res) return { ok: false, status: 502 };
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, data: (await res.json()) as T };
}

export const getMe = () => read<ClientMe>("me");
export const getServices = () => read<ServiceCard[]>("servicios");
export const getService = (id: string) => read<ServiceDetail>(`servicios/${encodeURIComponent(id)}`);

// ---------- portal v5 ----------
export type Membership = {
  estado: "ninguna" | "pendiente" | "activa" | "pausada" | "cancelada";
  monto_centavos: number;
  moneda: string;
  activa_desde: string | null;
  proximo_cobro: string | null;
  pago_en_linea: boolean;
  pasarela: "mock" | "mercadopago" | null;
};

export type Overview = {
  servicios: ServiceCard[];
  pendiente_centavos: number;
  vencido_centavos: number;
  proximo_vencimiento: string | null;
  disponibilidad_30d: number | null;
  membresia: Membership;
  contratados: string[];
  reportes: string[];
};

export type Charge = {
  id: string;
  concepto: string;
  monto_centavos: number;
  moneda: string;
  emitido_en: string;
  vence_en: string | null;
  estado: "pendiente" | "pagado" | "anulado";
  vencido: boolean;
  pagado_en: string | null;
  servicio: string | null;
  tiene_factura: boolean;
};

export type Payments = {
  pago_en_linea: boolean;
  pasarela: "mock" | "mercadopago" | null;
  pendiente_centavos: number;
  vencido_centavos: number;
  cargos: Charge[];
  historial: { mes: string; pagado_centavos: number }[];
};

export type MetricSeries = { clave: string; etiqueta: string; total: number; puntos: [string, number][] };

export type ServiceSettings = {
  avisos_avance: boolean;
  avisos_caida: boolean;
  contacto_tecnico: string;
  ventana_mantenimiento: "domingo_noche" | "sabado_noche" | "entre_semana_noche" | "coordinar";
};

export const getOverview = () => read<Overview>("resumen");
export const getPayments = () => read<Payments>("pagos");
export const getMembership = () => read<Membership>("membresia");
export const getMetrics = (id: string, dias = 30) => read<MetricSeries[]>(`servicios/${encodeURIComponent(id)}/metricas?dias=${dias}`);
export const getServiceSettings = (id: string) => read<ServiceSettings>(`servicios/${encodeURIComponent(id)}/ajustes`);
