/**
 * The API's error contract, shared by the BFF routes (which build errors of their own) and client
 * components (which show them): `{ error: { codigo, mensaje, detalles, traceId } }`.
 */
export type ApiErrorBody = {
  error: { codigo: string; mensaje: string; detalles?: unknown; traceId?: string };
};

export function apiError(status: number, codigo: string, mensaje: string): Response {
  return Response.json({ error: { codigo, mensaje, detalles: null } } satisfies ApiErrorBody, { status });
}

/** Human message from an error body, with the field list for validation errors. */
export function errorMessage(body: unknown, fallback: string): string {
  const error = (body as Partial<ApiErrorBody> | null)?.error;
  if (!error?.mensaje) return fallback;
  const campos = (error.detalles as { campos?: { campo: string }[] } | null)?.campos;
  return campos?.length ? `${error.mensaje} (${campos.map((c) => c.campo).join(", ")})` : error.mensaje;
}

export function errorCode(body: unknown): string | undefined {
  return (body as Partial<ApiErrorBody> | null)?.error?.codigo;
}
