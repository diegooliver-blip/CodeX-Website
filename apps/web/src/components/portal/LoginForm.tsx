"use client";

import { useState, type FormEvent } from "react";

export function LoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => null);
    if (res?.ok) {
      const next = new URLSearchParams(window.location.search).get("next");
      // Full navigation so the proxy sees the fresh session cookies.
      window.location.assign(next?.startsWith("/portal") ? next : "/portal");
      return;
    }
    const body = await res?.json().catch(() => null);
    setError(
      res?.status === 429
        ? "Demasiados intentos. Espera un minuto."
        : typeof body?.detail === "string"
          ? body.detail
          : "Revisa tu correo y contraseña (mínimo 8 caracteres).",
    );
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <label className="block">
        <span className="text-sm text-slate">Correo</span>
        <input name="email" type="email" required autoComplete="username" className="field" />
      </label>
      <label className="block">
        <span className="text-sm text-slate">Contraseña</span>
        <input name="password" type="password" required minLength={8} autoComplete="current-password" className="field" />
      </label>
      {error && <p className="text-danger" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary w-full disabled:opacity-60">
        {busy ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
