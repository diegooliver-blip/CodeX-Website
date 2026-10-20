"use client";

import { useState, type FormEvent } from "react";

type Option = { value: string; label: string };

export function LeadForm({
  services,
  source = "contacto",
  courseSlug = "",
  submitLabel = "Enviar mensaje",
}: {
  services?: Option[];
  source?: "contacto" | "academia";
  courseSlug?: string;
  submitLabel?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...Object.fromEntries(form), source, course_slug: courseSlug }),
    }).catch(() => null);
    if (res?.ok) return setState("sent");
    const body = await res?.json().catch(() => null);
    setError(
      res?.status === 429
        ? "Recibimos varios mensajes seguidos. Espera un minuto y vuelve a enviarlo."
        : res?.status === 422
          ? "Revisa tu nombre y correo: alguno no tiene el formato correcto."
          : (body?.detail as string) ?? "No pudimos enviar tu mensaje. Intenta de nuevo o escríbenos por WhatsApp.",
    );
    setState("error");
  }

  if (state === "sent") {
    return (
      <div className="rounded-2xl border border-signal/40 p-8" role="status">
        <p className="display text-3xl text-navy">Mensaje recibido.</p>
        <p className="mt-3 text-slate">
          {source === "academia"
            ? "Te avisaremos por correo en cuanto abran las inscripciones."
            : "Te respondemos en menos de un día hábil. Si es urgente, escríbenos por WhatsApp."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-6 sm:grid-cols-2">
      <label className="block">
        <span className="text-sm text-slate">Nombre</span>
        <input name="name" required minLength={2} autoComplete="name" className="field" />
      </label>
      <label className="block">
        <span className="text-sm text-slate">Correo</span>
        <input name="email" type="email" required autoComplete="email" className="field" />
      </label>
      {source === "contacto" && (
        <>
          <label className="block">
            <span className="text-sm text-slate">Empresa (opcional)</span>
            <input name="company" autoComplete="organization" className="field" />
          </label>
          <label className="block">
            <span className="text-sm text-slate">Teléfono (opcional)</span>
            <input name="phone" type="tel" autoComplete="tel" className="field" />
          </label>
          {services && (
            <label className="block sm:col-span-2">
              <span className="text-sm text-slate">¿Qué te interesa?</span>
              <select name="service" defaultValue="" className="field appearance-none">
                <option value="" className="bg-mist">Todavía no lo sé</option>
                {services.map((s) => (
                  <option key={s.value} value={s.value} className="bg-mist">{s.label}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="text-sm text-slate">Cuéntanos sobre tu operación</span>
            <textarea name="message" rows={4} maxLength={4000} className="field resize-none" />
          </label>
        </>
      )}
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.85rem] text-slate">Usamos tus datos solo para responderte.</p>
        <button type="submit" disabled={state === "sending"} className="btn btn-primary disabled:opacity-60">
          {state === "sending" ? "Enviando…" : submitLabel}
        </button>
      </div>
      {state === "error" && <p className="text-danger sm:col-span-2" role="alert">{error}</p>}
    </form>
  );
}
