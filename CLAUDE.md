# CODEX AI Consulting — Directrices de Trabajo

## 📋 STACK ACTUAL (Plataforma v4)

> Arquitectura completa: `docs/arquitectura.md` (basada en `docs/00-master-prompt.md`). Fases: `docs/checklist-lanzamiento.md`.

### 🎨 Frontend — `apps/web` (Next.js 16)
- **App Router + Cache Components** (`cacheComponents`, `partialPrefetching`): leer `apps/web/AGENTS.md` y `node_modules/next/dist/docs/` antes de usar APIs de Next — la versión cambia rápido.
  - Datos de la API: funciones con `'use cache'` + `cacheLife` + `cacheTag` (`src/lib/api.ts`); `cookies()`/`params` sin `generateStaticParams` van dentro de `<Suspense>`.
  - Middleware se llama `proxy.ts` (sesión del portal + 404 reales para slugs desconocidos).
- **CSS**: Tailwind v4 con tokens en `src/app/globals.css` (`@theme`).
- **Paleta v4** (tomada de la plantilla de consultoría de referencia, tema claro):
  - Papel `#FFFFFF` (fondo), tinta `#000209` (texto y secciones oscuras), niebla `#EAE9E6` (superficies)
  - Pizarra `#3D404B` (texto secundario AA), acero `#7F8189` (solo texto grande o decorativo)
  - Señal `#5A7EF2` (azul IA: acentos y gráficos; no para texto pequeño), marino `#03144F` (secciones profundas y enlaces)
  - Brasa `#FF6B15` (CTA principal, siempre con texto tinta), chispa `#FFE550` (resaltados puntuales)
- **Tipografía**: Wix Madefor Display (titulares, clase `.display`) + Wix Madefor Text (texto/UI), vía `next/font/google`.
- **Motion**: GSAP 3 (ScrollTrigger + SplitText) a través de `useGsap` con `gsap.matchMedia()`; Lenis solo en puntero fino. Revelados con clip y slide, scrub, pins, contadores, cursor y botones magnéticos. El hero (h1 e imagen) se ve sin JS. Easing `cubic-bezier(0.22, 1, 0.36, 1)`; duraciones 0.6s / 0.8s / 1.2s. Siempre respetar `prefers-reduced-motion` (todo visible y estático).
- **Fotos**: stock con licencia Unsplash en `public/images/v4/`, créditos en `content/credits.json`. Nunca stock para retratar a una persona real del equipo.
- **Reglas de estilo**: sin etiquetas en MAYÚSCULAS, sin "·" como separador, sin "→" en botones, numeración solo para secuencias reales (método).

### ⚙️ Backend — `apps/api` (FastAPI)
- Postgres 16 + pgvector, migraciones Alembic (`alembic upgrade head`).
- Auth JWT: access 15 min + refresh 24 h; cookies httpOnly gestionadas por el BFF de Next (`/api/auth/*`, `/api/portal/*`).
- Almacenamiento S3 (RustFS local / S3 o R2 en producción) con URLs prefirmadas.
- RAG: fastembed local (`paraphrase-multilingual-MiniLM-L12-v2`, 384 dims) + FTS español, fusión RRF; Claude `claude-opus-5` en streaming SSE.
- Loops.so: eventos `lead_created` y `course_interest`, enviados **solo** vía outbox (`app/services/outbox.py`) por el worker (`python -m app.worker`, servicio `worker` en compose). Sin `LOOPS_API_KEY` el evento se cierra como `omitido`.
- Contrato de errores: `{"error": {"codigo", "mensaje", "detalles", "traceId"}}` (`app/errors.py`); lanzar `ApiError(status, "CODIGO", "mensaje")` para códigos específicos. En la web, leerlo con `errorMessage()` de `src/lib/api-error.ts`.
- POST con efecto: aceptar `Idempotency-Key` con `run_once` (`app/services/idempotency.py`). Acciones de portal/admin: `audit.record(...)` en la misma transacción (`admin_audit` es inmutable).
- CLI: `python -m app.cli create-admin <email> <nombre>` y `python -m app.cli reindex`.

### 📚 Contenido — `content/*.json`
Fuente única para páginas y RAG. **Nunca** nombres ni marcas de clientes. Proyectos del mismo cliente: registrar en `sameClient` (`apps/web/src/lib/content.ts`) y no enlazarlos entre sí; redondear cifras que identifiquen.

---

## 🎯 REGLAS DE TRABAJO

### Acceso a Archivos
- **Nunca** leer archivos completos si solo necesitas una función/sección específica
- Usar `offset` + `limit` para archivos grandes
- Usar `Grep` para búsquedas de código, no Read
- Prefiere `Glob` para encontrar patrones de archivos
- Si existe `graphify-out/graph.json`, consultar el grafo primero para preguntas de arquitectura

### Cambios de Código
- **Confirmar plan** antes de escribir código (usar EnterPlanMode para cambios > 2 archivos)
- **Máximo 3 archivos** por sesión de cambios, salvo que el usuario pida explícitamente una reestructuración
- **Minimal edits**: No refactorizar, no agregar features no solicitadas
- **Testing**: Si hay dev server, probar en browser antes de considerar "done"

