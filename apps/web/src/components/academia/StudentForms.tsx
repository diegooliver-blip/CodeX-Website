"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { errorCode, errorMessage } from "@/lib/api-error";

async function post(path: string, body?: unknown, headers?: HeadersInit) {
  const res = await fetch(`/api/alumnos/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);
  const data = res && res.status !== 204 ? await res.json().catch(() => null) : null;
  return { res, data };
}

/** Where to go after signing in: ?siguiente=, but only same-site academy paths. */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("siguiente");
  return next?.startsWith("/academia") ? next : "/academia/mis-cursos";
}

const fieldLabel = "text-sm text-slate";

export function StudentAuthForm() {
  const [mode, setMode] = useState<"login" | "registro">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { res, data } = await post(mode, Object.fromEntries(new FormData(e.currentTarget)));
    // Full navigation so the server sees the new httpOnly cookies.
    if (res?.ok) return window.location.assign(nextPath());
    setError(
      res?.status === 429
        ? "Demasiados intentos seguidos. Espera un minuto."
        : errorMessage(data, "No pudimos continuar. Intenta de nuevo."),
    );
    if (errorCode(data) === "CORREO_REGISTRADO") setMode("login");
    setBusy(false);
  }

  return (
    <div>
      <div role="tablist" aria-label="Acceso a la academia" className="grid grid-cols-2 rounded-full border border-line p-1 text-sm">
        {(["login", "registro"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => { setMode(m); setError(""); }}
            className={`rounded-full px-4 py-2 transition-colors ${mode === m ? "bg-ink text-paper" : "text-slate hover:text-ink"}`}
          >
            {m === "login" ? "Ya tengo cuenta" : "Crear cuenta"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-8 space-y-6">
        {mode === "registro" && (
          <label className="block">
            <span className={fieldLabel}>Nombre</span>
            <input name="nombre" required minLength={2} maxLength={200} autoComplete="name" className="field" />
          </label>
        )}
        <label className="block">
          <span className={fieldLabel}>Correo</span>
          <input name="email" type="email" required autoComplete="username" className="field" />
        </label>
        <label className="block">
          <span className={fieldLabel}>Contraseña{mode === "registro" && ", mínimo 10 caracteres"}</span>
          <input
            name="password"
            type="password"
            required
            minLength={mode === "registro" ? 10 : 8}
            autoComplete={mode === "registro" ? "new-password" : "current-password"}
            className="field"
          />
        </label>
        {error && <p className="text-danger" role="alert">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-primary w-full disabled:opacity-60">
          {busy ? "Un momento…" : mode === "login" ? "Entrar" : "Crear mi cuenta"}
        </button>
        {mode === "login" && (
          <p className="text-center text-sm">
            <Link href="/academia/recuperar" className="link-underline text-navy">¿Olvidaste tu contraseña?</Link>
          </p>
        )}
      </form>
    </div>
  );
}

export function BuyButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // One key per click intent: a double click or a retry after a network blip creates a single order.
  const key = useRef<string | null>(null);

  async function buy() {
    setBusy(true);
    setError("");
    key.current ??= crypto.randomUUID();
    const { res, data } = await post("checkout", { curso: slug }, { "idempotency-key": key.current });
    if (res?.ok && data?.url) return window.location.assign(data.url);
    if (res?.status === 401) {
      return router.push(`/academia/entrar?siguiente=${encodeURIComponent(`/academia/${slug}`)}`);
    }
    key.current = null;
    setError(errorMessage(data, "No pudimos iniciar la compra. Intenta de nuevo."));
    setBusy(false);
  }

  return (
    <div>
      <button type="button" onClick={buy} disabled={busy} className="btn btn-primary w-full disabled:opacity-60">
        {busy ? "Preparando tu compra…" : "Comprar curso"}
      </button>
      {error && <p className="mt-3 text-danger" role="alert">{error}</p>}
    </div>
  );
}

export function SimulatedPayment({ orderId, slug }: { orderId: string; slug: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"pagado" | "fallido" | null>(null);

  async function pay(estado: "pagado" | "fallido") {
    setBusy(estado);
    setError("");
    const { res, data } = await post(`ordenes/${encodeURIComponent(orderId)}/simular`, { estado });
    if (res?.ok) {
      return window.location.assign(data?.estado === "pagada" ? `/academia/${slug}?compra=ok` : `/academia/pago?orden=${orderId}`);
    }
    setError(errorMessage(data, "No pudimos registrar el pago simulado."));
    setBusy(null);
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => pay("pagado")} disabled={busy !== null} className="btn btn-primary w-full disabled:opacity-60">
        {busy === "pagado" ? "Confirmando…" : "Confirmar pago simulado"}
      </button>
      <button type="button" onClick={() => pay("fallido")} disabled={busy !== null} className="btn btn-ghost w-full disabled:opacity-60">
        Simular pago rechazado
      </button>
      {error && <p className="text-danger" role="alert">{error}</p>}
    </div>
  );
}

export function StudentLogout() {
  const router = useRouter();
  async function logout() {
    await post("logout");
    router.push("/academia");
    router.refresh();
  }
  return (
    <button type="button" onClick={logout} className="link-underline text-sm text-navy">
      Salir
    </button>
  );
}

/** Token from the emailed link (?token=), read on the client so the page itself stays static. */
function linkToken(): string {
  return new URLSearchParams(window.location.search).get("token") ?? "";
}

export function StudentForgotForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError("");
    const { res, data } = await post("olvide", Object.fromEntries(new FormData(e.currentTarget)));
    if (res?.ok) return setState("sent");
    setError(res?.status === 429 ? "Demasiados intentos seguidos. Espera un minuto." : errorMessage(data, "No pudimos procesar la solicitud."));
    setState("idle");
  }

  if (state === "sent") {
    return (
      <div role="status" className="rounded-[22px] border border-line bg-mist-2 p-8">
        <p className="display text-2xl">Revisa tu correo.</p>
        <p className="mt-3 text-slate">Si el correo tiene cuenta, te enviamos un enlace para elegir una contraseña nueva. Vence en 1 hora.</p>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-6">
      <label className="block">
        <span className={fieldLabel}>Correo de tu cuenta</span>
        <input name="email" type="email" required autoComplete="email" className="field" />
      </label>
      {error && <p className="text-danger" role="alert">{error}</p>}
      <button type="submit" disabled={state === "sending"} className="btn btn-primary w-full disabled:opacity-60">
        {state === "sending" ? "Enviando…" : "Enviar enlace"}
      </button>
    </form>
  );
}

export function StudentResetForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("password") !== form.get("confirmar")) return setError("Las contraseñas no coinciden.");
    setBusy(true);
    setError("");
    const { res, data } = await post("restablecer", { token: linkToken(), password: form.get("password") });
    if (res?.ok) {
      router.push("/academia/mis-cursos");
      return router.refresh();
    }
    setError(errorMessage(data, "No pudimos cambiar la contraseña."));
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <label className="block">
        <span className={fieldLabel}>Contraseña nueva, mínimo 10 caracteres</span>
        <input name="password" type="password" required minLength={10} autoComplete="new-password" className="field" />
      </label>
      <label className="block">
        <span className={fieldLabel}>Repítela</span>
        <input name="confirmar" type="password" required minLength={10} autoComplete="new-password" className="field" />
      </label>
      {error && (
        <p className="text-danger" role="alert">
          {error} <Link href="/academia/recuperar" className="link-underline">Pedir otro enlace</Link>
        </p>
      )}
      <button type="submit" disabled={busy} className="btn btn-primary w-full disabled:opacity-60">
        {busy ? "Guardando…" : "Guardar y entrar"}
      </button>
    </form>
  );
}

export function EmailVerification() {
  const [state, setState] = useState<"working" | "ok" | "error">("working");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice; the token works once
    started.current = true;
    post("verificar", { token: linkToken() }).then(({ res }) => setState(res?.ok ? "ok" : "error"));
  }, []);

  if (state === "working") return <p role="status" className="text-slate">Verificando tu correo…</p>;
  return state === "ok" ? (
    <div role="status">
      <p className="display text-2xl">Correo verificado.</p>
      <Link href="/academia/mis-cursos" className="btn btn-primary mt-6 w-full">Ir a mis cursos</Link>
    </div>
  ) : (
    <div role="alert">
      <p className="display text-2xl">El enlace venció o ya se usó.</p>
      <p className="mt-3 text-slate">Entra a tu cuenta y pide un enlace nuevo desde Mis cursos.</p>
      <Link href="/academia/entrar" className="btn btn-ghost mt-6 w-full">Entrar</Link>
    </div>
  );
}

export function ResendVerification() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  async function resend() {
    setState("sending");
    const { res } = await post("reenviar-verificacion");
    setState(res?.ok ? "sent" : "idle");
  }
  return state === "sent" ? (
    <span>Te enviamos un enlace nuevo.</span>
  ) : (
    <button type="button" onClick={resend} disabled={state === "sending"} className="link-underline text-navy disabled:opacity-60">
      Reenviar enlace
    </button>
  );
}
