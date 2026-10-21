import type { Metadata } from "next";
import { StudentForgotForm } from "@/components/academia/StudentForms";
import { AuthScreen } from "@/components/clientes/PortalShell";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default function StudentForgotPage() {
  return (
    <AuthScreen eyebrow="Academia CODEX" title="Recupera tu acceso." lede="Te mandamos un enlace a tu correo para que elijas una contraseña nueva. Tus cursos siguen ahí.">
      <h2 className="display text-3xl">Olvidé mi contraseña</h2>
      <div className="mt-8">
        <StudentForgotForm />
      </div>
    </AuthScreen>
  );
}
