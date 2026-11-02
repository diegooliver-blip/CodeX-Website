# Portal de clientes v5 — plan

Objetivo: que un cliente entre, entienda en 5 segundos cómo van sus servicios y qué debe, pague ahí mismo
y descubra (sin sentirse vendido) lo siguiente que le conviene contratar. Poco texto, mucho gráfico.

## Lo que ya existe y se reutiliza

- Base dedicada `codex_clientes` (Alembic en `alembic_clientes/`) con RLS por `client_id`.
- Identidad por invitación, sesión opaca en cookie httpOnly (`X-Client-Session`), Turnstile, recuperación.
- Réplica de Master Control vía `/v1/sync/events` firmado con HMAC: clientes, servicios (etapa, avance),
  avances, entregables; monitor de uptime.
- `PaymentProvider` (mock + Mercado Pago) de la academia.

Hallazgo: desde `da90ca3` `/clientes/entrar` redirige al login del equipo, así que ningún cliente puede
entrar. Se restaura el login de clientes y el botón del header vuelve ahí (con enlace al acceso del equipo).

## Arquitectura

```
Master Control ──HMAC sync──▶ API /v1/sync/events ──▶ codex_clientes (RLS)
                                charge.published / charge.voided / metric.recorded (nuevos)
Navegador ─▶ Next BFF (/api/clientes/datos/*) ─▶ API /v1/clientes/* ─▶ codex_clientes
                                                   └─▶ Mercado Pago (Checkout Pro y Suscripciones)
MP webhook ─▶ API /v1/clientes/pagos/webhook/{proveedor} ─▶ relee el pago/suscripción en MP
```

Dinero: el cobro manda en Master Control (`charge.published`); el portal solo cobra lo publicado y
registra el pago. Los montos nunca vienen del navegador.

## Datos nuevos (migración `c0002`, todas con RLS por `client_id`)

| Tabla | Para qué |
|---|---|
| `charges` | Cargos publicados por MC (concepto, monto, vencimiento, estado pendiente/pagado/anulado) |
| `client_payments` | Intentos de pago de un cargo o de la membresía; único por referencia del proveedor |
| `memberships` | CODEX+ por cliente: estado, plan, monto, `proveedor_ref` de la suscripción |
| `service_metrics` | Serie diaria por servicio (`clave`, `valor`) publicada por MC (`metric.recorded`) |
| `service_settings` | Preferencias que el cliente configura por servicio (avisos, contacto técnico, ventana de mantenimiento) |
| `interest_requests` | "Me interesa" en servicios, combos y skills; entra al outbox como lead para el equipo |

## API nueva (`/v1/clientes/...`)

- `GET resumen`: todo el inicio en una llamada (servicios, saldo, próximo vencimiento, membresía, uptime).
- `GET pagos`, `POST pagos/{cargo}/checkout` (Idempotency-Key), `POST pagos/webhook/{proveedor}`.
- `GET membresia`, `POST membresia/suscribir`, `POST membresia/cancelar`.
- `GET servicios/{id}/metricas?dias=30`, `GET|PUT servicios/{id}/ajustes`.
- `POST interes` (servicio, combo o skill del catálogo).
- `GET reportes/{yyyy-mm}.pdf`: reporte mensual generado al vuelo (reportlab).
- Sync: `charge.published`, `charge.voided`, `metric.recorded`.

## Web (`/clientes/panel`)

Navegación lateral corta: Inicio, Servicios, Pagos, CODEX+, Descubrir, Reportes, Cuenta.

- **Inicio**: anillos de avance por servicio, línea de etapas, saldo pendiente con botón de pago,
  disponibilidad 30 días, tarjeta CODEX+ y una oferta del catálogo elegida por lo que el cliente aún no tiene.
- **Servicio**: etapas (cliente nuevo), gráfica de métricas, uptime, avances, entregables, ajustes.
- **Pagos**: barras de lo pagado por mes, cargos pendientes y vencidos, pagar con Mercado Pago.
- **CODEX+**: $499 MXN al mes. Asesoría semanal en línea, orientación tecnológica, cotizaciones y consultas.
- **Descubrir**: servicios que no tiene, combos con descuento y skills (talleres cortos de eficiencia).
  Catálogo en `content/portal-offers.json` (fuente única, editable sin deploy de la API).
- **Reportes**: un botón por mes para descargar el PDF.

Ventas pasivas: nunca modales; una tarjeta contextual por pantalla, basada en huecos reales del cliente.

## Fases

1. **Ahora** (este cambio): migración, sync, API, panel completo, login restaurado, pruebas.
2. **Master Control**: publicar `charge.*` y `metric.*` (otro repo).
3. **Llaves**: `MERCADOPAGO_ACCESS_TOKEN` en Railway; plan de suscripción CODEX+ en MP en producción.
4. **Infraestructura**: decisión pendiente sobre Hostinger (ver abajo).

## Infraestructura y Hostinger

D-008 dice web en Vercel y backend en Railway. El portal no depende de dónde corra: es la misma API y la
misma base. Mover el backend a un VPS de Hostinger se registraría como D-010 (reemplaza la parte Railway de
D-008) y necesita: Docker + Caddy (`infra/docker-compose.prod.yml` ya existe), backups probados, TLS,
monitoreo y quien lo opere. No se compra nada hasta elegir el plan.
