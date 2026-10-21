import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Needs PAYMENT_PROVIDER=mock on the API (docker-compose.yml sets it locally).
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@codexai.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "codex-admin-2026";

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
}

async function adminJson(request: APIRequestContext, method: "post" | "patch", path: string, data: unknown) {
  const res = await request[method](`/api/portal/${path}`, { data });
  expect(res.ok(), `${method} ${path}: ${res.status()}`).toBeTruthy();
  return res.json();
}

/** A published course with a free lesson and a paid one, created through the admin BFF. */
async function createCourse(request: APIRequestContext) {
  expect((await request.post("/api/auth/login", { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })).ok()).toBeTruthy();
  const slug = `compra-e2e-${Date.now()}`;
  const course = await adminJson(request, "post", "courses", { slug, title: `Compra E2E ${slug.slice(-6)}`, price_mxn: 990 });
  const mod = await adminJson(request, "post", `courses/${course.id}/modules`, { title: "Módulo único", position: 0 });
  await adminJson(request, "post", `courses/modules/${mod.id}/lessons`, {
    slug: "bienvenida", title: "Bienvenida", kind: "text", body: "Lección abierta para todos.", is_free: true, position: 0,
  });
  await adminJson(request, "post", `courses/modules/${mod.id}/lessons`, {
    slug: "contenido-pagado", title: "Contenido del curso", kind: "text", body: "Solo para alumnos inscritos.", is_free: false, position: 1,
  });
  await adminJson(request, "patch", `courses/${course.id}`, { status: "published" });
  return { id: course.id as string, slug };
}

test("student buys a course (mock payment) and the paid lesson unlocks", async ({ page, browser }) => {
  const admin = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const course = await createCourse(admin.request);
  const errors = trackErrors(page);

  try {
    await page.goto(`/academia/${course.slug}/contenido-pagado`);
    await expect(page.getByText("Esta lección es parte del curso completo.")).toBeVisible();
    await expect(page.getByText("Solo para alumnos inscritos.")).toHaveCount(0);

    await page.goto(`/academia/${course.slug}`);
    await page.getByRole("button", { name: "Comprar curso" }).click();
    await expect(page).toHaveURL(/\/academia\/entrar\?siguiente=/);

    await page.getByRole("tab", { name: "Crear cuenta" }).click();
    await page.getByLabel("Nombre").fill("Alumna Prueba");
    await page.getByLabel("Correo").fill(`alumna-${Date.now()}@example.com`);
    await page.getByLabel(/Contraseña/).fill("clave-segura-2026");
    await page.getByRole("button", { name: "Crear mi cuenta" }).click();
    await expect(page).toHaveURL(new RegExp(`/academia/${course.slug}$`));

    await page.getByRole("button", { name: "Comprar curso" }).click();
    await expect(page).toHaveURL(/\/academia\/pago\?orden=/);
    await expect(page.getByText("$990 MXN")).toBeVisible();
    await page.getByRole("button", { name: "Confirmar pago simulado" }).click();

    await expect(page).toHaveURL(new RegExp(`/academia/${course.slug}\\?compra=ok`));
    await expect(page.getByText("Ya tienes este curso.")).toBeVisible();
    await page.goto(`/academia/${course.slug}/contenido-pagado`);
    await expect(page.getByText("Solo para alumnos inscritos.")).toBeVisible();

    await page.goto("/academia/mis-cursos");
    await expect(page.getByRole("link", { name: new RegExp(course.slug.slice(-6)) })).toBeVisible();
    expect(errors.filter((e) => !/Failed to load resource/.test(e))).toEqual([]);
  } finally {
    // Sold courses can't be deleted (orders are permanent): unpublish it instead.
    await adminJson(admin.request, "patch", `courses/${course.id}`, { status: "draft" });
    await admin.close();
  }
});
