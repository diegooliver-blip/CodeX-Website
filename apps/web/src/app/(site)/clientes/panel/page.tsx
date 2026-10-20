import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LogoutButton } from "@/components/clientes/AuthForms";
import { PanelShell } from "@/components/clientes/PortalShell";
import { ServiceCardView } from "@/components/clientes/ServiceViews";
import { getMe, getServices } from "@/lib/clientes-api";
import { site } from "@/lib/content";

export const metadata: Metadata = { title: "Mis servicios" };

export default function PanelPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Panel />
    </Suspense>
  );
}

async function Panel() {
  const [me, services] = await Promise.all([getMe(), getServices()]);
  if (!me.ok && me.status === 401) redirect("/clientes/entrar?next=/clientes/panel");
  if (!me.ok || !services.ok) return <Unavailable />;

  return (
    <PanelShell
      eyebrow={me.data.cliente}
      title={`Hola, ${me.data.nombre.split(" ")[0] || "bienvenido"}.`}
      lede="Este es el estado de los servicios que tienes con CODEX. Se actualiza en cuanto el equipo publica un avance."
      actions={
        <>
          <Link href="/clientes/panel/cuenta" className="btn btn-ghost min-h-11 px-5 text-sm">Mi cuenta</Link>
          <LogoutButton />
        </>
      }
    >
      {me.data.es_demo && (
        <p className="mb-8 rounded-2xl border border-spark bg-spark/30 px-5 py-3 text-sm">
          Cuenta de demostración: los servicios mostrados son de ejemplo.
        </p>
      )}
      {services.data.length === 0 ? (
        <div className="rounded-[28px] border border-line bg-mist-2 p-10">
          <p className="display text-2xl">Todavía no hay servicios publicados.</p>
          <p className="mt-3 max-w-xl text-slate">
            En cuanto arranquemos tu proyecto verás aquí su etapa, avances y entregables. ¿Dudas?{" "}
            <a href={site.contact.whatsapp} className="link-underline text-navy" target="_blank" rel="noopener">Escríbenos</a>.
          </p>
        </div>
      ) : (
        <ul className="grid gap-5 lg:grid-cols-2">
          {services.data.map((s) => (
            <li key={s.id}>
              <ServiceCardView s={s} />
            </li>
          ))}
        </ul>
      )}
    </PanelShell>
  );
}

function Unavailable() {
  return (
    <PanelShell eyebrow="Portal de clientes" title="El portal no responde.">
      <p className="max-w-xl text-slate">
        Estamos teniendo un problema temporal. Intenta de nuevo en unos minutos o{" "}
        <a href={site.contact.whatsapp} className="link-underline text-navy" target="_blank" rel="noopener">escríbenos por WhatsApp</a>.
      </p>
    </PanelShell>
  );
}

function PanelSkeleton() {
  return (
    <PanelShell eyebrow="Portal de clientes" title="Cargando tus servicios…">
      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-80 animate-pulse rounded-[28px] bg-mist" />
        ))}
      </div>
    </PanelShell>
  );
}
