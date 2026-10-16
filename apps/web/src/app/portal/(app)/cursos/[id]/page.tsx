import { Suspense } from "react";
import { CourseEditor } from "@/components/portal/CourseEditor";

export const metadata = { title: "Editar curso" };

export default function EditCoursePage({ params }: PageProps<"/portal/cursos/[id]">) {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl bg-graphite/60" />}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: { params: PageProps<"/portal/cursos/[id]">["params"] }) {
  const { id } = await params;
  return <CourseEditor id={id} />;
}
