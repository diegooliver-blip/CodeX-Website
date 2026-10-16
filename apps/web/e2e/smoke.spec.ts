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

test("assistant answers with sources", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "¿Qué incluye una tienda en línea con ustedes?" }).click();
  await expect(page.getByRole("link", { name: /Tiendas en línea inteligentes/ }).last()).toBeVisible({ timeout: 30_000 });
});

test("contact form stores a lead", async ({ page }) => {
  await page.goto("/contacto");
  await page.getByLabel("Nombre").fill("Prueba E2E");
  await page.getByLabel("Correo", { exact: true }).fill(`e2e+${Date.now()}@example.com`);
  await page.getByLabel("Cuéntanos sobre tu operación").fill("Prueba automática");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  await expect(page.getByText("Mensaje recibido.")).toBeVisible();
});

test("portal: create, fill, publish and view a course", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/portal\/login/);
  await page.getByLabel("Correo", { exact: true }).fill(ADMIN_EMAIL);
  await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { name: /Hola/ })).toBeVisible({ timeout: 20_000 });

  const title = `Curso E2E ${Date.now()}`;
  await page.getByRole("link", { name: "Cursos", exact: true }).click();
  await page.getByPlaceholder("Título del curso nuevo").fill(title);
  await page.getByRole("button", { name: "Crear curso" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

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
});
