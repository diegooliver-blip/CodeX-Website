# CODEX AI Consulting — Directrices de Trabajo

## 📋 STACK ACTUAL (Plataforma v3)

### 🎨 Frontend — `apps/web` (Next.js 16)
- **App Router + Cache Components** (`cacheComponents`, `partialPrefetching`): leer `apps/web/AGENTS.md` y `node_modules/next/dist/docs/` antes de usar APIs de Next — la versión cambia rápido.
  - Datos de la API: funciones con `'use cache'` + `cacheLife` + `cacheTag` (`src/lib/api.ts`); `cookies()`/`params` sin `generateStaticParams` van dentro de `<Suspense>`.
  - Middleware se llama `proxy.ts` (sesión del portal + 404 reales para slugs desconocidos).
- **CSS**: Tailwind v4 con tokens en `src/app/globals.css` (`@theme`).
- **Paleta**:
  - Obsidiana `#0A0A0A` (fondo), grafito `#16140F` (superficies)
  - Oro `#C9A55A` (señal/acento), champaña `#E6D3A3` (texto dorado pequeño, AA)
  - Marfil `#EEE9DF` (texto), ceniza `#8E887C` (secundario)
- **Tipografía**: Bodoni Moda (titulares, clase `.display`) + Hanken Grotesk (texto/UI).
- **Motion**: una sola secuencia orquestada (hero + constelación). Reveals discretos (`<Reveal>`), Lenis solo en puntero fino. Easing `cubic-bezier(0.34, 1.56, 0.64, 1)`; duraciones 0.6s / 0.8s / 1.2s. Siempre respetar `prefers-reduced-motion`.
- **Reglas de estilo**: sin etiquetas en MAYÚSCULAS, sin "·" como separador, sin "→" en botones, numeración solo para secuencias reales (método).

### ⚙️ Backend — `apps/api` (FastAPI)
- Postgres 16 + pgvector, migraciones Alembic (`alembic upgrade head`).
- Auth JWT: access 15 min + refresh 24 h; cookies httpOnly gestionadas por el BFF de Next (`/api/auth/*`, `/api/portal/*`).
- Almacenamiento S3 (RustFS local / S3 o R2 en producción) con URLs prefirmadas.
- RAG: fastembed local (`paraphrase-multilingual-MiniLM-L12-v2`, 384 dims) + FTS español, fusión RRF; Claude `claude-opus-5` en streaming SSE.
- Loops.so: eventos `lead_created` y `course_interest`.
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

### Siguiente
⏳ Pagos de cursos (Stripe / Mercado Pago) y acceso de alumnos
⏳ Métricas reales de clientes y testimonios verificados
⏳ Caso de app móvil (iOS/Android) cuando exista
⏳ Despliegue: Vercel (web) + VPS con `infra/docker-compose.prod.yml`

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

**Última actualización**: 2026-10-16
**Versión**: 3.0
**Owner**: Diego Oliver Martínez
