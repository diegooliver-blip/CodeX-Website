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
