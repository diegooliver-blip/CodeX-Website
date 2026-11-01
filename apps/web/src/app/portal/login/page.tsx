import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/portal/LoginForm";

export const metadata: Metadata = { title: "Ingresar al portal", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-block" aria-label="CODEX AI Consulting, inicio"><Logo priority className="h-11 w-auto" /></Link>
        <h1 className="display mt-10 text-5xl">Portal</h1>
        <p className="mt-3 text-slate">Administra cursos y leads.</p>
        <div className="mt-10">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
