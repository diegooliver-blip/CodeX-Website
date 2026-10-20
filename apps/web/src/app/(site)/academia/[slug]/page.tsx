import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Lock, PlayCircle } from "lucide-react";
import { formatPrice } from "@/components/CourseList";
import { LeadForm } from "@/components/LeadForm";
import { getCourse, getCourses } from "@/lib/api";
import { siteUrl } from "@/lib/content";

// Courses live in the API; unknown slugs render on demand. A placeholder keeps
// the build valid when the API has no published courses (or is unreachable).
export async function generateStaticParams() {
  const courses = await getCourses();
  return courses.length ? courses.map((c) => ({ slug: c.slug })) : [{ slug: "__placeholder__" }];
}

export async function generateMetadata({ params }: PageProps<"/academia/[slug]">): Promise<Metadata> {
  const course = await getCourse((await params).slug);
  if (!course) return { title: "Curso no encontrado" };
  return { title: course.title, description: course.subtitle || course.description.slice(0, 160), alternates: { canonical: `/academia/${course.slug}` } };
}

export default function CoursePage({ params }: PageProps<"/academia/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-[60vh] max-w-[1440px] px-5 pt-48 md:px-10"><div className="h-full animate-pulse rounded-2xl bg-mist/50" /></div>}>
      <Course params={params} />
    </Suspense>
  );
}

async function Course({ params }: { params: PageProps<"/academia/[slug]">["params"] }) {
  const course = await getCourse((await params).slug);
  if (!course) notFound();
  const free = course.modules.flatMap((m) => m.lessons).find((l) => !l.locked);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.subtitle || course.description,
    provider: { "@type": "Organization", name: "CODEX AI Consulting", sameAs: siteUrl },
    ...(course.price_mxn ? { offers: { "@type": "Offer", price: course.price_mxn, priceCurrency: "MXN" } } : {}),
  };

  return (
    <>
      <section className="mx-auto grid max-w-[1440px] gap-14 px-5 pb-20 pt-36 md:px-10 md:pt-48 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <Link href="/academia" className="link-underline text-[0.92rem] text-navy">{course.category}</Link>
          <h1 className="display hero-line mt-6 text-[clamp(2.6rem,5.5vw,5rem)]">{course.title}</h1>
          {course.subtitle && <p className="mt-6 max-w-2xl text-[length:var(--text-lede)] text-slate">{course.subtitle}</p>}
          {course.description && <p className="prose-codex mt-8 whitespace-pre-line">{course.description}</p>}
        </div>
        <aside className="h-fit rounded-[22px] border border-line bg-mist/60 p-8">
          <p className="display text-4xl text-navy">{formatPrice(course.price_mxn)}</p>
          <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-line py-5 text-[0.9rem]">
            <div><dt className="text-slate">Nivel</dt><dd className="mt-1">{course.level}</dd></div>
            <div><dt className="text-slate">Lecciones</dt><dd className="mt-1">{course.lessons}</dd></div>
            <div><dt className="text-slate">Duración</dt><dd className="mt-1">{Math.round(course.minutes / 6) / 10} h</dd></div>
          </dl>
          {free && (
            <Link href={`/academia/${course.slug}/${free.slug}`} className="btn btn-ghost mt-6 w-full">Ver lección gratuita</Link>
          )}
          <p className="mt-8 text-[0.95rem] text-slate">Las inscripciones abren pronto. Déjanos tu correo y te avisamos primero.</p>
          <div className="mt-5">
            <LeadForm source="academia" courseSlug={course.slug} submitLabel="Quiero inscribirme" />
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-[1440px] border-t border-line px-5 py-20 md:px-10">
        <h2 className="display text-[clamp(2rem,4vw,3.25rem)]">Temario</h2>
        <ol className="mt-10 space-y-10">
          {course.modules.map((m, i) => (
            <li key={m.title} className="grid gap-4 lg:grid-cols-[16rem_1fr]">
              <p className="text-navy">Módulo {i + 1}<span className="block text-ink">{m.title}</span></p>
              <ul className="divide-y divide-line border-y border-line">
                {m.lessons.map((l) => (
                  <li key={l.slug}>
                    {l.locked ? (
                      <p className="flex items-center justify-between gap-4 py-4 text-ink/70">
                        <span className="flex items-center gap-3"><Lock className="size-4 text-slate" aria-label="Bloqueada" />{l.title}</span>
                        <span className="text-[0.85rem] text-slate">{l.duration_min} min</span>
                      </p>
                    ) : (
                      <Link href={`/academia/${course.slug}/${l.slug}`} className="flex items-center justify-between gap-4 py-4 hover:text-navy">
                        <span className="flex items-center gap-3"><PlayCircle className="size-4 text-navy" aria-hidden />{l.title}</span>
                        <span className="text-[0.85rem] text-navy">Gratis, {l.duration_min} min</span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
