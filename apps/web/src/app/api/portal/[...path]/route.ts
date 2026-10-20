import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { API_URL, apiHeaders } from "@/lib/api-base";
import { apiError } from "@/lib/api-error";
import { ACCESS_COOKIE } from "@/lib/session";

/**
 * Authenticated pass-through for the portal: /api/portal/<path> -> API /admin/<path>
 * (or /auth/me). Adds the bearer token from the httpOnly cookie so it never reaches JS.
 */
async function forward(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return apiError(401, "NO_AUTENTICADO", "No autenticado");

  const target = path[0] === "me" ? "/auth/me" : `/admin/${path.map(encodeURIComponent).join("/")}`;
  const search = new URL(request.url).search;
  const headers = apiHeaders({ authorization: `Bearer ${token}` });
  const type = request.headers.get("content-type");
  if (type) headers.set("content-type", type);

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const upstream = await fetch(`${API_URL}${target}${search}`, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
  }).catch(() => null);
  if (!upstream) return apiError(502, "API_NO_DISPONIBLE", "El servidor no responde.");

  // Any course mutation refreshes the public academy immediately.
  if (hasBody && upstream.ok && path[0] === "courses") revalidateTag("courses", { expire: 0 });

  return new Response(upstream.status === 204 ? null : upstream.body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export { forward as GET, forward as POST, forward as PATCH, forward as DELETE };
