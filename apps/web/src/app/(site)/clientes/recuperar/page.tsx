import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/clientes/AuthForms";
import { AuthScreen } from "@/components/clientes/PortalShell";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <AuthScreen
      eyebrow="Portal de clientes"
      title="Recupera tu acceso."
      lede="Te enviamos un enlace de un solo uso a tu correo. Por seguridad vence en una hora."
    >
      <h2 className="display text-3xl">Restablecer contraseña</h2>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href="/clientes/entrar" className="link-underline text-navy">Volver a entrar</Link>
      </p>
    </AuthScreen>
  );
}
