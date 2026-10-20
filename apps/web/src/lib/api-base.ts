/** Base URL of the FastAPI service, reachable only from the Next.js server. */
export const API_URL = process.env.API_URL ?? "http://localhost:8010";

export function apiHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  if (process.env.INTERNAL_API_KEY) headers.set("x-internal-key", process.env.INTERNAL_API_KEY);
  return headers;
}

/**
 * Visitor IP for rate limiting. Cloudflare's CF-Connecting-IP when present; otherwise the last
 * X-Forwarded-For hop, which is the one our own proxy (Caddy) appended. The first hop is whatever the
 * visitor chose to send, so it is never used.
 */
export function clientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const hops = (request.headers.get("x-forwarded-for") ?? "").split(",").map((h) => h.trim()).filter(Boolean);
  return hops.at(-1) ?? "";
}
