import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PanelShell } from "@/components/clientes/PortalShell";
import { ReportDownload } from "@/components/clientes/PortalActions";
import { getOverview } from "@/lib/clientes-api";
import { fmtMonth } from "@/lib/clientes-format";

export const metadata: Metadata = { title: "Reportes" };

export default function ReportsPage() {
  return (
    <Suspense fallback={<PanelShell eyebrow="Reportes" title="Cargando…"><div className="h-64 animate-pulse rounded-[28px] bg-mist" /></PanelShell>}>
      <Reports />
    </Suspense>
  );
}

async function Reports() {
  const res = await getOverview();
  if (!res.ok && res.status === 401) redirect("/clientes/entrar?next=/clientes/panel/reportes");
  const months = res.ok ? res.data.reportes : [];
  const [current, ...past] = months;

  return (
    <PanelShell eyebrow="Reportes" title="Tu mes en un PDF.">
      {current ? (
        <>
          <section className="flex flex-col justify-between gap-6 rounded-[28px] bg-navy p-8 text-paper md:flex-row md:items-center">
            <div className="flex items-center gap-5">
              <FileText aria-hidden className="size-10 text-spark" strokeWidth={1.4} />
              <div>
                <p className="text-sm text-paper/70">Mes en curso</p>
                <p className="display text-3xl capitalize">{fmtMonth(current)}</p>
              </div>
            </div>
            <div className="theme-dark">
              <ReportDownload mes={current} label="Descargar PDF" />
            </div>
          </section>
          {past.length > 0 && (
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((m) => (
                <li key={m} className="flex items-center justify-between gap-4 rounded-[20px] border border-line px-6 py-4">
                  <span className="display text-xl capitalize">{fmtMonth(m)}</span>
                  <ReportDownload mes={m} label="PDF" />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="text-slate">Tu primer reporte aparece al cerrar tu primer mes.</p>
      )}
    </PanelShell>
  );
}
