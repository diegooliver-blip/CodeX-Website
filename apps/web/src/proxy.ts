import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, setSession, type TokenPair } from "@/lib/session";
import { API_URL, apiHeaders } from "@/lib/api-base";
import { CLIENT_COOKIE } from "@/lib/client-session";
import { setStudentSession, STUDENT_ACCESS_COOKIE, STUDENT_REFRESH_COOKIE } from "@/lib/student-session";
import projects from "@content/projects.json";
import services from "@content/services.json";

const known: Record<string, Set<string>> = {
  proyectos: new Set(projects.map((p) => p.slug)),
  servicios: new Set(services.map((s) => s.slug)),
};

/**
 * Optimistic guard for /portal: only checks cookies. When the 15-minute access
 * token has expired but the 24h refresh token is still valid, rotate silently.
 * The API re-validates every request, so this is UX, not the security boundary.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Content slugs are known up front: answer unknown ones with a real 404 instead of
  // streaming the app shell first (which would send 200 and read as a soft 404).
  const [, section, slug, extra] = pathname.split("/");
  if (known[section]) {
    if (extra !== undefined || !known[section].has(slug)) return notFound(request);
    return NextResponse.next();
  }

  // Client portal: optimistic cookie check only; the API validates the session on every read.
  if (pathname.startsWith("/clientes/panel")) {
    if (request.cookies.get(CLIENT_COOKIE)?.value) return NextResponse.next();
    const login = new URL("/clientes/entrar", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  // Academy: anyone may browse; a signed-in student whose access token expired is refreshed silently.
  if (pathname.startsWith("/academia") || pathname.startsWith("/api/alumnos")) {
    return refreshStudent(request);
  }

  if (pathname === "/portal/login") return NextResponse.next();

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (access) return NextResponse.next();

  if (refresh) {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: apiHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (res.ok) {
        const tokens = (await res.json()) as TokenPair;
        // Make the fresh token visible to this same request's route handlers.
        request.cookies.set(ACCESS_COOKIE, tokens.access_token);
        const next = NextResponse.next({ request });
        setSession(next, tokens);
        return next;
      }
    } catch {
      // API unreachable: fall through to login
    }
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: { codigo: "NO_AUTENTICADO", mensaje: "No autenticado", detalles: null } }, { status: 401 });
  }
  const login = new URL("/portal/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

async function refreshStudent(request: NextRequest) {
  const refresh = request.cookies.get(STUDENT_REFRESH_COOKIE)?.value;
  if (request.cookies.get(STUDENT_ACCESS_COOKIE)?.value || !refresh) return NextResponse.next();
  try {
    const res = await fetch(`${API_URL}/alumnos/refresh`, {
      method: "POST",
      headers: apiHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (res.ok) {
      const tokens = (await res.json()) as TokenPair;
      request.cookies.set(STUDENT_ACCESS_COOKIE, tokens.access_token);
      const next = NextResponse.next({ request });
      setStudentSession(next, tokens);
      return next;
    }
  } catch {
    // API unreachable: browse as a visitor
  }
  return NextResponse.next();
}

// A rewrite to a prerendered page keeps the cached 200 status in production, so the
// 404 page's HTML is fetched once and served with the right status code.
let notFoundHtml: string | null = null;
async function notFound(request: NextRequest) {
  if (!notFoundHtml) {
    const res = await fetch(new URL("/no-encontrado", request.url)).catch(() => null);
    if (res?.ok) notFoundHtml = await res.text();
  }
  return new NextResponse(notFoundHtml ?? "Página no encontrada", {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export const config = {
  matcher: ["/portal/:path*", "/api/portal/:path*", "/proyectos/:path+", "/servicios/:path+", "/clientes/panel/:path*", "/academia/:path*", "/api/alumnos/:path*"],
};
