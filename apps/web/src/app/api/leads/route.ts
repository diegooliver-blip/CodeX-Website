import { API_URL, apiHeaders, clientIp } from "@/lib/api-base";
import { apiError } from "@/lib/api-error";

export async function POST(request: Request) {
  const upstream = await fetch(`${API_URL}/leads`, {
    method: "POST",
    headers: apiHeaders({
      "content-type": "application/json",
      "x-client-ip": clientIp(request),
      ...(request.headers.get("idempotency-key") ? { "idempotency-key": request.headers.get("idempotency-key")! } : {}),
    }),
    body: await request.text(),
  }).catch(() => null);
  if (!upstream) return apiError(502, "API_NO_DISPONIBLE", "No pudimos enviar tu mensaje. Intenta de nuevo.");
  return new Response(upstream.body, { status: upstream.status, headers: { "content-type": "application/json" } });
}
