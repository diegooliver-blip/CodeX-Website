import { NextResponse } from "next/server";
import { API_URL, apiHeaders } from "@/lib/api-base";
import { setSession, type TokenPair } from "@/lib/session";

export async function POST(request: Request) {
  const upstream = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: apiHeaders({
      "content-type": "application/json",
      "x-forwarded-for": request.headers.get("x-forwarded-for") ?? "",
    }),
    body: await request.text(),
  }).catch(() => null);
  if (!upstream) return NextResponse.json({ detail: "El servidor no responde. Intenta de nuevo." }, { status: 502 });
  if (!upstream.ok) return NextResponse.json(await upstream.json(), { status: upstream.status });

  const res = NextResponse.json({ ok: true });
  setSession(res, (await upstream.json()) as TokenPair);
  return res;
}
