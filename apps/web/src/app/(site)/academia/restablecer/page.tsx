import type { Metadata } from "next";
import { StudentResetForm } from "@/components/academia/StudentForms";
import { AuthScreen } from "@/components/clientes/PortalShell";

export const metadata: Metadata = { title: "Nueva contraseña", robots: { index: false } };

export default function StudentResetPage() {
  return (
    <AuthScreen eyebrow="Academia CODEX" title="Elige una contraseña nueva." lede="Al guardarla entras directo a tus cursos.">
      <h2 className="display text-3xl">Contraseña nueva</h2>
      <div className="mt-8">
        <StudentResetForm />
      </div>
    </AuthScreen>
  );
}
