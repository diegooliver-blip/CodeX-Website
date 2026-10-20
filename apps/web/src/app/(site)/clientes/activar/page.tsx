import type { Metadata } from "next";
import { Suspense } from "react";
import { SetPasswordForm } from "@/components/clientes/AuthForms";
import { AuthScreen } from "@/components/clientes/PortalShell";

export const metadata: Metadata = { title: "Activar cuenta" };

export default function Page() {
  return (
    <AuthScreen eyebrow="Portal de clientes" title="Activa tu cuenta." lede="Crea la contraseña con la que entrarás a tu portal. El enlace de invitación vence en 72 horas.">
      <h2 className="display text-3xl">Crear contraseña</h2>
      <div className="mt-8">
        {/* The token comes from the emailed link's query string, read on the client. */}
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-mist" />}>
          <SetPasswordForm accion="activar" />
        </Suspense>
      </div>
    </AuthScreen>
  );
}
