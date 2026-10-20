import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChangePasswordForm, LogoutButton } from "@/components/clientes/AuthForms";
import { PanelShell } from "@/components/clientes/PortalShell";
import { getMe } from "@/lib/clientes-api";

export const metadata: Metadata = { title: "Mi cuenta" };

export default function CuentaPage() {
  return (
    <Suspense fallback={<PanelShell eyebrow="Mi cuenta" title="Cargando…"><div className="h-64 animate-pulse rounded-[28px] bg-mist" /></PanelShell>}>
      <Account />
    </Suspense>
  );
}

async function Account() {
  const me = await getMe();
  if (!me.ok && me.status === 401) redirect("/clientes/entrar?next=/clientes/panel/cuenta");
  if (!me.ok) redirect("/clientes/panel");
  return (
    <PanelShell
      eyebrow={me.data.cliente}
      title="Mi cuenta"
      back={{ href: "/clientes/panel", label: "Mis servicios" }}
      actions={<LogoutButton />}
    >
      <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <dl className="space-y-5">
          <div>
            <dt className="text-sm text-slate">Nombre</dt>
            <dd className="text-lg font-semibold">{me.data.nombre || "Sin nombre registrado"}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate">Correo</dt>
            <dd className="text-lg font-semibold">{me.data.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate">Empresa</dt>
            <dd className="text-lg font-semibold">{me.data.cliente}</dd>
          </div>
        </dl>
        <section aria-labelledby="cambiar" className="rounded-[28px] border border-line p-7 md:p-8">
          <h2 id="cambiar" className="display text-2xl">Cambiar contraseña</h2>
          <div className="mt-6">
            <ChangePasswordForm />
          </div>
        </section>
      </div>
    </PanelShell>
  );
}
