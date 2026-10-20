import { cookies } from "next/headers";
import { API_URL, apiHeaders } from "@/lib/api-base";
import { apiError } from "@/lib/api-error";
import { CLIENT_COOKIE } from "@/lib/client-session";

/** Read-only portal data for the browser (e.g. a deliverable's short-lived download link). */
export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const session = (await cookies()).get(CLIENT_COOKIE)?.value;
  if (!session) return apiError(401, "NO_AUTENTICADO", "Tu sesión expiró. Vuelve a entrar.");

  const upstream = await fetch(`${API_URL}/v1/clientes/${path.map(encodeURIComponent).join("/")}`, {
    headers: apiHeaders({ "x-client-session": session }),
    cache: "no-store",
  }).catch(() => null);
  if (!upstream) return apiError(502, "API_NO_DISPONIBLE", "El portal no responde. Intenta de nuevo en un momento.");
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json", "cache-control": "no-store" },
  });
}
