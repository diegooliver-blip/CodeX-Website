import type { Metadata } from "next";
import { Suspense } from "react";
import { SetPasswordForm } from "@/components/clientes/AuthForms";
import { AuthScreen } from "@/components/clientes/PortalShell";

export const metadata: Metadata = { title: "Restablecer contraseña" };

export default function Page() {
  return (
    <AuthScreen eyebrow="Portal de clientes" title="Nueva contraseña." lede="Elige una contraseña nueva. Al guardarla cerramos cualquier otra sesión abierta.">
      <h2 className="display text-3xl">Elige tu nueva contraseña</h2>
      <div className="mt-8">
        {/* The token comes from the emailed link's query string, read on the client. */}
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-mist" />}>
          <SetPasswordForm accion="restablecer" />
        </Suspense>
      </div>
    </AuthScreen>
  );
}
