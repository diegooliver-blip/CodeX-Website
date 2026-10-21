# Integración de pagos de cursos

## Estado
Contrato y adaptador mock (F4). Los adaptadores reales de Stripe y Mercado Pago están declarados y **fallan con `PROVEEDOR_NO_CONFIGURADO`** mientras no haya llaves. Nunca simulan un cobro.

## Contrato

```python
class PaymentProvider(Protocol):
    id: str  # "mock" | "stripe" | "mercadopago"
    async def crear_checkout(self, orden: Orden, retorno_url: str) -> CheckoutSesion: ...
    async def verificar_webhook(self, cuerpo: bytes, cabeceras: Mapping[str, str]) -> EventoPago: ...
    async def salud(self) -> Salud: ...
```

- `EventoPago` = `{referencia_externa, orden_id, estado: pagado|fallido|reembolsado, monto_centavos, moneda}`.
- Todo lo que entra del proveedor se valida con pydantic. Lo inválido se responde con 400 y se registra.

## Flujo
1. El alumno pulsa "Comprar". La API llama a `POST /checkout` con `Idempotency-Key`, crea la orden en estado `pendiente` y pide la sesión al proveedor.
2. El proveedor manda un webhook. Se verifica la firma y la `referencia_externa` es única (idempotente).
3. En **una transacción**: la orden pasa a `pagada`, se inserta en `payments_ledger` (clave `pago:<orden_id>`), se hace upsert en `enrollments` y se escribe `order_paid` en el outbox.
4. Las correcciones (reembolsos) son movimientos inversos en el ledger, nunca un UPDATE.

## Montos
Siempre en centavos (`bigint`), moneda `MXN`. `courses.price_mxn` sigue en pesos enteros (lo edita el admin); la orden guarda `price_mxn * 100` al crearse, así que un cambio de precio no altera órdenes existentes.

## Configuración
`PAYMENT_PROVIDER`: vacío = ventas cerradas (`PAGOS_NO_DISPONIBLES`), `mock` solo en local (docker-compose lo activa), `stripe` o `mercadopago` cuando lleguen las llaves. Los webhooks entran por `POST /pagos/webhook/{proveedor}` (exento de la llave interna; se autentican con la firma del proveedor). Un curso con compras no se puede borrar (`CURSO_CON_VENTAS`): se despublica.

## Qué se necesita del cliente
- Elegir la pasarela: Stripe, Mercado Pago o ambas.
- Llaves de **prueba** (publishable/secret o access token) y el secreto del webhook.
- ¿Factura CFDI a alumnos? Si sí, hace falta un PAC: queda como fase futura.
