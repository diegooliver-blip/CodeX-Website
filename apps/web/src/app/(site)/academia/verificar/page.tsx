import type { Metadata } from "next";
import { EmailVerification } from "@/components/academia/StudentForms";
import { AuthScreen } from "@/components/clientes/PortalShell";

export const metadata: Metadata = { title: "Verificar correo", robots: { index: false } };

export default function StudentVerifyPage() {
  return (
    <AuthScreen eyebrow="Academia CODEX" title="Confirma tu correo." lede="Así podemos avisarte de tus compras y ayudarte a recuperar el acceso si lo necesitas.">
      <h2 className="display text-3xl">Verificación</h2>
      <div className="mt-8">
        <EmailVerification />
      </div>
    </AuthScreen>
  );
}
