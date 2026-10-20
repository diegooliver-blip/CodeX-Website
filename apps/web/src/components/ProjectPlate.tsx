import Link from "next/link";
import type { Project } from "@/lib/content";

/** Editorial project plate: the facts are the hero of each card, set large in the display face. */
export function ProjectPlate({ project, large = false }: { project: Project; large?: boolean }) {
  return (
    <Link
      href={`/proyectos/${project.slug}`}
      className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[22px] border border-line bg-mist/50 p-7 transition-colors duration-500 hover:border-signal/60 md:p-9"
    >
      <div>
        <p className="text-[0.85rem] text-slate">
          {project.category}
          <span className="mx-2 text-line">/</span>
          {project.sector}
        </p>
        <h3 className={`display mt-5 leading-[1.04] text-ink transition-colors group-hover:text-navy ${large ? "text-[clamp(2rem,3.6vw,3.25rem)]" : "text-[1.85rem]"}`}>
          {project.title}
        </h3>
        <p className={`mt-4 text-slate ${large ? "max-w-xl text-[1.05rem]" : "text-[0.95rem]"}`}>{project.summary}</p>
        {large && (
          <>
            <ul className="mt-10 grid max-w-2xl gap-x-8 gap-y-3 sm:grid-cols-2">
              {project.features.slice(0, 6).map((f) => (
                <li key={f} className="flex gap-3 text-[0.95rem] text-ink/80">
                  <span aria-hidden className="mt-[0.6rem] h-px w-4 shrink-0 bg-signal" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[0.88rem] text-slate">{project.stack.join(", ")}</p>
          </>
        )}
      </div>
      <dl className={`mt-10 grid gap-6 border-t border-line pt-6 ${large ? "grid-cols-3" : "grid-cols-2"}`}>
        {project.facts.slice(0, large ? 3 : 2).map((f) => (
          <div key={f.label}>
            <dt className="sr-only">{f.label}</dt>
            <dd className="display text-[2.1rem] leading-none text-navy">{f.value}</dd>
            <dd className="mt-2 text-[0.82rem] leading-snug text-slate">{f.label}</dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}
