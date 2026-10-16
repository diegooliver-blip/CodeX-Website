"use client";

/** Browser-side helper for the portal BFF (/api/portal/*). Redirects to login on 401. */
export async function portal<T = unknown>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(`/api/portal/${path}`, {
    ...rest,
    headers: json !== undefined ? { "content-type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (res.status === 401) {
    // Full reload: the expired session must not leave stale portal state mounted.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/portal/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new Error("No autenticado");
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorText(body));
  return body as T;
}

function errorText(body: { detail?: unknown }) {
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail)) return "Revisa los campos: " + body.detail.map((d: { loc?: string[] }) => d.loc?.at(-1)).join(", ");
  return "La operación no se completó. Intenta de nuevo.";
}

/** Upload straight to object storage with a presigned URL, reporting progress (0-100). */
export async function uploadFile(file: File, folder: "videos" | "pdfs" | "covers", onProgress: (pct: number) => void) {
  const { key, upload_url } = await portal<{ key: string; upload_url: string }>("uploads/presign", {
    method: "POST",
    json: { filename: file.name, content_type: file.type || "application/octet-stream", folder },
  });
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", upload_url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`El almacenamiento rechazó el archivo (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Se perdió la conexión durante la subida"));
    xhr.send(file);
  });
  return key;
}

export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export type AdminLesson = {
  id: string; title: string; slug: string; kind: "video" | "pdf" | "text"; body: string;
  asset_key: string | null; duration_min: number; is_free: boolean; position: number;
};
export type AdminModule = { id: string; title: string; position: number; lessons: AdminLesson[] };
export type AdminCourse = {
  id: string; slug: string; title: string; subtitle: string; description: string; category: string; level: string;
  cover_key: string | null; price_mxn: number | null; status: "draft" | "published"; updated_at: string; modules: AdminModule[];
};
export type Lead = {
  id: string; name: string; email: string; company: string; phone: string; service: string;
  message: string; source: string; course_slug: string; created_at: string;
};
export type KnowledgeDoc = { id: string; source: string; ref: string; title: string; url: string; created_at: string };
