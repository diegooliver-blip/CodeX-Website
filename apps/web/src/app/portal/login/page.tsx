import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/portal/LoginForm";

export const metadata: Metadata = { title: "Ingresar al portal", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-md">
        <Link href="/" className="display text-3xl tracking-[0.06em]">CODEX</Link>
        <h1 className="display mt-10 text-5xl">Portal</h1>
        <p className="mt-3 text-slate">Administra cursos, leads y la base de conocimiento del asistente.</p>
        <div className="mt-10">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
