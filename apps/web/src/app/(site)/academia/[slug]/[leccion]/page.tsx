import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCourse, getCourses } from "@/lib/api";

export async function generateStaticParams() {
  const courses = await getCourses();
  const params = [];
  for (const c of courses) {
    const course = await getCourse(c.slug);
    for (const l of course?.modules.flatMap((m) => m.lessons) ?? []) {
      if (!l.locked) params.push({ slug: c.slug, leccion: l.slug });
    }
  }
  return params.length ? params : [{ slug: "__placeholder__", leccion: "__placeholder__" }];
}

export async function generateMetadata({ params }: PageProps<"/academia/[slug]/[leccion]">): Promise<Metadata> {
  const { slug, leccion } = await params;
  const course = await getCourse(slug);
  const lesson = course?.modules.flatMap((m) => m.lessons).find((l) => l.slug === leccion);
  return lesson && course ? { title: `${lesson.title}, ${course.title}` } : { title: "Lección no encontrada" };
}

export default function LessonPage({ params }: PageProps<"/academia/[slug]/[leccion]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-5xl px-5 pt-40"><div className="h-full animate-pulse rounded-2xl bg-graphite/50" /></div>}>
      <Lesson params={params} />
    </Suspense>
  );
}

async function Lesson({ params }: { params: PageProps<"/academia/[slug]/[leccion]">["params"] }) {
  const { slug, leccion } = await params;
  const course = await getCourse(slug);
  const lessons = course?.modules.flatMap((m) => m.lessons) ?? [];
  const lesson = lessons.find((l) => l.slug === leccion);
  if (!course || !lesson) notFound();

  return (
    <article className="mx-auto max-w-5xl px-5 pb-28 pt-32 md:pt-40">
      <Link href={`/academia/${course.slug}`} className="link-underline text-[0.92rem] text-gold">{course.title}</Link>
      <h1 className="display mt-5 text-[clamp(2.2rem,4.5vw,3.75rem)]">{lesson.title}</h1>

      {lesson.locked ? (
        <div className="mt-12 rounded-[22px] border border-line p-10">
          <p className="display text-3xl">Esta lección es parte del curso completo.</p>
          <p className="mt-3 text-ash">Regístrate en la página del curso para recibir acceso cuando abran las inscripciones.</p>
          <Link href={`/academia/${course.slug}`} className="btn btn-gold mt-6">Ir al curso</Link>
        </div>
      ) : (
        <div className="mt-12 space-y-10">
          {lesson.kind === "video" && lesson.asset_url && (
            <video controls preload="metadata" className="aspect-video w-full rounded-[22px] border border-line bg-graphite" src={lesson.asset_url}>
              Tu navegador no puede reproducir este video.
            </video>
          )}
          {lesson.kind === "pdf" && lesson.asset_url && (
            <div className="space-y-4">
              <iframe title={lesson.title} src={lesson.asset_url} className="h-[75vh] w-full rounded-[22px] border border-line bg-graphite" />
              <a href={lesson.asset_url} target="_blank" rel="noopener" className="btn btn-ghost">Descargar PDF</a>
            </div>
          )}
          {lesson.body && <div className="prose-codex whitespace-pre-line text-[1.08rem] leading-relaxed">{lesson.body}</div>}
        </div>
      )}
    </article>
  );
}
