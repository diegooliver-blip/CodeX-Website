import { cookies } from "next/headers";
import { API_URL, apiHeaders, clientIp } from "@/lib/api-base";
import { apiError } from "@/lib/api-error";
import { CLIENT_COOKIE, isSameOrigin } from "@/lib/client-session";

/**
 * Portal data for the browser: /api/clientes/datos/<path> -> API /v1/clientes/<path>, with the session cookie
 * turned into `X-Client-Session`. Reads (downloads, the monthly PDF) and the panel's own actions (pay,
 * subscribe, settings, "me interesa"). The API scopes everything to the client; writes must come from this site.
 */
async function forward(request: Request, ctx: { params: Promise<{ path: string[] }> }, method: "GET" | "POST" | "PUT") {
  const { path } = await ctx.params;
  if (method !== "GET" && !isSameOrigin(request)) return apiError(403, "ORIGEN_INVALIDO", "Solicitud rechazada.");
  const session = (await cookies()).get(CLIENT_COOKIE)?.value;
  if (!session) return apiError(401, "NO_AUTENTICADO", "Tu sesión expiró. Vuelve a entrar.");

  const headers = apiHeaders({ "x-client-session": session, "x-client-ip": clientIp(request) });
  if (method !== "GET") headers.set("content-type", "application/json");
  const search = new URL(request.url).search;
  const upstream = await fetch(`${API_URL}/v1/clientes/${path.map(encodeURIComponent).join("/")}${search}`, {
    method,
    headers,
    body: method === "GET" ? undefined : (await request.text()) || "{}",
    cache: "no-store",
  }).catch(() => null);
  if (!upstream) return apiError(502, "API_NO_DISPONIBLE", "El portal no responde. Intenta de nuevo en un momento.");

  const out = new Headers({ "content-type": upstream.headers.get("content-type") ?? "application/json", "cache-control": "no-store" });
  const disposition = upstream.headers.get("content-disposition");
  if (disposition) out.set("content-disposition", disposition);
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export const GET = (request: Request, ctx: { params: Promise<{ path: string[] }> }) => forward(request, ctx, "GET");
export const POST = (request: Request, ctx: { params: Promise<{ path: string[] }> }) => forward(request, ctx, "POST");
export const PUT = (request: Request, ctx: { params: Promise<{ path: string[] }> }) => forward(request, ctx, "PUT");
