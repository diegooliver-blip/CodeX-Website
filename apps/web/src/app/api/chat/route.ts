import { API_URL, apiHeaders } from "@/lib/api-base";

/** Streams the assistant's SSE answer from the API to the browser. */
export async function POST(request: Request) {
  const upstream = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: apiHeaders({
      "content-type": "application/json",
      "x-forwarded-for": request.headers.get("x-forwarded-for") ?? "",
    }),
    body: await request.text(),
  }).catch(() => null);

  if (!upstream?.ok || !upstream.body) {
    const status = upstream?.status === 429 ? 429 : 502;
    return Response.json({ detail: "El asistente no está disponible en este momento." }, { status });
  }
  return new Response(upstream.body, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform" },
  });
}