### Commits & PRs
- Crear commit por tarea completada (no batching)
- Mensaje: imperative tone ("Add", "Fix", "Enhance")
- Incluir `Co-Authored-By: Claude Haiku 4.5` al final
- No force-push sin confirmación explícita

### Performance
- Core Web Vitals objetivo: LCP < 2.5s, FID < 100ms, CLS < 0.1
- GPU acceleration: usar `transform` y `opacity`, no posición/tamaño
- Imágenes con `next/image`; fuentes con `next/font`

---

## 🚀 ROADMAP

### Hecho (v3)
✅ Monorepo Next.js + FastAPI + pgvector en Docker
✅ Sitio negro/dorado: 12 servicios, 17 proyectos anonimizados, experiencia, contacto
✅ Academia pública + portal de cursos (video/PDF/texto, subida prefirmada)
✅ Asistente RAG con Claude y fuentes
✅ Leads + Loops.so, SEO (metadata, sitemap, JSON-LD, OG)
✅ Pruebas: pytest (API) + Playwright e2e

### En curso (v4, rama `platform-v4`)
⏳ F1 Fundación → F2 Rediseño claro con motion GSAP → F3 Backend de producción (errores, idempotencia, outbox + worker, auditoría) → F4 Pagos mock + alumnos + RLS → F5 Todo en VPS + backups probados

### Después
⏳ Pagos reales (Stripe / Mercado Pago) con llaves del cliente
⏳ Métricas reales de clientes y testimonios verificados
⏳ Caso de app móvil (iOS/Android) cuando exista

---

## 🧭 REGISTRO DE DECISIONES (ADR)

| ID | Fecha | Decisión | Por qué | Alternativa descartada | Revisar cuando |
|---|---|---|---|---|---|
| D-001 | 2026-10-20 | Rediseño v4 claro con la paleta y la tipografía de la plantilla de consultoría de referencia | Lo pidió el owner; el negro/dorado no comunicaba "empresa de IA" | Mantener negro/dorado | Datos de conversión tras 60 días |
| D-002 | 2026-10-20 | Mantener FastAPI + Postgres propio + JWT; RLS solo como segunda capa en tablas de dinero | El stack ya funciona y está probado; migrar no aporta valor | Migrar a Supabase (Auth, RLS, Storage) | Se suma un cliente móvil que hable directo con la BD |
| D-003 | 2026-10-20 | GSAP 3 (licencia estándar sin costo) para el motion | Pins, scrub y SplitText con buen rendimiento; `matchMedia` para reduced motion | Motion/Framer (sin SplitText ni pins tan maduros) | Cambio de licencia de GSAP |
| D-004 | 2026-10-20 | Todo en un VPS (web + api + worker + db + storage) con Caddy y Cloudflare free | Uso comercial (Vercel Hobby lo prohíbe) y costo mínimo | Vercel Pro + VPS | CPU p95 > 70 % o incidente > 2 h |
| D-005 | 2026-10-20 | Outbox en Postgres + worker con `skip locked` en vez de BackgroundTasks | Una caída de Loops no debe perder eventos | Redis/QStash | Backlog > 1 000 sostenido |
| D-006 | 2026-10-20 | Pagos detrás de `PaymentProvider` con adaptador mock; el real falla sin llaves | No hay llaves; el producto no debe acoplarse a una pasarela | Integrar Stripe directo | Llegan las llaves de prueba |
| D-007 | 2026-10-20 | Fotos de stock con licencia Unsplash, servidas por nosotros | Calidad 4K sin costo ni hotlinking | Fotos de la plantilla (licencia Wix) | Sesión de fotos propia |

---

## 📂 ESTRUCTURA CRÍTICA

```
/CODEX OFICIAL WEBSITE
├── apps/web/            Next.js (src/app/(site), src/app/portal, src/components, src/lib)
├── apps/api/            FastAPI (app/routers, app/services, alembic, tests)
├── content/             site.json, services.json, projects.json, cases.json
├── infra/               docker-compose.prod.yml, Caddyfile, .env.prod.example
├── docker-compose.yml   stack local (db, storage, api :8010, web :3000)
├── legacy/              sitio estático v2 (solo referencia, no editar)
└── docs/legacy/         planeación anterior (REDESIGN_ROADMAP, auditorías)
```

**Archivos NO tocar sin supervisión:**
- `legacy/` (referencia histórica)
- Migraciones Alembic ya aplicadas (crear una nueva en vez de editar)

---

## ✅ CHECKLIST ANTES DE COMPLETAR TAREA

- [ ] Código escrito sigue patrones existentes (naming, estructura)
- [ ] `npm run typecheck`, `npm run lint` y `pytest` en verde
- [ ] Probado en browser (si hay cambios visuales/interacción) y `npm run test:e2e`
- [ ] No hay console errors ni warnings
- [ ] Respeta `prefers-reduced-motion` (accesibilidad)
- [ ] Commit creado con mensaje descriptivo

---

## 🔧 HERRAMIENTAS HABITUALES

```bash
docker compose up -d --build                    # stack completo
docker compose exec api python -m app.cli reindex
npm run dev                                     # web en :3000 (API en :8010)
cd apps/api && .venv/Scripts/python -m pytest
cd apps/web && npm run test:e2e
```

---

**Última actualización**: 2026-10-20
**Versión**: 4.0 (en curso)
**Owner**: Diego Oliver Martínez
