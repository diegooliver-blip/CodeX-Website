import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StudentLogout } from "@/components/academia/StudentForms";
import { CourseList } from "@/components/CourseList";
import { getStudent, getStudentCourses } from "@/lib/student-api";

export const metadata: Metadata = { title: "Mis cursos", robots: { index: false } };

export default function MyCoursesPage() {
  return (
    <section className="mx-auto max-w-[1440px] px-5 pb-28 pt-36 md:px-10 md:pt-44">
      <Suspense fallback={<div className="h-[50vh] animate-pulse rounded-[22px] bg-mist/50" />}>
        <MyCourses />
      </Suspense>
    </section>
  );
}

async function MyCourses() {
  const [student, courses] = await Promise.all([getStudent(), getStudentCourses()]);
  if (!student) redirect("/academia/entrar?siguiente=/academia/mis-cursos");
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-slate">Hola, {student.nombre.split(" ")[0]}</p>
          <h1 className="display mt-3 text-[clamp(2.4rem,5vw,4rem)]">Mis cursos</h1>
        </div>
        <StudentLogout />
      </div>
      <div className="mt-14">
        <CourseList
          courses={courses ?? []}
          empty={
            <div className="rounded-[22px] border border-line p-10">
              <p className="display text-2xl">Aún no tienes cursos.</p>
              <Link href="/academia" className="btn btn-primary mt-6">Ver la academia</Link>
            </div>
          }
        />
      </div>
    </>
  );
}
