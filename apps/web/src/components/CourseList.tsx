import Link from "next/link";
import type { CourseCard } from "@/lib/api";

export function formatPrice(price: number | null) {
  return price ? `$${price.toLocaleString("es-MX")} MXN` : "Precio por anunciar";
}

export function CourseList({ courses, empty }: { courses: CourseCard[]; empty: React.ReactNode }) {
  if (courses.length === 0) return <>{empty}</>;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {courses.map((c) => (
        <li key={c.slug}>
          <Link
            href={`/academia/${c.slug}`}
            className="group grid gap-3 py-7 transition-colors md:grid-cols-[1fr_auto] md:items-end md:gap-10"
          >
            <div>
              <p className="text-[0.85rem] text-ash">
                {c.category}
                <span className="mx-2 text-line">/</span>
                {c.level}
              </p>
              <h3 className="display mt-2 text-[clamp(1.7rem,2.6vw,2.4rem)] group-hover:text-champagne">{c.title}</h3>
              {c.subtitle && <p className="mt-2 max-w-2xl text-ash">{c.subtitle}</p>}
            </div>
            <p className="text-[0.92rem] text-ash md:text-right">
              {c.lessons} lecciones, {Math.round(c.minutes / 6) / 10} h
              <span className="block text-champagne">{formatPrice(c.price_mxn)}</span>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
