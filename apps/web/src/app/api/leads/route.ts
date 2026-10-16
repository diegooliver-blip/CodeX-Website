import { API_URL, apiHeaders } from "@/lib/api-base";

export async function POST(request: Request) {
  const upstream = await fetch(`${API_URL}/leads`, {
    method: "POST",
    headers: apiHeaders({
      "content-type": "application/json",
      "x-forwarded-for": request.headers.get("x-forwarded-for") ?? "",
    }),
    body: await request.text(),
  }).catch(() => null);
  if (!upstream) return Response.json({ detail: "No pudimos enviar tu mensaje. Intenta de nuevo." }, { status: 502 });
  return new Response(upstream.body, { status: upstream.status, headers: { "content-type": "application/json" } });
}
