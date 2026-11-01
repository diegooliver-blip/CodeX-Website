import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@codexai.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "codex-admin-2026";

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
}

async function login(page: Page) {
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/portal\/login/);
  await page.getByLabel("Correo", { exact: true }).fill(ADMIN_EMAIL);
  await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { name: /Hola/ })).toBeVisible({ timeout: 20_000 });
}

test("public pages render without console errors @mobile", async ({ page }) => {
  const errors = trackErrors(page);
  for (const [url, heading] of [
    ["/", /opera tu negocio/i],
    ["/servicios", /Doce disciplinas/],
    ["/servicios/agentes-whatsapp", /Agentes de IA para WhatsApp/],
    ["/proyectos", /Lo que hemos construido/],
    ["/proyectos/simulacion-energetica", /simulación energética/i],
    ["/experiencia", /Experiencia en operación real/],
    ["/academia", /Academia CODEX/],
    ["/contacto", /Cuéntanos qué quieres resolver/],
  ] as const) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  }
  expect(errors).toEqual([]);
});

test("unknown pages return the custom 404", async ({ page }) => {
  const res = await page.goto("/proyectos/no-existe");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Esta página no existe.")).toBeVisible();
});

test("project filter narrows the portfolio", async ({ page }) => {
  await page.goto("/proyectos");
  await page.getByRole("button", { name: "E-learning" }).click();
  await expect(page.getByText(/^2 proyectos$/)).toBeVisible();
});

test("contact form stores a lead", async ({ page }) => {
  const email = `e2e+${Date.now()}@example.com`;
  await page.goto("/contacto");
  await page.getByLabel("Nombre").fill("Prueba E2E");
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Cuéntanos sobre tu operación").fill("Prueba automática");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  await expect(page.getByText("Mensaje recibido.")).toBeVisible();

  // verify it reached the portal, then remove it
  await login(page);
  const leads = (await (await page.request.get("/api/portal/leads")).json()) as { id: string; email: string }[];
  const mine = leads.find((l) => l.email === email);
  expect(mine).toBeTruthy();
  expect((await page.request.delete(`/api/portal/leads/${mine!.id}`)).status()).toBe(204);
});

test("portal: create, fill, publish and view a course", async ({ page }) => {
  const errors = trackErrors(page);
  await login(page);

  const title = `Curso E2E ${Date.now()}`;
  await page.getByRole("link", { name: "Cursos", exact: true }).click();
  await page.getByPlaceholder("Título del curso nuevo").fill(title);
  await page.getByRole("button", { name: "Crear curso" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const courseId = page.url().split("/").pop()!;

  await page.getByLabel("Subtítulo").fill("Curso creado por la prueba automática");
  await page.getByLabel("Precio en MXN (vacío = por anunciar)").fill("1490");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();

  await page.getByPlaceholder("Nombre del módulo nuevo").fill("Fundamentos");
  await page.getByRole("button", { name: "Agregar módulo" }).click();
  await page.getByRole("button", { name: "Agregar lección" }).click();
  await page.getByLabel("Título de la lección").fill("Bienvenida en video");
  await page.getByLabel("Archivo de video (MP4, WebM)").setInputFiles(path.join(__dirname, "fixtures", "sample.mp4"));
  await expect(page.getByText(/Archivo listo/)).toBeVisible();
  await page.getByLabel("Duración (minutos)").fill("3");
  await page.getByLabel(/Lección gratuita/).check();
  await page.getByRole("button", { name: "Guardar lección" }).click();
  await expect(page.getByText("Lección agregada.")).toBeVisible();

  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("Curso publicado.")).toBeVisible();

  await page.goto("/academia");
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("aside").getByText("$1,490 MXN")).toBeVisible();
  await page.getByRole("link", { name: "Ver lección gratuita" }).click();
  const video = page.locator("video");
  await expect(video).toBeVisible();
  const src = await video.getAttribute("src");
  expect((await page.request.get(src!)).status()).toBe(200);
  expect(errors.filter((e) => !/Failed to load resource/.test(e))).toEqual([]);

  // leave the database as we found it
  expect((await page.request.delete(`/api/portal/courses/${courseId}`)).status()).toBe(204);
});
