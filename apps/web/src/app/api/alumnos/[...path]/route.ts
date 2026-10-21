import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL, apiHeaders, clientIp } from "@/lib/api-base";
import { apiError } from "@/lib/api-error";
import { isSameOrigin } from "@/lib/client-session";
import type { TokenPair } from "@/lib/session";
import { clearStudentSession, setStudentSession, STUDENT_ACCESS_COOKIE } from "@/lib/student-session";

/** Actions that open a session: the tokens stay server-side, the browser only gets the httpOnly cookies. */
const OPENS_SESSION = new Set(["registro", "login"]);

/** Authenticated actions the browser may trigger, as API paths under /alumnos. */
function authedTarget(path: string[]): string | null {
  if (path.length === 1 && path[0] === "checkout") return "/alumnos/checkout";
  if (path.length === 3 && path[0] === "ordenes" && path[2] === "simular") {
    return `/alumnos/ordenes/${encodeURIComponent(path[1])}/simular`;
  }
  return null;
}

/** Academy BFF: /api/alumnos/<accion> -> API /alumnos/<accion>. */
export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!isSameOrigin(request)) return apiError(403, "ORIGEN_INVALIDO", "Solicitud rechazada.");

  if (path.length === 1 && path[0] === "logout") {
    const res = new NextResponse(null, { status: 204 });
    clearStudentSession(res);
    return res;
  }

  const headers = apiHeaders({ "content-type": "application/json", "x-client-ip": clientIp(request) });
  let target: string | null;
  if (path.length === 1 && OPENS_SESSION.has(path[0])) {
    target = `/alumnos/${path[0]}`;
  } else {
    target = authedTarget(path);
    if (!target) return apiError(404, "NO_ENCONTRADO", "Acción desconocida.");
    const token = (await cookies()).get(STUDENT_ACCESS_COOKIE)?.value;
    if (!token) return apiError(401, "NO_AUTENTICADO", "Tu sesión expiró. Vuelve a entrar.");
    headers.set("authorization", `Bearer ${token}`);
    const key = request.headers.get("idempotency-key");
    if (key) headers.set("idempotency-key", key);
  }

  const upstream = await fetch(`${API_URL}${target}`, { method: "POST", headers, body: await request.text() }).catch(() => null);
  if (!upstream) return apiError(502, "API_NO_DISPONIBLE", "La academia no responde. Intenta de nuevo en un momento.");
  const body = await upstream.json().catch(() => ({}));
  if (!upstream.ok || !OPENS_SESSION.has(path[0])) return NextResponse.json(body, { status: upstream.status });

  const res = NextResponse.json({ ok: true });
  setStudentSession(res, body as TokenPair);
  return res;
}
