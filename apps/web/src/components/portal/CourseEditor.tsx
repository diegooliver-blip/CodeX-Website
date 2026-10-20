"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, FileText, Film, Trash2, Type } from "lucide-react";
import { portal, slugify, uploadFile, type AdminCourse, type AdminLesson, type AdminModule } from "@/lib/portal-client";

const kindIcon = { video: Film, pdf: FileText, text: Type };

export function CourseEditor({ id }: { id: string }) {
  const [course, setCourse] = useState<AdminCourse | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const load = useCallback(() => portal<AdminCourse>(`courses/${id}`).then(setCourse).catch((e: Error) => setError(e.message)), [id]);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setError("");
    try {
      await fn();
      await load();
      if (done) setNotice(done);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (error && !course) return <p className="text-danger" role="alert">{error}</p>;
  if (!course) return <div className="h-80 animate-pulse rounded-2xl bg-mist/60" />;

  async function saveDetails(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    await run(
      () => portal(`courses/${id}`, {
        method: "PATCH",
        json: { ...f, price_mxn: f.price_mxn ? Number(f.price_mxn) : null },
      }),
      "Cambios guardados.",
    );
  }

  const published = course.status === "published";

  return (
    <>
      <Link href="/portal/cursos" className="link-underline text-[0.92rem] text-navy">Cursos</Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-5xl">{course.title}</h1>
        <div className="flex gap-2">
          {published && <Link href={`/academia/${course.slug}`} target="_blank" className="btn btn-ghost">Ver en la academia</Link>}
          <button
            type="button"
            className={published ? "btn btn-ghost" : "btn btn-primary"}
            onClick={() => run(() => portal(`courses/${id}`, { method: "PATCH", json: { status: published ? "draft" : "published" } }), published ? "Curso pasado a borrador." : "Curso publicado.")}
          >
            {published ? "Pasar a borrador" : "Publicar"}
          </button>
        </div>
      </div>
      <div className="mt-3 min-h-6" aria-live="polite">
        {notice && !error && <p className="text-navy">{notice}</p>}
        {error && <p className="text-danger" role="alert">{error}</p>}
      </div>

      <form key={course.updated_at} onSubmit={saveDetails} className="mt-6 grid gap-5 rounded-2xl border border-line p-6 md:grid-cols-2">
        <Field label="Título" name="title" defaultValue={course.title} required />
        <Field label="Slug (URL)" name="slug" defaultValue={course.slug} pattern="[a-z0-9\-]+" required />
        <Field label="Subtítulo" name="subtitle" defaultValue={course.subtitle} className="md:col-span-2" />
        <label className="block md:col-span-2">
          <span className="text-sm text-slate">Descripción</span>
          <textarea name="description" defaultValue={course.description} rows={5} className="field-box mt-1.5" />
        </label>
        <Field label="Categoría" name="category" defaultValue={course.category} />
        <Field label="Nivel" name="level" defaultValue={course.level} />
        <Field label="Precio en MXN (vacío = por anunciar)" name="price_mxn" type="number" min={0} defaultValue={course.price_mxn ?? ""} />
        <div className="flex items-end justify-end">
          <button type="submit" className="btn btn-primary">Guardar cambios</button>
        </div>
      </form>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Temario</h2>
        <div className="mt-6 space-y-6">
          {course.modules.map((m, i) => (
            <ModuleCard
              key={m.id}
              module={m}
              index={i}
              last={i === course.modules.length - 1}
              run={run}
              onMove={(dir) => {
                const other = course.modules[i + dir];
                return run(async () => {
                  await portal(`courses/modules/${m.id}`, { method: "PATCH", json: { title: m.title, position: other.position } });
                  await portal(`courses/modules/${other.id}`, { method: "PATCH", json: { title: other.title, position: m.position } });
                });
              }}
            />
          ))}
        </div>
        <AddModule courseId={id} nextPosition={course.modules.length} run={run} />
      </section>

      <section className="mt-16 border-t border-line pt-8">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-danger hover:underline"
          onClick={async () => {
            if (!window.confirm(`¿Eliminar "${course.title}" con todos sus módulos y lecciones? No se puede deshacer.`)) return;
            await portal(`courses/${id}`, { method: "DELETE" });
            router.push("/portal/cursos");
          }}
        >
          <Trash2 className="size-4" aria-hidden /> Eliminar curso
        </button>
      </section>
    </>
  );
}

type Run = (fn: () => Promise<unknown>, done?: string) => Promise<void>;

function Field({ label, className = "", ...props }: { label: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm text-slate">{label}</span>
      <input {...props} className="field-box mt-1.5" />
    </label>
  );
}

function AddModule({ courseId, nextPosition, run }: { courseId: string; nextPosition: number; run: Run }) {
  const [title, setTitle] = useState("");
  return (
    <form
      className="mt-6 flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => portal(`courses/${courseId}/modules`, { method: "POST", json: { title, position: nextPosition } }), "Módulo agregado.").then(() => setTitle(""));
      }}
    >
      <label htmlFor="new-module" className="sr-only">Nombre del módulo nuevo</label>
      <input id="new-module" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Nombre del módulo nuevo" className="field-box flex-1" />
      <button type="submit" className="btn btn-ghost">Agregar módulo</button>
    </form>
  );
}

