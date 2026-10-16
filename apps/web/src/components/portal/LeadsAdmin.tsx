"use client";

import { useEffect, useState } from "react";
import { portal, type Lead } from "@/lib/portal-client";

const fmt = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" });

function toCsv(leads: Lead[]) {
  const cols: (keyof Lead)[] = ["created_at", "name", "email", "company", "phone", "service", "source", "course_slug", "message"];
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...leads.map((l) => cols.map((c) => esc(l[c])).join(","))].join("\n");
}

export function LeadsAdmin() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    portal<Lead[]>("leads").then(setLeads).catch((e: Error) => setError(e.message));
  }, []);

  function exportCsv() {
    if (!leads) return;
    const url = URL.createObjectURL(new Blob(["﻿" + toCsv(leads)], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `leads-codex-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-5xl">Leads</h1>
        <button type="button" onClick={exportCsv} disabled={!leads?.length} className="btn btn-ghost disabled:opacity-40">Exportar CSV</button>
      </div>
      {error && <p className="mt-4 text-danger" role="alert">{error}</p>}
      {!leads ? (
        <div className="mt-10 h-60 animate-pulse rounded-2xl bg-graphite/60" />
      ) : leads.length === 0 ? (
        <p className="mt-10 text-ash">Sin leads todavía. Aparecerán aquí al llegar del formulario de contacto o de la academia.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[760px] text-left text-[0.92rem]">
            <thead className="border-b border-line text-ash">
              <tr>
                <th className="px-4 py-3 font-normal">Fecha</th>
                <th className="px-4 py-3 font-normal">Contacto</th>
                <th className="px-4 py-3 font-normal">Interés</th>
                <th className="px-4 py-3 font-normal">Mensaje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {leads.map((l) => (
                <tr key={l.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-ash">{fmt.format(new Date(l.created_at))}</td>
                  <td className="px-4 py-3">
                    {l.name}
                    <a href={`mailto:${l.email}`} className="block text-champagne hover:underline">{l.email}</a>
                    {l.phone && <span className="block text-ash">{l.phone}</span>}
                    {l.company && <span className="block text-ash">{l.company}</span>}
                  </td>
                  <td className="px-4 py-3 text-ash">{l.source}{l.service && <span className="block">{l.service}</span>}{l.course_slug && <span className="block">{l.course_slug}</span>}</td>
                  <td className="max-w-md px-4 py-3 text-ash">{l.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
