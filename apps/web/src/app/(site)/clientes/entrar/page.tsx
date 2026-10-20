import type { Metadata } from "next";
import { ClientLoginForm } from "@/components/clientes/AuthForms";
import { AuthScreen } from "@/components/clientes/PortalShell";

export const metadata: Metadata = { title: "Portal de clientes" };

export default function EntrarPage() {
  return (
    <AuthScreen
      eyebrow="Portal de clientes"
      title="Tus proyectos, en tiempo real."
      lede="Consulta en qué etapa va cada servicio que tienes con CODEX, los avances publicados, tus entregables y si tus sistemas están en línea."
    >
      <h2 className="display text-3xl">Entrar</h2>
      <p className="mt-2 text-sm text-slate">El acceso es solo por invitación. Si no tienes cuenta, pídela a tu contacto en CODEX.</p>
      <div className="mt-8">
        <ClientLoginForm />
      </div>
    </AuthScreen>
  );
}