function ModuleCard({ module: m, index, last, run, onMove }: { module: AdminModule; index: number; last: boolean; run: Run; onMove: (dir: -1 | 1) => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="rounded-2xl border border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <p><span className="text-navy">Módulo {index + 1}</span> <span className="ml-2">{m.title}</span></p>
        <div className="flex items-center gap-1 text-slate">
          <IconButton label="Subir módulo" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp className="size-4" /></IconButton>
          <IconButton label="Bajar módulo" disabled={last} onClick={() => onMove(1)}><ArrowDown className="size-4" /></IconButton>
          <IconButton
            label="Eliminar módulo"
            onClick={() => window.confirm(`¿Eliminar el módulo "${m.title}" y sus lecciones?`) && run(() => portal(`courses/modules/${m.id}`, { method: "DELETE" }), "Módulo eliminado.")}
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>
      <ul className="divide-y divide-line">
        {m.lessons.map((l) => <LessonRow key={l.id} lesson={l} run={run} />)}
      </ul>
      <div className="p-4">
        {adding ? (
          <LessonForm
            onCancel={() => setAdding(false)}
            onSave={(data) => run(() => portal(`courses/modules/${m.id}/lessons`, { method: "POST", json: { ...data, position: m.lessons.length } }), "Lección agregada.").then(() => setAdding(false))}
          />
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="text-[0.92rem] text-navy hover:underline">Agregar lección</button>
        )}
      </div>
    </div>
  );
}

function LessonRow({ lesson, run }: { lesson: AdminLesson; run: Run }) {
  const [editing, setEditing] = useState(false);
  const Icon = kindIcon[lesson.kind];
  if (editing) {
    return (
      <li className="p-4">
        <LessonForm
          initial={lesson}
          onCancel={() => setEditing(false)}
          onSave={(data) => run(() => portal(`courses/lessons/${lesson.id}`, { method: "PATCH", json: { ...data, position: lesson.position } }), "Lección actualizada.").then(() => setEditing(false))}
        />
      </li>
    );
  }
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3">
      <button type="button" onClick={() => setEditing(true)} className="flex min-w-0 items-center gap-3 text-left hover:text-navy">
        <Icon className="size-4 shrink-0 text-navy" aria-hidden />
        <span className="truncate">{lesson.title}</span>
        {lesson.is_free && <span className="rounded-full bg-signal/15 px-2 py-0.5 text-[0.75rem] text-navy">Gratis</span>}
        {lesson.kind !== "text" && !lesson.asset_key && <span className="text-[0.78rem] text-danger">Falta archivo</span>}
      </button>
      <span className="flex items-center gap-3 text-[0.85rem] text-slate">
        {lesson.duration_min} min
        <IconButton label="Eliminar lección" onClick={() => window.confirm(`¿Eliminar "${lesson.title}"?`) && run(() => portal(`courses/lessons/${lesson.id}`, { method: "DELETE" }), "Lección eliminada.")}>
          <Trash2 className="size-4" />
        </IconButton>
      </span>
    </li>
  );
}

