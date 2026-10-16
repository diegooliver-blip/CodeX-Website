/** Base URL of the FastAPI service, reachable only from the Next.js server. */
export const API_URL = process.env.API_URL ?? "http://localhost:8010";

export function apiHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  if (process.env.INTERNAL_API_KEY) headers.set("x-internal-key", process.env.INTERNAL_API_KEY);
  return headers;
}
