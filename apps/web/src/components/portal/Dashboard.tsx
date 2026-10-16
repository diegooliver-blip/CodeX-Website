"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { portal, type AdminCourse, type KnowledgeDoc, type Lead } from "@/lib/portal-client";

export function Dashboard() {
  const [data, setData] = useState<{ me: { name: string }; courses: AdminCourse[]; leads: Lead[]; docs: KnowledgeDoc[]; weekAgo: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      portal<{ name: string }>("me"),
      portal<AdminCourse[]>("courses"),
      portal<Lead[]>("leads"),
      portal<KnowledgeDoc[]>("rag/documents"),
    ])
      .then(([me, courses, leads, docs]) => setData({ me, courses, leads, docs, weekAgo: Date.now() - 7 * 864e5 }))
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-danger" role="alert">{error}</p>;
  if (!data) return <div className="h-64 animate-pulse rounded-2xl bg-graphite/60" />;

  const { weekAgo } = data;
  const stats = [
    { label: "Cursos publicados", value: data.courses.filter((c) => c.status === "published").length, href: "/portal/cursos" },
    { label: "Borradores", value: data.courses.filter((c) => c.status === "draft").length, href: "/portal/cursos" },
    { label: "Leads esta semana", value: data.leads.filter((l) => Date.parse(l.created_at) > weekAgo).length, href: "/portal/leads" },
    { label: "Documentos del asistente", value: data.docs.length, href: "/portal/conocimiento" },
  ];

  return (
    <>
      <h1 className="display text-5xl">Hola, {data.me.name.split(" ")[0] || "equipo"}.</h1>
      <dl className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-2xl border border-line p-6 hover:border-gold/60">
            <dt className="text-[0.9rem] text-ash">{s.label}</dt>
            <dd className="display mt-2 text-5xl text-gold">{s.value}</dd>
          </Link>
        ))}
      </dl>
      <section className="mt-14">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Últimos leads</h2>
          <Link href="/portal/leads" className="link-underline text-[0.92rem] text-champagne">Ver todos</Link>
        </div>
        {data.leads.length === 0 ? (
          <p className="mt-4 text-ash">Aún no hay leads. Llegan desde el formulario de contacto y la academia.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {data.leads.slice(0, 6).map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 py-3 text-[0.95rem]">
                <span>{l.name} <span className="text-ash">{l.email}</span></span>
                <span className="text-ash">{l.source}{l.service ? `, ${l.service}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
