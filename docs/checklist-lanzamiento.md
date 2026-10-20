# Checklist de lanzamiento: plataforma v4

Cada fase cierra con evidencia (salida de las pruebas, capturas) y la aprobación de Diego antes de pasar a la siguiente.

## F1 Fundación
- [ ] `docs/` completo: master prompt, arquitectura, costos, checklist, plan de pruebas e integración de pagos.
- [ ] `CLAUDE.md` con la paleta y tipografía v4 y la tabla de ADRs.
- [ ] `.github/workflows/ci.yml` y `dependabot.yml`.
- [ ] Tokens v4 y fuentes Wix Madefor; tema claro.
- [ ] Infraestructura de motion: `useGsap`, `Reveal` v2, cursor y botones magnéticos, todo respetando reduced motion.
- [ ] Fotos curadas, aprobadas y descargadas, con créditos en `content/credits.json`.
- [ ] `npm run typecheck` y `npm run lint` en verde.

## F2 Rediseño del frontend
- [ ] Home con las 12 secciones del plan.
- [ ] Páginas interiores: servicios, servicio por slug, proyectos, proyecto por slug, experiencia, academia, curso, lección, contacto y 404.
- [ ] Portal con los tokens nuevos y sin regresiones (e2e del editor de cursos).
- [ ] Capturas a 390 px y 1440 px, y con `prefers-reduced-motion`.
- [ ] Lighthouse en `/`: LCP < 2.5 s, CLS < 0.1, accesibilidad ≥ 95.
- [ ] `npm run test:e2e` en verde y sin errores de consola.

## F3 Endurecimiento del backend
- [ ] Errores `{error:{codigo,mensaje,detalles,traceId}}` y el BFF adaptado.
- [ ] Logs JSON con `traceId`.
- [ ] `Idempotency-Key` en `/leads` (prueba: doble envío = 1 fila).
- [ ] Outbox y worker, con DLQ tras N intentos (probado).
- [ ] `admin_audit` inmutable (prueba: UPDATE y DELETE fallan).
- [ ] `/health` con latido y backlog.
- [ ] Rate limit que no se puede falsificar con XFF.
- [ ] `pytest` en verde.

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
