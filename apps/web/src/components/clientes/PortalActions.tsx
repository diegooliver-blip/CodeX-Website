"use client";

import { Check, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "@/lib/api-error";
import type { ServiceSettings } from "@/lib/clientes-api";

async function send(path: string, method: "POST" | "PUT" = "POST", body?: unknown) {
  const res = await fetch(`/api/clientes/datos/${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);
  const data = await res?.json().catch(() => null);
  return { ok: !!res?.ok, data };
}

function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

const ErrorLine = ({ error }: { error: string }) =>
  error ? (
    <span role="alert" className="block text-sm text-danger">
      {error}
    </span>
  ) : null;

/** Starts the gateway checkout for one charge; the browser leaves for Mercado Pago (or the simulated page). */
export function PayButton({ chargeId, label = "Pagar", className = "btn btn-primary min-h-11 px-5 text-sm" }: { chargeId: string; label?: string; className?: string }) {
  const { busy, error, setError, run } = useAction();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        className={className}
        onClick={() =>
          run(async () => {
            const { ok, data } = await send(`pagos/${chargeId}/checkout`);
            if (ok && data?.url) window.location.assign(data.url);
            else setError(errorMessage(data, "No se pudo iniciar el pago."));
          })
        }
      >
        {busy ? "Abriendo pago…" : label}
      </button>
      <ErrorLine error={error} />
    </span>
  );
}

/** Mock gateway only: stands in for the gateway's confirmation so the full flow can be tried without money. */
export function SimulatedPayment({ pagoId }: { pagoId: string }) {
  const router = useRouter();
  const { busy, error, setError, run } = useAction();
  const act = (estado: "pagado" | "fallido") =>
    run(async () => {
      const { ok, data } = await send(`pagos/simular/${pagoId}`, "POST", { estado });
      if (!ok) setError(errorMessage(data, "No se pudo simular."));
      router.replace("/clientes/panel/pagos");
      router.refresh();
    });
  return (
    <div className="rounded-[28px] border-2 border-dashed border-signal bg-mist-2 p-6">
      <p className="font-semibold">Pasarela de prueba</p>
      <p className="mt-1 text-sm text-slate">No se mueve dinero. Elige el resultado del pago.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => act("pagado")} className="btn btn-primary min-h-11 px-5 text-sm">
          Aprobar pago
        </button>
        <button type="button" disabled={busy} onClick={() => act("fallido")} className="btn btn-ghost min-h-11 px-5 text-sm">
          Rechazar
        </button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

export function SubscribeButton({ label = "Activar CODEX+", className = "btn btn-primary min-h-12 px-6" }: { label?: string; className?: string }) {
  const { busy, error, setError, run } = useAction();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        className={className}
        onClick={() =>
          run(async () => {
            const { ok, data } = await send("membresia/suscribir");
            if (ok && data?.url) window.location.assign(data.url);
            else setError(errorMessage(data, "No se pudo iniciar la suscripción."));
          })
        }
      >
        {busy ? "Abriendo…" : label}
      </button>
      <ErrorLine error={error} />
    </span>
  );
}

export function MembershipControls({ estado, simulated }: { estado: string; simulated: boolean }) {
  const router = useRouter();
  const { busy, error, setError, run } = useAction();
  const [confirm, setConfirm] = useState(false);
  const call = (path: string) =>
    run(async () => {
      const { ok, data } = await send(path);
      if (!ok) setError(errorMessage(data, "No se pudo completar."));
      setConfirm(false);
      router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-3">
      {simulated && estado === "pendiente" && (
        <button type="button" disabled={busy} onClick={() => call("membresia/simular")} className="btn btn-primary min-h-11 px-5 text-sm">
          Confirmar pago de prueba
        </button>
      )}
      {(estado === "activa" || estado === "pausada" || estado === "pendiente") &&
        (confirm ? (
          <>
            <span className="text-sm">¿Cancelar tu membresía?</span>
            <button type="button" disabled={busy} onClick={() => call("membresia/cancelar")} className="btn btn-ghost min-h-11 px-5 text-sm">
              Sí, cancelar
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="link-underline text-sm">
              No
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="link-underline text-sm opacity-80">
            Cancelar membresía
          </button>
        ))}
      <ErrorLine error={error} />
    </div>
  );
}

/** "Me interesa": the team gets the lead; the button confirms in place. */
export function InterestButton({ tipo, slug, label = "Me interesa", className = "btn btn-ghost min-h-11 px-5 text-sm" }: { tipo: "servicio" | "combo" | "skill" | "membresia"; slug: string; label?: string; className?: string }) {
  const { busy, error, setError, run } = useAction();
  const [done, setDone] = useState(false);
  if (done)
    return (
      <span className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-navy">
        <Check aria-hidden className="size-4" /> Te contactamos pronto
      </span>
    );
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        className={className}
        onClick={() =>
          run(async () => {
            const { ok, data } = await send("interes", "POST", { tipo, slug });
            if (ok) setDone(true);
            else setError(errorMessage(data, "No se pudo enviar."));
          })
        }
      >
        {busy ? "Enviando…" : label}
      </button>
      <ErrorLine error={error} />
    </span>
  );
}

export function ReportDownload({ mes, label }: { mes: string; label: string }) {
  return (
    <a href={`/api/clientes/datos/reportes/${mes}.pdf`} download className="btn btn-ghost min-h-11 gap-2 px-5 text-sm">
      <Download aria-hidden className="size-4" />
      {label}
    </a>
  );
}

export function InvoiceButton({ chargeId }: { chargeId: string }) {
  const { busy, error, setError, run } = useAction();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        className="link-underline text-sm"
        onClick={() =>
          run(async () => {
            const res = await fetch(`/api/clientes/datos/pagos/${chargeId}/factura`).catch(() => null);
            const data = await res?.json().catch(() => null);
            if (res?.ok && data?.url) window.location.assign(data.url);
            else setError(errorMessage(data, "Factura no disponible."));
          })
        }
      >
        {busy ? "Preparando…" : "Factura"}
      </button>
      <ErrorLine error={error} />
    </span>
  );
}

const WINDOWS: { value: ServiceSettings["ventana_mantenimiento"]; label: string }[] = [
  { value: "domingo_noche", label: "Domingo en la noche" },
  { value: "sabado_noche", label: "Sábado en la noche" },
  { value: "entre_semana_noche", label: "Entre semana, de noche" },
  { value: "coordinar", label: "Coordinar cada vez" },
];

export function SettingsForm({ serviceId, initial }: { serviceId: string; initial: ServiceSettings }) {
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(false);
  const { busy, error, setError, run } = useAction();
  const toggle = (k: "avisos_avance" | "avisos_caida", label: string, hint: string) => (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="text-sm text-slate">{hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={s[k]}
        onChange={(e) => {
          setSaved(false);
          setS({ ...s, [k]: e.target.checked });
        }}
        className="mt-1 size-5 accent-navy"
      />
    </label>
  );
  return (
    <form
      className="divide-y divide-line"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const { ok, data } = await send(`servicios/${serviceId}/ajustes`, "PUT", s);
          if (ok) setSaved(true);
          else setError(errorMessage(data, "No se pudo guardar."));
        });
      }}
    >
      {toggle("avisos_avance", "Avisos de avance", "Correo cuando publiquemos un avance.")}
      {toggle("avisos_caida", "Alertas de caída", "Correo si el monitor detecta que no responde.")}
      <label className="block py-3">
        <span className="block font-semibold">Contacto técnico</span>
        <input
          type="text"
          maxLength={200}
          value={s.contacto_tecnico}
          placeholder="Nombre o correo de tu responsable de TI"
          onChange={(e) => {
            setSaved(false);
            setS({ ...s, contacto_tecnico: e.target.value });
          }}
          className="mt-2 min-h-11 w-full rounded-xl border border-line px-4"
        />
      </label>
      <label className="block py-3">
        <span className="block font-semibold">Ventana de mantenimiento</span>
        <select
          value={s.ventana_mantenimiento}
          onChange={(e) => {
            setSaved(false);
            setS({ ...s, ventana_mantenimiento: e.target.value as ServiceSettings["ventana_mantenimiento"] });
          }}
          className="mt-2 min-h-11 w-full rounded-xl border border-line bg-paper px-4"
        >
          {WINDOWS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-4 pt-4">
        <button type="submit" disabled={busy} className="btn btn-ghost min-h-11 px-5 text-sm">
          {busy ? "Guardando…" : "Guardar ajustes"}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-navy" role="status">
            <Check aria-hidden className="size-4" /> Guardado
          </span>
        )}
        <ErrorLine error={error} />
      </div>
    </form>
  );
}
