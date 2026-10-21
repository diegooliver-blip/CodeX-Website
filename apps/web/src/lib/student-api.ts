import "server-only";
import { cookies } from "next/headers";
import type { PublicCourse } from "@/lib/api";
import { API_URL, apiHeaders } from "@/lib/api-base";
import { STUDENT_ACCESS_COOKIE } from "@/lib/student-session";

/** Per-student reads for server components. Never cached: the answer depends on who is asking. */

export type StudentCourse = PublicCourse & { inscrito: boolean };

export type StudentOrder = {
  id: string;
  estado: "pendiente" | "pagada" | "fallida" | "reembolsada";
  monto_centavos: number;
  moneda: string;
  proveedor: string;
  curso: string;
  creado_en: string;
};

async function studentGet<T>(path: string): Promise<T | null> {
  const token = (await cookies()).get(STUDENT_ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/alumnos${path}`, {
      headers: apiHeaders({ authorization: `Bearer ${token}` }),
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function hasStudentSession(): Promise<boolean> {
  return Boolean((await cookies()).get(STUDENT_ACCESS_COOKIE)?.value);
}

export const getStudent = () => studentGet<{ id: string; email: string; nombre: string; verificado: boolean }>("/me");
export const getStudentCourse = (slug: string) => studentGet<StudentCourse>(`/cursos/${encodeURIComponent(slug)}`);
export const getStudentCourses = () => studentGet<PublicCourse[]>("/cursos");
export const getStudentOrder = (id: string) => studentGet<StudentOrder>(`/ordenes/${encodeURIComponent(id)}`);
