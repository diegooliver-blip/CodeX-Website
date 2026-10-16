import "server-only";
import { cacheLife, cacheTag } from "next/cache";

import { API_URL, apiHeaders } from "@/lib/api-base";

export { API_URL, apiHeaders };

export type CourseCard = {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  level: string;
  cover_url: string | null;
  price_mxn: number | null;
  lessons: number;
  minutes: number;
};

export type PublicLesson = {
  title: string;
  slug: string;
  kind: "video" | "pdf" | "text";
  duration_min: number;
  is_free: boolean;
  locked: boolean;
  body: string;
  asset_url: string | null;
};

export type PublicCourse = CourseCard & {
  description: string;
  modules: { title: string; lessons: PublicLesson[] }[];
};

const courseLife = { stale: 60, revalidate: 120, expire: 3600 };

export async function getCourses(): Promise<CourseCard[]> {
  "use cache";
  cacheLife(courseLife);
  cacheTag("courses");
  try {
    const res = await fetch(`${API_URL}/courses`, { headers: apiHeaders() });
    return res.ok ? await res.json() : [];
  } catch {
    return []; // API unreachable (e.g. during build): render the empty state, retry on revalidate
  }
}

export async function getCourse(slug: string): Promise<PublicCourse | null> {
  "use cache";
  cacheLife(courseLife);
  cacheTag("courses", `course:${slug}`);
  try {
    const res = await fetch(`${API_URL}/courses/${encodeURIComponent(slug)}`, { headers: apiHeaders() });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}
