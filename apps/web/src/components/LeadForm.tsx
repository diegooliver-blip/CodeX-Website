"use client";

import { useRef, useState, type FormEvent } from "react";
import siteJson from "@content/site.json";
import { errorMessage } from "@/lib/api-error";

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
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "offline">("idle");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  // One key per message: retries and double clicks reuse it, so the API stores the lead only once.
  const idempotencyKey = useRef<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    idempotencyKey.current ??= crypto.randomUUID();
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": idempotencyKey.current },
      body: JSON.stringify({ ...Object.fromEntries(form), source, course_slug: courseSlug }),
    }).catch(() => null);
    if (res?.ok) {
      idempotencyKey.current = null;
      return setState("sent");
    }
    // The API is unreachable (not a validation problem): hand the message to WhatsApp or email instead of losing it.
    if (!res || res.status >= 502) {
      const f = Object.fromEntries(form) as Record<string, string>;
      const lines = [
        `Hola CODEX, soy ${f.name ?? ""}${f.company ? ` de ${f.company}` : ""}.`,
        f.message,
        f.email && `Correo: ${f.email}`,
        f.phone && `Teléfono: ${f.phone}`,
      ];
      setDraft(lines.filter(Boolean).join(String.fromCharCode(10)));
      return setState("offline");
    }
    const body = await res.json().catch(() => null);
    setError(
      res?.status === 429
        ? "Recibimos varios mensajes seguidos. Espera un minuto y vuelve a enviarlo."
        : res?.status === 422
          ? "Revisa tu nombre y correo: alguno no tiene el formato correcto."
          : errorMessage(body, "No pudimos enviar tu mensaje. Intenta de nuevo o escríbenos por WhatsApp."),
    );
    setState("error");
  }

  if (state === "offline") {
    const { whatsapp, email } = siteJson.contact;
    return (
      <div className="rounded-2xl border border-ember/50 bg-mist-2 p-8" role="alert">
        <p className="display text-3xl">Envíalo por otro canal.</p>
        <p className="mt-3 text-slate">
          Nuestro sistema de mensajes no responde en este momento. Tu mensaje ya está escrito: elige cómo mandarlo y te
          contestamos igual de rápido.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={`${whatsapp}?text=${encodeURIComponent(draft)}`} target="_blank" rel="noopener" className="btn btn-primary">
            Enviar por WhatsApp
          </a>
          <a
            href={`mailto:${email}?subject=${encodeURIComponent("Contacto desde el sitio")}&body=${encodeURIComponent(draft)}`}
            className="btn btn-ghost"
          >
            Enviar por correo
          </a>
        </div>
      </div>
    );
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
