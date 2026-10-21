import type { NextResponse } from "next/server";
import type { TokenPair } from "@/lib/session";

/** Academy (student) session: its own cookie pair, so a student never holds an admin-portal session. */
export const STUDENT_ACCESS_COOKIE = "codex_alumno_at";
export const STUDENT_REFRESH_COOKIE = "codex_alumno_rt";

const secure = process.env.NODE_ENV === "production";

export function setStudentSession(res: NextResponse, tokens: TokenPair) {
  const base = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };
  res.cookies.set(STUDENT_ACCESS_COOKIE, tokens.access_token, { ...base, maxAge: tokens.expires_in });
  res.cookies.set(STUDENT_REFRESH_COOKIE, tokens.refresh_token, { ...base, maxAge: 60 * 60 * 24 });
}

export function clearStudentSession(res: NextResponse) {
  res.cookies.delete(STUDENT_ACCESS_COOKIE);
  res.cookies.delete(STUDENT_REFRESH_COOKIE);
}
