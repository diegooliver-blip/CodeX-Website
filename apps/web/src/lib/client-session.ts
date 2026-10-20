import type { NextResponse } from "next/server";

/** Client-portal session: an opaque token from the API, kept only in this httpOnly cookie. */
export const CLIENT_COOKIE = "codex_cliente";

const secure = process.env.NODE_ENV === "production";

export function setClientSession(res: NextResponse, token: string, expiresAt: string) {
  res.cookies.set(CLIENT_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export function clearClientSession(res: NextResponse) {
  res.cookies.delete(CLIENT_COOKIE);
}

/**
 * CSRF guard for state-changing BFF calls: browsers always send Origin on cross-site POSTs,
 * so a request whose Origin isn't our own host is refused.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
