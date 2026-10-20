import Image from "next/image";
import Link from "next/link";
import type { Project } from "@/lib/content";

/** Project card: cover photograph on top, the system's own facts set large underneath. */
export function ProjectPlate({ project, large = false }: { project: Project; large?: boolean }) {
  return (
    <Link
      href={`/proyectos/${project.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-line bg-paper transition-[border-color,translate,box-shadow] duration-500 hover:-translate-y-1.5 hover:border-navy hover:shadow-[0_30px_60px_-35px_rgba(3,20,79,0.45)]"
    >
      <div className={`relative overflow-hidden bg-mist ${large ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
        <Image
          src={project.cover}
          alt=""
          fill
          sizes={large ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"}
          quality={70}
          className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-codex)] group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 rounded-full bg-paper/90 px-3.5 py-1.5 text-[0.8rem] font-semibold text-navy backdrop-blur">
          {project.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-between p-7 md:p-8">
        <div>
          <p className="text-[0.85rem] text-slate">{project.sector}</p>
          <h3 className={`display mt-3 leading-[1.05] transition-colors group-hover:text-navy ${large ? "text-[clamp(2rem,3.6vw,3.25rem)]" : "text-[1.7rem]"}`}>
            {project.title}
          </h3>
          <p className={`mt-4 text-slate ${large ? "max-w-xl text-[1.05rem]" : "text-[0.95rem]"}`}>{project.summary}</p>
        </div>
        <dl className={`mt-8 grid gap-6 border-t border-line pt-6 ${large ? "grid-cols-3" : "grid-cols-2"}`}>
          {project.facts.slice(0, large ? 3 : 2).map((f) => (
            <div key={f.label}>
              <dt className="sr-only">{f.label}</dt>
              <dd className="display text-[2rem] leading-none text-navy">{f.value}</dd>
              <dd className="mt-2 text-[0.82rem] leading-snug text-slate">{f.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Link>
  );
}