type LessonData = Omit<AdminLesson, "id" | "position">;

function LessonForm({ initial, onSave, onCancel }: { initial?: AdminLesson; onSave: (d: LessonData) => Promise<void>; onCancel: () => void }) {
  const [kind, setKind] = useState<AdminLesson["kind"]>(initial?.kind ?? "video");
  const [assetKey, setAssetKey] = useState(initial?.asset_key ?? null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setProgress(0);
    try {
      setAssetKey(await uploadFile(file, kind === "pdf" ? "pdfs" : "videos", setProgress));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title"));
    onSave({
      title,
      slug: String(f.get("slug")) || slugify(title),
      kind,
      body: String(f.get("body") ?? ""),
      asset_key: kind === "text" ? null : assetKey,
      duration_min: Number(f.get("duration_min") || 0),
      is_free: f.get("is_free") === "on",
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl bg-mist/60 p-4 md:grid-cols-2">
      <Field label="Título de la lección" name="title" defaultValue={initial?.title} required />
      <Field label="Slug (vacío = automático)" name="slug" defaultValue={initial?.slug} pattern="[a-z0-9\-]*" />
      <fieldset className="md:col-span-2">
        <legend className="text-sm text-slate">Tipo</legend>
        <div className="mt-2 flex gap-2">
          {(["video", "pdf", "text"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
              className={`rounded-full border px-4 py-1.5 text-[0.88rem] ${kind === k ? "border-signal bg-signal text-ink" : "border-line"}`}>
              {k === "video" ? "Video" : k === "pdf" ? "PDF" : "Texto"}
            </button>
          ))}
        </div>
      </fieldset>
      {kind !== "text" && (
        <div className="md:col-span-2">
          <label className="block">
            <span className="text-sm text-slate">{kind === "video" ? "Archivo de video (MP4, WebM)" : "Archivo PDF"}</span>
            <input type="file" accept={kind === "video" ? "video/*" : "application/pdf"} onChange={(e) => onFile(e.target.files?.[0])}
              className="mt-1.5 block w-full text-[0.9rem] text-slate file:mr-4 file:rounded-full file:border-0 file:bg-signal file:px-4 file:py-2 file:text-ink" />
          </label>
          {progress !== null && (
            <div className="mt-3" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso de subida">
              <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-signal transition-[width]" style={{ width: `${progress}%` }} /></div>
              <p className="mt-1 text-[0.85rem] text-slate">Subiendo… {progress}%</p>
            </div>
          )}
          {assetKey && progress === null && <p className="mt-2 text-[0.85rem] text-navy">Archivo listo: {assetKey.split("/").pop()}</p>}
          {error && <p className="mt-2 text-[0.88rem] text-danger" role="alert">{error}</p>}
        </div>
      )}
      <label className="block md:col-span-2">
        <span className="text-sm text-slate">{kind === "text" ? "Contenido" : "Notas de la lección (opcional)"}</span>
        <textarea name="body" defaultValue={initial?.body} rows={kind === "text" ? 8 : 3} className="field-box mt-1.5" />
      </label>
      <Field label="Duración (minutos)" name="duration_min" type="number" min={0} defaultValue={initial?.duration_min ?? 0} />
      <label className="flex items-center gap-3 self-end pb-2">
        <input type="checkbox" name="is_free" defaultChecked={initial?.is_free} className="size-4 accent-[#c9a55a]" />
        Lección gratuita (visible sin inscripción)
      </label>
      <div className="flex justify-end gap-2 md:col-span-2">
        <button type="button" onClick={onCancel} className="btn btn-ghost">Cancelar</button>
        <button type="submit" disabled={progress !== null} className="btn btn-primary disabled:opacity-50">Guardar lección</button>
      </div>
    </form>
  );
}

function IconButton({ label, children, ...props }: { label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-label={label} title={label} {...props} className="grid size-8 place-items-center rounded-md hover:bg-mist hover:text-ink disabled:opacity-30">
      {children}
    </button>
  );
}
