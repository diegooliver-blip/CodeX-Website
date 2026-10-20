import { NextResponse } from "next/server";
import { API_URL, apiHeaders, clientIp } from "@/lib/api-base";
import { apiError } from "@/lib/api-error";
import { setSession, type TokenPair } from "@/lib/session";

export async function POST(request: Request) {
  const upstream = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: apiHeaders({
      "content-type": "application/json",
      "x-client-ip": clientIp(request),
    }),
    body: await request.text(),
  }).catch(() => null);
  if (!upstream) return apiError(502, "API_NO_DISPONIBLE", "El servidor no responde. Intenta de nuevo.");
  if (!upstream.ok) return NextResponse.json(await upstream.json(), { status: upstream.status });

  const res = NextResponse.json({ ok: true });
  setSession(res, (await upstream.json()) as TokenPair);
  return res;
}
