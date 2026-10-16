"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { portal, type KnowledgeDoc } from "@/lib/portal-client";

const sourceLabel: Record<string, string> = { content: "Sitio", course: "Curso", upload: "Subido" };

export function KnowledgeAdmin() {
  const [docs, setDocs] = useState<KnowledgeDoc[] | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => portal<KnowledgeDoc[]>("rag/documents").then(setDocs).catch((e: Error) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  async function act(fn: () => Promise<string>) {
    setBusy(true);
    setError("");
    try {
      setStatus(await fn());
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const reindex = () =>
    act(async () => {
      const r = await portal<{ sources: number; reindexed: number; removed: number }>("rag/reindex", { method: "POST" });
      return `Índice actualizado: ${r.sources} fuentes, ${r.reindexed} reindexadas, ${r.removed} eliminadas.`;
    });

  const upload = (file: File) =>
    act(async () => {
      const body = new FormData();
      body.append("file", file);
      await portal("rag/documents", { method: "POST", body });
      return `"${file.name}" ya está disponible para el asistente.`;
    });

  return (
    <>
      <h1 className="display text-5xl">Conocimiento</h1>
      <p className="mt-3 max-w-2xl text-ash">
        Lo que el asistente puede consultar. Los servicios, proyectos y cursos publicados se indexan solos al reindexar;
        aquí también puedes subir documentos propios (PDF, Markdown o texto, máximo 15 MB).
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button type="button" onClick={reindex} disabled={busy} className="btn btn-gold disabled:opacity-50">Reindexar sitio y cursos</button>
        <label className={`btn btn-ghost cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
          Subir documento
          <input type="file" accept=".pdf,.md,.txt" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      </div>
      <div className="mt-4 min-h-6" aria-live="polite">
        {busy && <p className="text-ash">Procesando…</p>}
        {!busy && status && !error && <p className="text-champagne">{status}</p>}
        {error && <p className="text-danger" role="alert">{error}</p>}
      </div>

      {!docs ? (
        <div className="mt-8 h-60 animate-pulse rounded-2xl bg-graphite/60" />
      ) : docs.length === 0 ? (
        <p className="mt-8 text-ash">El índice está vacío. Pulsa «Reindexar sitio y cursos» para crearlo.</p>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-4 py-3">
              <span className="min-w-0">
                <span className="mr-3 rounded-full border border-line px-2 py-0.5 text-[0.75rem] text-ash">{sourceLabel[d.source] ?? d.source}</span>
                <span className="truncate">{d.title}</span>
              </span>
              {d.source === "upload" && (
                <button
                  type="button"
                  aria-label={`Eliminar ${d.title}`}
                  className="grid size-8 place-items-center rounded-md text-ash hover:bg-graphite hover:text-ivory"
                  onClick={() => window.confirm(`¿Quitar "${d.title}" del asistente?`) && act(async () => { await portal(`rag/documents/${d.id}`, { method: "DELETE" }); return "Documento eliminado."; })}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
