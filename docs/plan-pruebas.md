# Plan de pruebas

| Capa | Herramienta | Qué se prueba | Dónde |
|---|---|---|---|
| Dominio puro | pytest | Chunking de RAG, cálculo de montos, huella de idempotencia, backoff del outbox | `apps/api/tests/test_*.py` |
| Integración | pytest + Postgres real (`DATABASE_URL`) | Ciclo de vida de cursos, leads idempotentes, outbox → DLQ, auditoría inmutable, RLS de órdenes | `apps/api/tests/` |
| Base de datos | pytest SQL directo | Triggers de inmutabilidad (incluso como dueño), RLS con `set_config` | `apps/api/tests/test_db_security.py` |
| Contrato | pydantic + OpenAPI | Respuestas y errores con forma estable; el BFF interpreta `error.codigo` | pytest + e2e |
| E2E | Playwright | Páginas públicas sin errores de consola, filtro de proyectos, chat con fuentes, formulario de contacto, portal, compra mock | `apps/web/e2e/` |
| Visual y motion | Playwright con capturas | 390 px y 1440 px; `reducedMotion: "reduce"` muestra todo el contenido | Revisión manual en F2 |
| Rendimiento | Lighthouse | LCP < 2.5 s, CLS < 0.1 en `/` | F2 y F5 |
| Resiliencia | pytest | Loops caído → el evento se reintenta y no se pierde el lead; Anthropic sin llave → modo demo | `apps/api/tests/` |
| Estática | tsc, ESLint, ruff | En cada PR | CI |
| DR | `infra/scripts/restore-test.sh` | El dump restaura y los conteos coinciden | Mensual |
