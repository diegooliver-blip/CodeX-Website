"""Payment providers behind one contract (see docs/integracion-pagos.md).

`MockProvider` never moves money: its checkout sends the student to a simulated payment page, and its webhooks
are HMAC-signed by the API itself. `MercadoPagoProvider` uses Checkout Pro; its webhook is only a hint: the payment
is always re-read from the Mercado Pago API with our token, so a forged notification can't mark anything paid.
Stripe fails with PROVEEDOR_NO_CONFIGURADO until its adapter and keys exist; nothing ever simulates a charge.
"""

import hashlib
import hmac
import json
import logging
import uuid
from collections.abc import Mapping
from datetime import UTC, datetime
from typing import Literal, Protocol

import httpx
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.errors import ApiError
from app.models import Course, Enrollment, Order, PaymentLedgerEntry, User
from app.services import outbox

ProviderId = Literal["mock", "stripe", "mercadopago"]


class CheckoutSesion(BaseModel):
    url: str
    referencia_externa: str


class EventoPago(BaseModel):
    referencia_externa: str = Field(min_length=1, max_length=200)
    orden_id: uuid.UUID
    estado: Literal["pagado", "fallido", "reembolsado"]
    monto_centavos: int = Field(gt=0)
    moneda: str = Field(min_length=3, max_length=3)


class Salud(BaseModel):
    proveedor: str
    configurado: bool
    detalle: str = ""


class PaymentProvider(Protocol):
    id: str

    def listo(self) -> bool: ...  # keys present: the storefront may offer the purchase
    async def crear_checkout(self, orden: Order, retorno_url: str) -> CheckoutSesion: ...
    async def verificar_webhook(self, cuerpo: bytes, cabeceras: Mapping[str, str]) -> EventoPago: ...
    async def salud(self) -> Salud: ...


class EventoIgnorado(Exception):
    """A notice that needs no action (another topic, a payment still in process). Answered 200 so it isn't retried."""


def _invalid(detalle: str) -> ApiError:
    return ApiError(400, "WEBHOOK_INVALIDO", "El aviso de pago no es válido.", {"motivo": detalle})


class MockProvider:
    id = "mock"
    SIGNATURE_HEADER = "x-mock-firma"

    @staticmethod
    def _key() -> bytes:
        # Derived from the JWT secret so there is nothing extra to configure; it never leaves the API.
        return hmac.new(get_settings().jwt_secret.encode(), b"mock-payments-webhook", hashlib.sha256).digest()

    def firmar(self, cuerpo: bytes) -> str:
        return hmac.new(self._key(), cuerpo, hashlib.sha256).hexdigest()

    async def crear_checkout(self, orden: Order, retorno_url: str) -> CheckoutSesion:
        ref = f"mock_{orden.id.hex}"
        return CheckoutSesion(url=f"{retorno_url}?orden={orden.id}", referencia_externa=ref)

    async def verificar_webhook(self, cuerpo: bytes, cabeceras: Mapping[str, str]) -> EventoPago:
        firma = cabeceras.get(self.SIGNATURE_HEADER, "")
        if not firma or not hmac.compare_digest(firma, self.firmar(cuerpo)):
            raise _invalid("firma")
        try:
            return EventoPago.model_validate_json(cuerpo)
        except ValidationError as exc:
            raise _invalid("cuerpo") from exc

    def evento_simulado(self, orden: Order, estado: str) -> tuple[bytes, dict[str, str]]:
        """Body and headers exactly as the mock provider's webhook would send them."""
        cuerpo = json.dumps({
            "referencia_externa": orden.referencia_externa or f"mock_{orden.id.hex}",
            "orden_id": str(orden.id),
            "estado": estado,
            "monto_centavos": orden.monto_centavos,
            "moneda": orden.moneda,
        }).encode()
        return cuerpo, {self.SIGNATURE_HEADER: self.firmar(cuerpo)}

    def listo(self) -> bool:
        return True

    async def salud(self) -> Salud:
        return Salud(proveedor=self.id, configurado=True, detalle="simulado: no mueve dinero")


class _KeyedProvider:
    """Real gateways: refuse every call until the client's keys are configured."""

    id = ""
    keys: tuple[str, ...] = ()

    def _missing(self) -> list[str]:
        s = get_settings()
        return [k for k in self.keys if not getattr(s, k)]

    def _require(self) -> None:
        if self._missing():
            raise ApiError(503, "PROVEEDOR_NO_CONFIGURADO", "Los pagos con este proveedor aún no están disponibles.")
        # With keys present the adapter still has to be written against the provider's SDK and test keys.
        raise ApiError(501, "PROVEEDOR_PENDIENTE", "La integración con este proveedor está pendiente.")

    async def crear_checkout(self, orden: Order, retorno_url: str) -> CheckoutSesion:
        self._require()
        raise AssertionError("unreachable")

    async def verificar_webhook(self, cuerpo: bytes, cabeceras: Mapping[str, str]) -> EventoPago:
        self._require()
        raise AssertionError("unreachable")

    def listo(self) -> bool:
        return not self._missing()

    async def salud(self) -> Salud:
        missing = self._missing()
        return Salud(proveedor=self.id, configurado=not missing, detalle=f"faltan: {', '.join(missing)}" if missing else "")


