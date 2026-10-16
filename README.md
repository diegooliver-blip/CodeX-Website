# CODEX AI Consulting — Plataforma v3

Sitio y plataforma propia de CODEX: escaparate de servicios y proyectos (anonimizados), academia de cursos con panel de administración, y un asistente con IA que responde usando RAG sobre el contenido real de la agencia.

```
apps/web     Next.js 16 (App Router, Cache Components, Tailwind v4)  → Vercel
apps/api     FastAPI + SQLAlchemy + Alembic, Postgres/pgvector      → VPS (Docker)
content/     servicios, proyectos, casos y datos del sitio (JSON)  → fuente única para web y RAG
infra/       docker-compose de producción + Caddy (HTTPS)
legacy/      sitio estático anterior (solo referencia)
docs/legacy/ documentos de planeación anteriores
```

## Arranque rápido (todo en Docker)

```bash
cp .env.example .env          # opcional: ANTHROPIC_API_KEY, LOOPS_API_KEY
docker compose up -d --build
docker compose exec api python -m app.cli create-admin admin@codexai.com "Tu nombre"
docker compose exec api python -m app.cli reindex
```

| Servicio | URL |
|---|---|
| Sitio | http://localhost:3000 |
| Portal | http://localhost:3000/portal |
| API (docs) | http://localhost:8010/docs |
| Consola de almacenamiento | http://localhost:9001 |

Sin `ANTHROPIC_API_KEY` el asistente funciona en modo demostración (muestra fuentes, no genera texto). Sin `LOOPS_API_KEY` los leads se guardan pero no se envían eventos de correo.

## Desarrollo local

```bash
docker compose up -d db storage                  # Postgres + almacenamiento S3

# API (puerto 8010)
cd apps/api
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt   # macOS/Linux: .venv/bin/pip
.venv/Scripts/alembic upgrade head
.venv/Scripts/uvicorn app.main:app --port 8010 --reload

# Web (puerto 3000)
npm install
npm run dev
```

## Cómo funciona

- **Contenido**: `content/*.json` alimenta las páginas (generadas estáticamente) y el índice del asistente. Para agregar un proyecto o servicio, edita el JSON, vuelve a desplegar y ejecuta `reindex`. Los proyectos de un mismo cliente se declaran en `sameClient` (`apps/web/src/lib/content.ts`) para que nunca se enlacen entre sí.
- **Asistente (RAG)**: embeddings locales multilingües (fastembed, sin API externa) en pgvector + búsqueda de texto completo en español, fusionados con RRF. Claude (`claude-opus-5`, esfuerzo bajo, con *fallbacks* del servidor) responde en streaming SSE citando fuentes.
- **Academia**: el portal crea cursos → módulos → lecciones (video, PDF o texto). Los archivos suben directo al almacenamiento con URLs prefirmadas; las lecciones de pago nunca se exponen en la API pública. Al publicar o editar, la academia se revalida al instante.
- **Leads y correo**: contacto e interés en cursos se guardan en Postgres y disparan eventos `lead_created` / `course_interest` en Loops.so (crea esos Loops en tu cuenta).
- **Seguridad**: sesión del portal en cookies httpOnly (access 15 min + refresh 24 h, rotación en `proxy.ts`); en producción la API solo acepta llamadas del servidor Next.js (`INTERNAL_API_KEY`); límites de tasa en login, chat y leads.

## Pruebas

```bash
cd apps/api && .venv/Scripts/python -m pytest      # requiere `docker compose up -d db`
cd apps/web && npm run typecheck && npm run lint
cd apps/web && npm run test:e2e                     # requiere el stack corriendo
```

## Producción

**Backend (VPS con Docker)**: apunta DNS de `api.` y `media.` al servidor y:

```bash
cp infra/.env.prod.example infra/.env.prod   # llena todos los valores
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d --build
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod exec api python -m app.cli create-admin tu@correo.com "Nombre"
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod exec api python -m app.cli reindex
```

**Frontend (Vercel)**: importa el repo con *Root Directory* `apps/web` y define `API_URL=https://api.codexai.com`, `INTERNAL_API_KEY` (el mismo del VPS) y `NEXT_PUBLIC_SITE_URL=https://codexai.com`.

## Contacto

codexai.consulting@gmail.com · +52 833 137 5723 · [Agendar consultoría](https://calendly.com/codexai-consulting/30min)
