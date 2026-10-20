import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL, apiHeaders, clientIp } from "@/lib/api-base";
import { apiError } from "@/lib/api-error";
import { CLIENT_COOKIE, clearClientSession, isSameOrigin, setClientSession } from "@/lib/client-session";

/** Actions that open a session and therefore set the cookie on success. */
const OPENS_SESSION = new Set(["login", "activar", "restablecer"]);
const ALLOWED = new Set([...OPENS_SESSION, "olvide", "logout", "cambiar-contrasena"]);

/** Client-portal auth BFF: /api/clientes/auth/<accion> -> API /v1/clientes/auth/<accion>. */
export async function POST(request: Request, ctx: { params: Promise<{ accion: string }> }) {
  const { accion } = await ctx.params;
  if (!ALLOWED.has(accion)) return apiError(404, "NO_ENCONTRADO", "Acción desconocida.");
  if (!isSameOrigin(request)) return apiError(403, "ORIGEN_INVALIDO", "Solicitud rechazada.");

  const session = (await cookies()).get(CLIENT_COOKIE)?.value;
  const headers = apiHeaders({
    "content-type": "application/json",
    "x-client-ip": clientIp(request),
    "user-agent": request.headers.get("user-agent") ?? "",
  });
  if (session) headers.set("x-client-session", session);

  const upstream = await fetch(`${API_URL}/v1/clientes/auth/${accion}`, {
    method: "POST",
    headers,
    body: accion === "logout" ? undefined : await request.text(),
  }).catch(() => null);
  if (!upstream) return apiError(502, "API_NO_DISPONIBLE", "El portal no responde. Intenta de nuevo en un momento.");

  if (accion === "logout") {
    const res = new NextResponse(null, { status: 204 });
    clearClientSession(res);
    return res;
  }
  if (upstream.status === 204) return new NextResponse(null, { status: 204 });

  const body = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return NextResponse.json(body, { status: upstream.status });
  if (OPENS_SESSION.has(accion)) {
    // The session token stays server-side: the browser only receives the httpOnly cookie and the profile.
    const res = NextResponse.json({ usuario: body.usuario });
    setClientSession(res, body.sesion, body.expira_en);
    return res;
  }
  return NextResponse.json(body, { status: upstream.status });
}
