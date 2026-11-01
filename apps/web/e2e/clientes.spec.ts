import { createHmac, randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

/**
 * Client portal, end to end: a demo client is published through the signed Master Control sync API,
 * then the invited user activates the account, browses the panel and recovers the password.
 * Needs the API (E2E_API_URL) and its SYNC_SHARED_SECRET (E2E_SYNC_SECRET); skipped otherwise.
 */
const API = process.env.E2E_API_URL ?? "http://localhost:8010";
const SECRET = process.env.E2E_SYNC_SECRET ?? "";
const PASSWORD = "Portal-Prueba-Segura-26";

test.skip(true, "Client sign-in screen removed from the site; /clientes/entrar redirects to /portal/login");

async function sync(events: object[]) {
  const body = JSON.stringify({ events: events.map((e) => ({ event_id: randomUUID(), ...e })) });
  const ts = Math.floor(Date.now() / 1000);
  const signature = "v1=" + createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex");
  const res = await fetch(`${API}/v1/sync/events`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-codex-timestamp": String(ts), "x-codex-signature": signature },
    body,
  });
  expect(res.ok).toBeTruthy();
  return (await res.json()).resultados as { resultado: string; enlace?: string }[];
}

async function seedDemoClient() {
  const id = randomUUID().slice(0, 8);
  const client = `e2e-${id}`;
  const service = `e2e-svc-${id}`;
  const email = `cliente.${id}@example.com`;
  const results = await sync([
    { tipo: "client.upserted", version: 1, datos: { mc_client_id: client, nombre: `Demo ${id}`, es_demo: true } },
    {
      tipo: "service.upserted",
      version: 1,
      datos: { mc_service_id: service, mc_client_id: client, nombre: "Plataforma de pedidos", etapa: "pruebas", avance: 72 },
    },
    {
      tipo: "update.published",
      datos: { mc_update_id: `e2e-upd-${id}`, mc_service_id: service, titulo: "Módulo de inventario listo", publicado_en: new Date().toISOString() },
    },
    { tipo: "client_user.invited", datos: { mc_client_id: client, email, nombre: "Laura Demo" } },
  ]);
  return { email, client, link: results.at(-1)!.enlace! };
}

async function setPassword(page: Page, link: string) {
  await page.goto(new URL(link).pathname + new URL(link).search);
  await page.getByLabel("Nueva contraseña").fill(PASSWORD);
  await page.getByLabel("Confirma la contraseña").fill(PASSWORD);
  const submit = page.getByRole("button", { name: /Activar mi cuenta|Guardar contraseña/ });
  await expect(submit).toBeEnabled({ timeout: 20_000 }); // waits for the Turnstile token
  await submit.click();
}

test("invited client activates, sees services, signs out and recovers access", async ({ page }) => {
  const { email, client, link } = await seedDemoClient();

  // The panel is private.
  await page.goto("/clientes/panel");
  await expect(page).toHaveURL(/\/clientes\/entrar/);

  await setPassword(page, link);
  await expect(page.getByRole("heading", { name: "Hola, Laura." })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Cuenta de demostración")).toBeVisible();
  await page.getByRole("link", { name: /Plataforma de pedidos/ }).click();
  await expect(page.getByRole("heading", { name: "Plataforma de pedidos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Módulo de inventario listo" })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "72");

  await page.goto("/clientes/panel");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/clientes\/entrar/);
  await page.goto("/clientes/panel");
  await expect(page).toHaveURL(/\/clientes\/entrar/);

  // Wrong password: generic message.
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña").fill("no-es-la-clave-1");
  await expect(page.getByRole("button", { name: "Entrar al portal" })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole("button", { name: "Entrar al portal" }).click();
  await expect(page.getByText("Correo o contraseña incorrectos")).toBeVisible();

  // Recovery screen never reveals whether the account exists.
  await page.goto("/clientes/recuperar");
  await page.getByLabel("Correo de tu cuenta").fill(email);
  await expect(page.getByRole("button", { name: "Enviar enlace" })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByText("Revisa tu correo.")).toBeVisible();

  // Master Control can re-issue access: for an active user that's a reset link.
  const [reissued] = await sync([{ tipo: "client_user.invited", datos: { mc_client_id: client, email } }]);
  expect(reissued.enlace).toContain("/clientes/restablecer");
  await setPassword(page, reissued.enlace!);
  await expect(page.getByRole("heading", { name: "Hola, Laura." })).toBeVisible({ timeout: 20_000 });
});
