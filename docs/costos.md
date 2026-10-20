# Costos y trampas de free tier

Todas las cifras de proveedor están marcadas `[VERIFICAR]`. Se confirman en la página oficial de precios antes de contratar.

## Costo mensual estimado (USD)

| Proveedor | Hoy | 10x tráfico | 100x tráfico | Nota |
|---|---|---|---|---|
| VPS de 4 GB de RAM y 2 vCPU | ~10–20 `[VERIFICAR]` | igual | 8 GB, ~30–40 `[VERIFICAR]` | Un nodo alcanza hasta ~100x (ver capacidad en `arquitectura.md` §3) |
| Cloudflare (DNS, CDN, WAF) | 0 | 0 | 0 / Pro `[VERIFICAR]` | |
| Cloudflare R2 (backups y, más adelante, video) | 0 (< 10 GB) `[VERIFICAR]` | 0–2 | ~5–15 | Sin cargo por egress `[VERIFICAR]` |
| Anthropic (asistente) | Por token, con tope duro `[VERIFICAR precio de Opus]` | ×10 | Cambiar a un modelo más barato o cachear respuestas frecuentes | El mayor costo variable |
| Loops.so | 0 `[VERIFICAR límite de contactos]` | 0 / plan pagado | plan pagado | |
| GitHub Actions | 0 `[VERIFICAR minutos en repo privado]` | 0 | 0 | |
| UptimeRobot | 0 `[VERIFICAR]` | 0 | 0 | |
| Pasarela de pago | 0 fijo; comisión por transacción `[VERIFICAR Stripe MX / Mercado Pago]` | | | Solo con ventas |

## Trampas documentadas

| Servicio | Trampa | Disparador de upgrade |
|---|---|---|
| Vercel Hobby | Prohíbe el uso comercial: **descartado** | — |
| VPS único | Punto único de falla; tú eres el SRE y el backup | Si un incidente pasa de 2 h, evaluar Postgres gestionado |
| R2 free | Límite de storage y de operaciones `[VERIFICAR]` | Uso > 80 % del free tier |
| Anthropic | Una factura sin tope ante abuso del chat | Tope mensual con alerta al 80 % |
| Loops free | Límite de contactos o envíos | Contactos > 80 % del límite |
| GitHub Actions | Minutos limitados en repos privados | Minutos > 80 % → hacer público el repo o usar un runner propio |
| Egress de video desde el VPS | Ancho de banda del plan `[VERIFICAR]` | Más de 300 GB/mes → servir video desde R2 |

## Alertas de facturación (configurarlas el día 1)

- Anthropic: tope mensual y aviso al 80 %.
- Proveedor del VPS: aviso de ancho de banda.
- Cloudflare: notificación de uso de R2.
