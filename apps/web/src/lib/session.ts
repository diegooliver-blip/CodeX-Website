import type { NextResponse } from "next/server";

export const ACCESS_COOKIE = "codex_at";
export const REFRESH_COOKIE = "codex_rt";

export type TokenPair = { access_token: string; refresh_token: string; expires_in: number };

const secure = process.env.NODE_ENV === "production";

export function setSession(res: NextResponse, tokens: TokenPair) {
  const base = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };
  res.cookies.set(ACCESS_COOKIE, tokens.access_token, { ...base, maxAge: tokens.expires_in });
  res.cookies.set(REFRESH_COOKIE, tokens.refresh_token, { ...base, maxAge: 60 * 60 * 24 });
}

export function clearSession(res: NextResponse) {
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
}
