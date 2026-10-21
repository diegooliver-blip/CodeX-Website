import type { Metadata } from "next";
import { StudentAuthForm } from "@/components/academia/StudentForms";
import { AuthScreen } from "@/components/clientes/PortalShell";

export const metadata: Metadata = { title: "Entrar a la academia", robots: { index: false } };

export default function StudentSignInPage() {
  return (
    <AuthScreen
      eyebrow="Academia CODEX"
      title="Aprende a tu ritmo."
      lede="Con tu cuenta compras cursos y ves todas sus lecciones, cuando quieras y desde cualquier dispositivo."
    >
      <h2 className="display text-3xl">Tu cuenta de alumno</h2>
      <div className="mt-8">
        <StudentAuthForm />
      </div>
    </AuthScreen>
  );
}
