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
- [ ] LCP < 2.5 s. Lighthouse 12.8 sobre el build de producción local (2026-10-21, 3 corridas, con el script que inyecta el antivirus bloqueado): escritorio **1.1 s** (score 0.97) ✅; móvil simulado (4G lenta + CPU 4x) **4.9 a 5.3 s** (score 0.58 a 0.68) ❌, con LCP observado de 1.0 a 1.3 s. El LCP es el texto del hero, no la foto; lo que queda es descargar y evaluar JS (GSAP, SplitText, ScrollTrigger). El setup del motion ya espera al tiempo libre (TBT de 1.8 a 2.8 s bajó a 0.4 a 0.7 s). Falta medir producción con PageSpeed Insights desde fuera de la red corporativa (el FortiGate intercepta TLS de codexaiconsulting.com) y, si sigue arriba, cargar GSAP por import dinámico.
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

## F4 Pagos mock y alumnos (código listo 2026-10-21, falta aprobación del owner)
- [x] Contrato `PaymentProvider`, `MockProvider` y adaptadores de Stripe y Mercado Pago que fallan con `PROVEEDOR_NO_CONFIGURADO` sin llaves (`app/services/payments.py`, probado).
- [x] Migración `0003`: `orders`, `payments_ledger` (inmutable por trigger, incluso TRUNCATE) y `enrollments`; `order_paid` sale por el outbox hacia Loops.
- [x] Cuentas de alumno (`/alumnos/registro`, `/alumnos/login`), separadas del staff: un token de alumno recibe 403 en `/admin`.
- [x] RLS con `FORCE` en las tres tablas; las lecturas del alumno corren con `SET LOCAL ROLE codex_alumno`, así que aplica aunque la API se conecte como superusuario. Prueba SQL: A no ve las órdenes de B (`tests/test_pagos.py`).
- [x] UI: comprar curso (mock), lección desbloqueada y "Mis cursos" (`e2e/academia.spec.ts`). `pytest`: 61 pruebas en verde.
- [ ] En producción `PAYMENT_PROVIDER` se queda vacío (ventas cerradas, se muestra el formulario de interés) hasta tener llaves reales. Nunca `mock`.
- Pendiente para fases futuras: verificación de correo del alumno y recuperación de contraseña de alumnos.

## F5 Infra y salida
- [ ] `infra/docker-compose.prod.yml` con web, api, worker, db, storage, backup y caddy.
- [ ] Caddy con cabeceras; Cloudflare en modo Full (strict).
- [ ] Backup nocturno a R2 y `restore-test.sh` ejecutado (fecha: ______).
- [ ] Monitores de UptimeRobot y alertas de facturación.
- [ ] Documentación final: qué se construyó, qué quedó en mock, costos reales y pendientes.

## Fases futuras
Pagos reales con llaves de producción, WAL archiving (RPO de 1 h), MFA para admin, app móvil y testimonios verificados.
