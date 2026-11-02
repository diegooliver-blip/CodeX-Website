import type { Metadata } from "next";
import Link from "next/link";
import { ClientLoginForm } from "@/components/clientes/AuthForms";
import { AuthScreen } from "@/components/clientes/PortalShell";

export const metadata: Metadata = { title: "Portal de clientes" };

export default function EntrarPage() {
  return (
    <AuthScreen
      eyebrow="Portal de clientes"
      title="Todo tu proyecto, en un vistazo."
      lede="Avance de cada servicio, pagos, reportes mensuales y tu membresía CODEX+."
    >
      <h2 className="display text-3xl">Entrar</h2>
      <p className="mt-2 text-sm text-slate">Acceso por invitación. Si no tienes cuenta, pídela a tu contacto en CODEX.</p>
      <div className="mt-8">
        <ClientLoginForm />
      </div>
      <p className="mt-8 border-t border-line pt-5 text-sm text-slate">
        ¿Eres del equipo CODEX?{" "}
        <Link href="/portal/login" className="link-underline text-navy">
          Entra al portal interno
        </Link>
      </p>
    </AuthScreen>
  );
}
