"use client";

import { useState } from "react";

/** Category filter for the portfolio. Plates are server-rendered and passed in by category. */
export function ProjectExplorer({
  categories,
  plates,
}: {
  categories: string[];
  plates: { slug: string; category: string; node: React.ReactNode }[];
}) {
  const [active, setActive] = useState<string>("Todos");
  const shown = active === "Todos" ? plates : plates.filter((p) => p.category === active);

  return (
    <>
      <div role="group" aria-label="Filtrar por categoría" className="flex flex-wrap gap-2">
        {["Todos", ...categories].map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={active === c}
            onClick={() => setActive(c)}
            className={`rounded-full border px-4 py-2 text-[0.9rem] transition-colors ${
              active === c ? "border-signal bg-signal text-ink" : "border-line text-ink/80 hover:border-signal"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <p className="mt-6 text-[0.9rem] text-slate" aria-live="polite">
        {shown.length} {shown.length === 1 ? "proyecto" : "proyectos"}
      </p>
      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => <div key={p.slug}>{p.node}</div>)}
      </div>
    </>
  );
}
