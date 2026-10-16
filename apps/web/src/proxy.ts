import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, setSession, type TokenPair } from "@/lib/session";
import { API_URL, apiHeaders } from "@/lib/api-base";
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
    if (extra !== undefined || !known[section].has(slug)) {
      return NextResponse.rewrite(new URL("/no-encontrado", request.url), { status: 404 });
    }
    return NextResponse.next();
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

  if (pathname.startsWith("/api/")) return NextResponse.json({ detail: "No autenticado" }, { status: 401 });
  const login = new URL("/portal/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/portal/:path*", "/api/portal/:path*", "/proyectos/:path+", "/servicios/:path+"],
};