class StripeProvider(_KeyedProvider):
    id = "stripe"
    keys = ("stripe_secret_key", "stripe_webhook_secret")


MP_API = "https://api.mercadopago.com"
MP_TIMEOUT = httpx.Timeout(15.0, connect=5.0)
log = logging.getLogger(__name__)

# Mercado Pago payment status -> our event. Anything else (pending, in_process, authorized) waits for the next notice.
_MP_STATUS = {
    "approved": "pagado",
    "rejected": "fallido",
    "cancelled": "fallido",
    "refunded": "reembolsado",
    "charged_back": "reembolsado",
}


async def _mp_request(method: str, path: str, *, json_body: dict | None = None, headers: dict | None = None) -> dict:
    """One call to the Mercado Pago REST API. Errors raise, so the webhook answers 5xx and Mercado Pago retries."""
    token = get_settings().mercadopago_access_token
    async with httpx.AsyncClient(base_url=MP_API, timeout=MP_TIMEOUT) as client:
        res = await client.request(
            method, path, json=json_body, headers={"Authorization": f"Bearer {token}"} | (headers or {})
        )
    if res.status_code >= 400:
        raise RuntimeError(f"Mercado Pago {method} {path} -> {res.status_code}: {res.text[:300]}")
    return res.json()


class MercadoPagoProvider:
    id = "mercadopago"

    def listo(self) -> bool:
        return bool(get_settings().mercadopago_access_token)

    def _require(self) -> None:
        if not self.listo():
            raise ApiError(503, "PROVEEDOR_NO_CONFIGURADO", "Los pagos con este proveedor aún no están disponibles.")

    async def crear_checkout(self, orden: Order, retorno_url: str) -> CheckoutSesion:
        self._require()
        s = get_settings()
        back = f"{retorno_url}?orden={orden.id}"
        body = {
            "items": [{
                "id": str(orden.course_id), "title": getattr(orden, "titulo", None) or "Curso CODEX", "quantity": 1,
                "unit_price": orden.monto_centavos / 100, "currency_id": orden.moneda,
            }],
            # The order's uuid is how the webhook finds the order to mark paid.
            "external_reference": str(orden.id),
            "back_urls": {"success": back, "failure": back, "pending": back},
            "auto_return": "approved",
            "statement_descriptor": "CODEX ACADEMIA",
        }
        if s.api_public_url:
            body["notification_url"] = f"{s.api_public_url.rstrip('/')}/pagos/webhook/mercadopago"
        try:
            pref = await _mp_request(
                "POST", "/checkout/preferences", json_body=body, headers={"X-Idempotency-Key": str(orden.id)}
            )
        except (httpx.HTTPError, RuntimeError) as exc:
            log.error("mercadopago_preferencia_fallida: %s", exc)
            raise ApiError(502, "PROVEEDOR_NO_DISPONIBLE", "Mercado Pago no respondió. Intenta de nuevo en un momento.") from exc
        return CheckoutSesion(url=pref["init_point"], referencia_externa=f"mp_pref_{pref['id']}")

    def _firma_valida(self, data_id: str, cabeceras: Mapping[str, str]) -> bool:
        """`x-signature: ts=..,v1=..` over `id:{data.id};request-id:{x-request-id};ts:{ts};`, when a secret is set."""
        secret = get_settings().mercadopago_webhook_secret
        if not secret:
            return True  # the payment is re-read from the API below, which is the real check
        firma = cabeceras.get("x-signature", "").replace(" ", "")
        partes = dict(p.split("=", 1) for p in firma.split(",") if "=" in p)
        ts, recibido = partes.get("ts"), partes.get("v1")
        if not ts or not recibido:
            return False
        manifiesto = f"id:{data_id.lower()};request-id:{cabeceras.get('x-request-id', '')};ts:{ts};"
        esperado = hmac.new(secret.encode(), manifiesto.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(esperado, recibido)

    async def verificar_webhook(self, cuerpo: bytes, cabeceras: Mapping[str, str]) -> EventoPago:
        self._require()
        try:
            aviso = json.loads(cuerpo or b"{}")
        except ValueError as exc:
            raise _invalid("cuerpo") from exc
        tipo = aviso.get("type") or aviso.get("topic")
        if tipo != "payment":
            raise EventoIgnorado(f"tipo {tipo}")
        data_id = str((aviso.get("data") or {}).get("id") or aviso.get("resource") or "").rsplit("/", 1)[-1]
        if not data_id.isdigit():
            raise EventoIgnorado("sin data.id")
        if not self._firma_valida(data_id, cabeceras):
            raise _invalid("firma")

        pago = await _mp_request("GET", f"/v1/payments/{data_id}")
        estado = _MP_STATUS.get(pago.get("status", ""))
        if estado is None:
            raise EventoIgnorado(f"pago {pago.get('status')}")
        try:
            orden_id = uuid.UUID(str(pago.get("external_reference")))
        except ValueError as exc:
            raise EventoIgnorado("pago sin orden de la academia") from exc
        return EventoPago(
            referencia_externa=f"mp_pay_{data_id}", orden_id=orden_id, estado=estado,
            monto_centavos=round(float(pago.get("transaction_amount") or 0) * 100),
            moneda=pago.get("currency_id") or "",
        )

    async def salud(self) -> Salud:
        ok = self.listo()
        return Salud(proveedor=self.id, configurado=ok, detalle="" if ok else "faltan: mercadopago_access_token")


PROVIDERS: dict[str, type] = {"mock": MockProvider, "stripe": StripeProvider, "mercadopago": MercadoPagoProvider}


def provider_by_id(provider_id: str) -> PaymentProvider:
    cls = PROVIDERS.get(provider_id)
    if cls is None:
        raise ApiError(404, "NO_ENCONTRADO", "Proveedor de pago desconocido.")
    return cls()


def sales_open() -> bool:
    """Show the buy button only when checkout can actually work."""
    provider = active_provider()
    return provider is not None and provider.listo()


def active_provider() -> PaymentProvider | None:
    """The provider checkout uses, or None when sales are off (PAYMENT_PROVIDER empty)."""
    configured = get_settings().payment_provider
    return provider_by_id(configured) if configured else None


async def apply_event(session: AsyncSession, proveedor: str, evento: EventoPago) -> Order:
    """Apply a verified provider event in the caller's transaction. Replays of the same event change nothing."""
    orden = await session.scalar(select(Order).where(Order.id == evento.orden_id).with_for_update())
    if orden is None or orden.proveedor != proveedor:
        raise _invalid("orden")
    if evento.monto_centavos != orden.monto_centavos or evento.moneda != orden.moneda:
        raise _invalid("monto")

    if evento.estado == "pagado" and orden.estado in ("pendiente", "fallida"):
        orden.estado = "pagada"
        await _ledger(session, orden, "cargo", orden.monto_centavos, evento.referencia_externa)
        await session.execute(
            insert(Enrollment)
            .values(id=uuid.uuid4(), user_id=orden.user_id, course_id=orden.course_id, orden_id=orden.id)
            .on_conflict_do_update(constraint="uq_enrollments_user_course", set_={"orden_id": orden.id})
        )
        alumno = (await session.execute(select(User.email, User.name).where(User.id == orden.user_id))).one()
        slug = await session.scalar(select(Course.slug).where(Course.id == orden.course_id))
        # Same shape as the lead events, so the worker hands it to Loops with the same handler.
        outbox.enqueue(session, "order_paid", "orden", str(orden.id), {
            "email": alumno.email,
            "first_name": alumno.name.split(" ")[0],
            "source": "web:academia",
            "properties": {"courseSlug": slug, "montoCentavos": orden.monto_centavos, "moneda": orden.moneda},
        })
    elif evento.estado == "fallido" and orden.estado == "pendiente":
        orden.estado = "fallida"
    elif evento.estado == "reembolsado" and orden.estado == "pagada":
        orden.estado = "reembolsada"
        await _ledger(session, orden, "reembolso", -orden.monto_centavos, evento.referencia_externa)
        await session.execute(
            Enrollment.__table__.delete().where(
                Enrollment.user_id == orden.user_id, Enrollment.course_id == orden.course_id
            )
        )
    orden.actualizado_en = datetime.now(UTC)
    return orden


async def _ledger(session: AsyncSession, orden: Order, tipo: str, monto: int, referencia: str) -> None:
    prefijo = "pago" if tipo == "cargo" else "reembolso"
    await session.execute(
        insert(PaymentLedgerEntry)
        .values(
            clave=f"{prefijo}:{orden.id}", orden_id=orden.id, user_id=orden.user_id, tipo=tipo,
            monto_centavos=monto, moneda=orden.moneda, proveedor=orden.proveedor,
            referencia_externa=referencia,
        )
        .on_conflict_do_nothing(index_elements=["clave"])
    )
