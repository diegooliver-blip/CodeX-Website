# Checklist de lanzamiento: plataforma v4

Cada fase cierra con evidencia (salida de las pruebas, capturas) y la aprobación de Diego antes de pasar a la siguiente.

## F1 Fundación (cerrada 2026-10-20)
- [x] `docs/` completo: master prompt, arquitectura, costos, checklist, plan de pruebas e integración de pagos.
- [x] `CLAUDE.md` con la paleta y tipografía v4 y la tabla de ADRs.
- [x] `.github/workflows/ci.yml` y `dependabot.yml` (pendiente: primera corrida en GitHub tras el push).
- [x] Tokens v4 y fuentes Wix Madefor; tema claro.
- [x] Infraestructura de motion: `useMotion`, `Reveal` v2 y botones magnéticos, respetando reduced motion. El cursor personalizado se retiró a petición del owner.
- [x] Fotos curadas (Pexels), aprobadas y descargadas, con créditos en `content/credits.json`.
- [x] `npm run typecheck` y `npm run lint` en verde.

## F2 Rediseño del frontend (cerrada 2026-10-20, aprobada por el owner)
- [x] Home con las 12 secciones del plan (más foto por servicio en el carrusel).
- [x] Páginas interiores: servicios, servicio por slug, proyectos, proyecto por slug, experiencia, academia, contacto y 404.
- [x] Portal con los tokens nuevos y sin regresiones (e2e del editor de cursos).
- [x] Capturas a 390 px y 1440 px, y con `prefers-reduced-motion`.
- [ ] LCP < 2.5 s: medido 2.7 s escritorio / 2.3 s móvil con red lenta simulada y CPU 4x; CLS 0. Falta ajustar la foto del hero y correr Lighthouse formal.
- [x] `npm run test:e2e` en verde y sin errores de consola (build de producción).

## F3 Endurecimiento del backend (cerrada 2026-10-20)
- [x] Errores `{error:{codigo,mensaje,detalles,traceId}}` y el BFF adaptado.
- [x] Logs JSON con `traceId` (structlog), encabezado `x-trace-id` en cada respuesta.
- [x] `Idempotency-Key` en `/leads` (pruebas: doble envío y envío simultáneo = 1 fila; otra carga con la misma llave = 409).
- [x] Outbox y worker, con backoff + jitter y DLQ a los 8 intentos (probado).
- [x] `admin_audit` inmutable (pruebas: UPDATE, DELETE y TRUNCATE fallan).
- [x] `/health` con db, storage, latido del worker, backlog y DLQ.
- [x] Rate limit por `x-client-ip` resuelto en el BFF (CF-Connecting-IP o último salto de XFF); uvicorn ya no confía en proxy headers.
- [x] `pytest` en verde (26 pruebas).

## F4 Pagos mock y alumnos
- [ ] Contrato `PaymentProvider`, `MockProvider` y adaptadores reales que fallan sin llaves (probado).
- [ ] `orders`, `payments_ledger` (inmutable) y `enrollments`.
- [ ] RLS: A no ve las órdenes de B (prueba SQL).
- [ ] UI: comprar curso (mock) → lección desbloqueada (e2e).

## F5 Infra y salida
- [ ] `infra/docker-compose.prod.yml` con web, api, worker, db, storage, backup y caddy.
- [ ] Caddy con cabeceras; Cloudflare en modo Full (strict).
- [ ] Backup nocturno a R2 y `restore-test.sh` ejecutado (fecha: ______).
- [ ] Monitores de UptimeRobot y alertas de facturación.
- [ ] Documentación final: qué se construyó, qué quedó en mock, costos reales y pendientes.

## Fases futuras
Pagos reales con llaves de producción, WAL archiving (RPO de 1 h), MFA para admin, app móvil y testimonios verificados.
