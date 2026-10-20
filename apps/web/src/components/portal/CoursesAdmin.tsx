"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { portal, slugify, type AdminCourse } from "@/lib/portal-client";

export function CoursesAdmin() {
  const [courses, setCourses] = useState<AdminCourse[] | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const load = () => portal<AdminCourse[]>("courses").then(setCourses).catch((e: Error) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const course = await portal<AdminCourse>("courses", { method: "POST", json: { title, slug: slugify(title) } });
      router.push(`/portal/cursos/${course.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <h1 className="display text-5xl">Cursos</h1>
      <form onSubmit={create} className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
        <label htmlFor="new-course" className="sr-only">Título del curso nuevo</label>
        <input id="new-course" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} placeholder="Título del curso nuevo" className="field-box flex-1" />
        <button type="submit" className="btn btn-primary">Crear curso</button>
      </form>
      {error && <p className="mt-3 text-danger" role="alert">{error}</p>}

      {!courses ? (
        <div className="mt-10 h-40 animate-pulse rounded-2xl bg-mist/60" />
      ) : courses.length === 0 ? (
        <p className="mt-10 text-slate">Todavía no hay cursos. Escribe un título arriba para crear el primero.</p>
      ) : (
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {courses.map((c) => {
            const lessons = c.modules.reduce((n, m) => n + m.lessons.length, 0);
            return (
              <li key={c.id}>
                <Link href={`/portal/cursos/${c.id}`} className="flex flex-wrap items-center justify-between gap-3 py-5 hover:text-navy">
                  <span>
                    <span className="block text-lg">{c.title}</span>
                    <span className="text-[0.88rem] text-slate">/{c.slug}, {c.modules.length} módulos, {lessons} lecciones</span>
                  </span>
                  <span className={`rounded-full px-3 py-1 text-[0.8rem] ${c.status === "published" ? "bg-signal/15 text-navy" : "border border-line text-slate"}`}>
                    {c.status === "published" ? "Publicado" : "Borrador"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
