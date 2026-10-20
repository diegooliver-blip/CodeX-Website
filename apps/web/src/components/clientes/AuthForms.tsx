"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import { errorCode, errorMessage } from "@/lib/api-error";
import { Turnstile } from "./Turnstile";

async function post(accion: string, body?: unknown) {
  const res = await fetch(`/api/clientes/auth/${accion}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);
  const data = res && res.status !== 204 ? await res.json().catch(() => null) : null;
  return { res, data };
}

/** Captcha token plus a remount key: bumping the key renders a fresh challenge after a failed attempt. */
function useCaptcha() {
  const [token, setToken] = useState("");
  const [key, setKey] = useState(0);
  const onToken = useCallback((t: string) => setToken(t), []);
  const reset = () => {
    setToken("");
    setKey((k) => k + 1);
  };
  return { token, key, onToken, reset };
}

function goToPanel() {
  const next = new URLSearchParams(window.location.search).get("next");
  // Full navigation so the server sees the new httpOnly cookie.
  window.location.assign(next?.startsWith("/clientes/panel") ? next : "/clientes/panel");
}

const fieldLabel = "text-sm text-slate";

export function ClientLoginForm() {
  const captcha = useCaptcha();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = Object.fromEntries(new FormData(e.currentTarget));
    const { res, data } = await post("login", { ...form, captcha: captcha.token });
    if (res?.ok) return goToPanel();
    setError(
      res?.status === 429
        ? "Demasiados intentos seguidos. Espera un minuto."
        : errorMessage(data, "No pudimos iniciar sesión. Intenta de nuevo."),
    );
    captcha.reset();
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <label className="block">
        <span className={fieldLabel}>Correo</span>
        <input name="email" type="email" required autoComplete="username" className="field" />
      </label>
      <label className="block">
        <span className={fieldLabel}>Contraseña</span>
        <input name="password" type="password" required autoComplete="current-password" className="field" />
      </label>
      <Turnstile key={captcha.key} onToken={captcha.onToken} />
      {error && <p className="text-danger" role="alert">{error}</p>}
      <button type="submit" disabled={busy || !captcha.token} className="btn btn-primary w-full disabled:opacity-60">
        {busy ? "Entrando…" : "Entrar al portal"}
      </button>
      <p className="text-center text-sm">
        <Link href="/clientes/recuperar" className="link-underline text-navy">¿Olvidaste tu contraseña?</Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const captcha = useCaptcha();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError("");
    const form = Object.fromEntries(new FormData(e.currentTarget));
    const { res, data } = await post("olvide", { ...form, captcha: captcha.token });
    if (res?.ok) return setState("sent");
    setError(errorMessage(data, "No pudimos procesar la solicitud. Intenta de nuevo."));
    captcha.reset();
    setState("idle");
  }

  if (state === "sent") {
    return (
      <div role="status" className="rounded-[22px] border border-line bg-mist-2 p-8">
        <p className="display text-2xl">Revisa tu correo.</p>
        <p className="mt-3 text-slate">
          Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Vence en 1 hora.
        </p>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-6">
      <label className="block">
        <span className={fieldLabel}>Correo de tu cuenta</span>
        <input name="email" type="email" required autoComplete="email" className="field" />
      </label>
      <Turnstile key={captcha.key} onToken={captcha.onToken} />
      {error && <p className="text-danger" role="alert">{error}</p>}
      <button type="submit" disabled={state === "sending" || !captcha.token} className="btn btn-primary w-full disabled:opacity-60">
        {state === "sending" ? "Enviando…" : "Enviar enlace"}
      </button>
    </form>
  );
}

/** Sets the password from an emailed link: `activar` (invitation) or `restablecer` (reset). */
export function SetPasswordForm({ accion }: { accion: "activar" | "restablecer" }) {
  const token = useSearchParams().get("token") ?? "";
  const captcha = useCaptcha();
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("password") !== form.get("confirmacion")) return setError("Las contraseñas no coinciden.");
    setBusy(true);
    setError("");
    const { res, data } = await post(accion, { token, password: form.get("password"), captcha: captcha.token });
    if (res?.ok) return goToPanel();
    setError(errorMessage(data, "No pudimos guardar tu contraseña. Intenta de nuevo."));
    setExpired(errorCode(data) === "ENLACE_INVALIDO");
    captcha.reset();
    setBusy(false);
  }

  if (!token) {
    return (
      <p className="text-danger" role="alert">
        Este enlace está incompleto. Ábrelo directamente desde el correo o{" "}
        <Link href="/clientes/recuperar" className="link-underline">pide uno nuevo</Link>.
      </p>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-6">
      <label className="block">
        <span className={fieldLabel}>Nueva contraseña</span>
        <input name="password" type="password" required minLength={12} autoComplete="new-password" className="field" />
        <span className="mt-2 block text-xs text-slate">Mínimo 12 caracteres. Una frase de varias palabras funciona muy bien.</span>
      </label>
      <label className="block">
        <span className={fieldLabel}>Confirma la contraseña</span>
        <input name="confirmacion" type="password" required minLength={12} autoComplete="new-password" className="field" />
      </label>
      <Turnstile key={captcha.key} onToken={captcha.onToken} />
      {error && (
        <p className="text-danger" role="alert">
          {error}
          {expired && (
            <> <Link href="/clientes/recuperar" className="link-underline">Pedir un enlace nuevo</Link>.</>
          )}
        </p>
      )}
      <button type="submit" disabled={busy || !captcha.token} className="btn btn-primary w-full disabled:opacity-60">
        {busy ? "Guardando…" : accion === "activar" ? "Activar mi cuenta" : "Guardar contraseña"}
      </button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    if (form.get("nueva") !== form.get("confirmacion")) return setError("Las contraseñas nuevas no coinciden.");
    setState("saving");
    setError("");
    const { res, data } = await post("cambiar-contrasena", { actual: form.get("actual"), nueva: form.get("nueva") });
    if (res?.ok) {
      formEl.reset();
      return setState("saved");
    }
    setError(errorMessage(data, "No pudimos cambiar tu contraseña."));
    setState("idle");
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <label className="block">
        <span className={fieldLabel}>Contraseña actual</span>
        <input name="actual" type="password" required autoComplete="current-password" className="field" />
      </label>
      <label className="block">
        <span className={fieldLabel}>Nueva contraseña</span>
        <input name="nueva" type="password" required minLength={12} autoComplete="new-password" className="field" />
      </label>
      <label className="block">
        <span className={fieldLabel}>Confirma la nueva contraseña</span>
        <input name="confirmacion" type="password" required minLength={12} autoComplete="new-password" className="field" />
      </label>
      {error && <p className="text-danger" role="alert">{error}</p>}
      {state === "saved" && <p role="status" className="text-navy">Contraseña actualizada. Cerramos tus otras sesiones.</p>}
      <button type="submit" disabled={state === "saving"} className="btn btn-dark disabled:opacity-60">
        {state === "saving" ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await post("logout");
        router.replace("/clientes/entrar");
        router.refresh();
      }}
      className="btn btn-ghost min-h-11 px-5 text-sm"
    >
      {busy ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}

export function DownloadButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span className="flex items-center gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          const res = await fetch(`/api/clientes/datos/entregables/${id}/descarga`).catch(() => null);
          const data = await res?.json().catch(() => null);
          setBusy(false);
          if (res?.ok && data?.url) window.location.assign(data.url);
          else setError(errorMessage(data, "No se pudo descargar."));
        }}
        className="btn btn-ghost min-h-10 px-4 text-sm"
      >
        {busy ? "Preparando…" : "Descargar"}
      </button>
      {error && <span className="text-sm text-danger">{error}</span>}
    </span>
  );
}
