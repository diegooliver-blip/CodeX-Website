import { API_URL, apiHeaders, clientIp } from "@/lib/api-base";
import { apiError } from "@/lib/api-error";

/** Streams the assistant's SSE answer from the API to the browser. */
export async function POST(request: Request) {
  const upstream = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: apiHeaders({
      "content-type": "application/json",
      "x-client-ip": clientIp(request),
    }),
    body: await request.text(),
  }).catch(() => null);

  if (!upstream?.ok || !upstream.body) {
    if (upstream?.status === 429) return apiError(429, "DEMASIADAS_SOLICITUDES", "Hiciste varias preguntas seguidas. Espera un momento.");
    return apiError(502, "API_NO_DISPONIBLE", "El asistente no está disponible en este momento.");
  }
  return new Response(upstream.body, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform" },
  });
}
