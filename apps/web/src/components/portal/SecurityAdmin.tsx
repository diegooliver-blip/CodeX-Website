"use client";

import QRCode from "qrcode";
import { useEffect, useState, type FormEvent } from "react";
import { portal } from "@/lib/portal-client";

type Me = { email: string; mfa: boolean };
type Setup = { secreto: string; uri: string; qr: string };

/** Two-factor sign-in for the staff account: scan a QR in an authenticator app, confirm one code. */
export function SecurityAdmin() {
  const [me, setMe] = useState<Me | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    portal<Me>("me").then(setMe).catch((e: Error) => setError(e.message));
  }, []);

  async function start() {
    setBusy(true);
    setError("");
    try {
      const s = await portal<{ secreto: string; uri: string }>("mfa/iniciar", { method: "POST", json: {} });
      setSetup({ ...s, qr: await QRCode.toString(s.uri, { type: "svg", margin: 1, width: 220 }) });
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  async function submit(action: "activar" | "desactivar", e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const codigo = String(new FormData(e.currentTarget).get("codigo") ?? "");
    try {
      await portal(`mfa/${action}`, { method: "POST", json: { codigo } });
      setMe((m) => (m ? { ...m, mfa: action === "activar" } : m));
      setSetup(null);
      setNotice(action === "activar" ? "Verificación en dos pasos activada." : "Verificación en dos pasos desactivada.");
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  const codeField = (
    <label className="block">
      <span className="block text-sm text-slate">Código de 6 dígitos de tu app</span>
      <input name="codigo" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required className="field max-w-xs" />
    </label>
  );

  return (
    <>
      <h1 className="display text-5xl">Seguridad</h1>
      {error && <p className="mt-4 text-danger" role="alert">{error}</p>}
      {notice && <p className="mt-4 rounded-xl bg-spark/40 px-4 py-3" role="status">{notice}</p>}
      {!me ? (
        <div className="mt-10 h-40 animate-pulse rounded-2xl bg-mist/60" />
      ) : (
        <section className="mt-8 max-w-2xl rounded-2xl border border-line p-6 md:p-8">
          <h2 className="display text-2xl">Verificación en dos pasos</h2>
          <p className="mt-2 text-slate">
            {me.mfa
              ? `Activa para ${me.email}. Al entrar se pide un código de tu app de autenticación.`
              : "Además de la contraseña, pide un código de una app como Google Authenticator, 1Password o Authy."}
          </p>
          {me.mfa ? (
            <form onSubmit={(e) => submit("desactivar", e)} className="mt-6 space-y-4">
              {codeField}
              <button type="submit" disabled={busy} className="btn btn-ghost disabled:opacity-60">Desactivar</button>
            </form>
          ) : !setup ? (
            <button type="button" onClick={start} disabled={busy} className="btn btn-primary mt-6 disabled:opacity-60">
              Activar verificación en dos pasos
            </button>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
              {/* SVG generated locally from the otpauth URI; the secret never leaves the browser and our API. */}
              <div className="w-[220px] rounded-xl border border-line bg-paper p-2" dangerouslySetInnerHTML={{ __html: setup.qr }} />
              <form onSubmit={(e) => submit("activar", e)} className="space-y-4">
                <p className="text-[0.95rem] text-slate">
                  Escanea el código con tu app. Si no puedes, escribe esta clave a mano:
                  <code className="mt-2 block break-all rounded-lg bg-mist px-3 py-2 text-ink">{setup.secreto}</code>
                </p>
                {codeField}
                <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">Confirmar y activar</button>
              </form>
            </div>
          )}
        </section>
      )}
    </>
  );
}
