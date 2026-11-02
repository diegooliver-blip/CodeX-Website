"""Client billing: pay published charges and subscribe to CODEX+ through the configured gateway.

Amounts always come from the database (charges) or the offers catalog (membership), never from the browser.
Gateway notices are re-read from the gateway's API before anything changes, and a payment's `referencia` is
unique, so a replayed notice is a no-op.
"""

import json
import uuid
from datetime import UTC, date, datetime
from functools import lru_cache
from zoneinfo import ZoneInfo

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clientes.models import Charge, ClientPayment, ClientUser, Membership
from app.config import get_settings
from app.errors import ApiError
from app.observability import log
from app.services.payments import EventoIgnorado, _mp_request

SUPPORTED = ("mock", "mercadopago")
_MP_PAYMENT = {"approved": "pagado", "rejected": "fallido", "cancelled": "fallido", "refunded": "reembolsado", "charged_back": "reembolsado"}
_MP_PREAPPROVAL = {"authorized": "activa", "paused": "pausada", "cancelled": "cancelada", "pending": "pendiente"}


TZ = ZoneInfo("America/Mexico_City")  # clients' calendar: due dates, "this month", metric days


def hoy() -> date:
    return datetime.now(TZ).date()


@lru_cache
def offers() -> dict:
    return json.loads((get_settings().content_dir / "portal-offers.json").read_text(encoding="utf-8"))


def membership_price_cents() -> int:
    return int(offers()["membership"]["priceMxn"]) * 100


def provider_id() -> str | None:
    """The gateway client payments use, or None when online payment is off (the panel then shows transfer details)."""
    p = get_settings().payment_provider
    if p not in SUPPORTED:
        return None
    if p == "mercadopago" and not get_settings().mercadopago_access_token:
        return None
    return p


def _require_provider() -> str:
    p = provider_id()
    if p is None:
        raise ApiError(503, "PAGOS_NO_DISPONIBLES", "El pago en línea aún no está activo. Escríbenos y te enviamos los datos de transferencia.")
    return p


def _notification_url() -> str | None:
    base = get_settings().api_public_url
    return f"{base.rstrip('/')}/v1/clientes/pagos/webhook/mercadopago" if base else None


def add_month(d: date) -> date:
    month = d.month % 12 + 1
    year = d.year + (d.month == 12)
    for day in (d.day, 30, 29, 28):
        try:
            return date(year, month, day)
        except ValueError:
            continue
    raise AssertionError("unreachable")


# ---------- charges ----------
async def checkout_charge(db: AsyncSession, charge: Charge, retorno: str) -> dict:
    proveedor = _require_provider()
    if charge.estado != "pendiente":
        raise ApiError(409, "CARGO_NO_PAGABLE", "Este cargo ya no está pendiente.")
    pago = ClientPayment(
        id=uuid.uuid4(), client_id=charge.client_id, charge_id=charge.id, proveedor=proveedor,
        monto_centavos=charge.monto_centavos, moneda=charge.moneda,
    )
    db.add(pago)
    await db.flush()
    back = f"{retorno}?pago={pago.id}"
    if proveedor == "mock":
        pago.referencia = f"mock_{pago.id.hex}"
        return {"pago_id": str(pago.id), "url": back, "simulado": True}

    body = {
        "items": [{
            "id": charge.mc_charge_id, "title": charge.concepto[:250], "quantity": 1,
            "unit_price": charge.monto_centavos / 100, "currency_id": charge.moneda,
        }],
        "external_reference": f"clientes:{pago.id}",
        "back_urls": {"success": back, "failure": back, "pending": back},
        "auto_return": "approved",
        "statement_descriptor": "CODEX",
    }
    if url := _notification_url():
        body["notification_url"] = url
    try:
        pref = await _mp_request("POST", "/checkout/preferences", json_body=body, headers={"X-Idempotency-Key": str(pago.id)})
    except (httpx.HTTPError, RuntimeError) as exc:
        log.error("mp_preferencia_cliente_fallida: %s", exc)
        raise ApiError(502, "PROVEEDOR_NO_DISPONIBLE", "Mercado Pago no respondió. Intenta de nuevo en un momento.") from exc
    return {"pago_id": str(pago.id), "url": pref["init_point"], "simulado": False}


async def apply_payment(db: AsyncSession, pago_id: uuid.UUID, estado: str, referencia: str, monto: int, moneda: str) -> ClientPayment:
    """Apply a verified gateway result in the caller's transaction (sync context). Replays change nothing."""
    pago = await db.scalar(select(ClientPayment).where(ClientPayment.id == pago_id).with_for_update())
    if pago is None:
        raise EventoIgnorado("pago desconocido")
    if monto != pago.monto_centavos or moneda != pago.moneda:
        raise ApiError(400, "WEBHOOK_INVALIDO", "El aviso de pago no es válido.", {"motivo": "monto"})
    now = datetime.now(UTC)
    if estado == "pagado" and pago.estado in ("pendiente", "fallido"):
        pago.estado, pago.referencia = "pagado", referencia
        if pago.charge_id:
            charge = await db.scalar(select(Charge).where(Charge.id == pago.charge_id).with_for_update())
            if charge and charge.estado == "pendiente":
                charge.estado, charge.pagado_en = "pagado", now
    elif estado == "fallido" and pago.estado == "pendiente":
        pago.estado = "fallido"
    elif estado == "reembolsado" and pago.estado == "pagado":
        pago.estado = "reembolsado"
        if pago.charge_id:
            charge = await db.get(Charge, pago.charge_id)
            if charge:
                charge.estado, charge.pagado_en = "pendiente", None
    pago.actualizado_en = now
    return pago


# ---------- CODEX+ membership ----------
async def subscribe(db: AsyncSession, client_id: uuid.UUID, user: ClientUser, retorno: str) -> dict:
    proveedor = _require_provider()
    m = await db.scalar(select(Membership).where(Membership.client_id == client_id).with_for_update())
    if m and m.estado == "activa":
        raise ApiError(409, "YA_ACTIVA", "Tu membresía CODEX+ ya está activa.")
    if m is None:
        m = Membership(id=uuid.uuid4(), client_id=client_id, monto_centavos=membership_price_cents())
        db.add(m)
    m.estado, m.proveedor, m.monto_centavos, m.actualizado_en = "pendiente", proveedor, membership_price_cents(), datetime.now(UTC)
    await db.flush()
    if proveedor == "mock":
        m.proveedor_ref = f"mock_sub_{m.id.hex}"
        return {"url": f"{retorno}?membresia={m.id}", "simulado": True}

    body = {
        "reason": f"{offers()['membership']['name']} mensual",
        "external_reference": f"membresia:{m.id}",
        "payer_email": user.email,
        "back_url": retorno,
        "status": "pending",
        "auto_recurring": {
            "frequency": 1, "frequency_type": "months",
            "transaction_amount": m.monto_centavos / 100, "currency_id": m.moneda,
        },
    }
    if url := _notification_url():
        body["notification_url"] = url
    try:
        sub = await _mp_request("POST", "/preapproval", json_body=body, headers={"X-Idempotency-Key": f"sub-{m.id}-{int(m.actualizado_en.timestamp())}"})
    except (httpx.HTTPError, RuntimeError) as exc:
        log.error("mp_suscripcion_fallida: %s", exc)
        raise ApiError(502, "PROVEEDOR_NO_DISPONIBLE", "Mercado Pago no respondió. Intenta de nuevo en un momento.") from exc
    m.proveedor_ref = str(sub["id"])
    return {"url": sub["init_point"], "simulado": False}


async def cancel(db: AsyncSession, m: Membership) -> None:
    if m.estado == "cancelada":
        return
    if m.proveedor == "mercadopago" and m.proveedor_ref:
        try:
            await _mp_request("PUT", f"/preapproval/{m.proveedor_ref}", json_body={"status": "cancelled"})
        except (httpx.HTTPError, RuntimeError) as exc:
            log.error("mp_cancelar_suscripcion_fallida: %s", exc)
            raise ApiError(502, "PROVEEDOR_NO_DISPONIBLE", "No pudimos cancelar en Mercado Pago. Intenta de nuevo.") from exc
    m.estado, m.proximo_cobro, m.actualizado_en = "cancelada", None, datetime.now(UTC)


def set_membership_state(m: Membership, estado: str, proximo: date | None = None) -> None:
    now = datetime.now(UTC)
    if estado == "activa" and m.estado != "activa":
        m.activa_desde = m.activa_desde or now
    m.estado = estado
    m.proximo_cobro = proximo if estado == "activa" else None
    m.actualizado_en = now


async def record_membership_payment(db: AsyncSession, m: Membership, referencia: str, monto: int, moneda: str) -> None:
    exists = await db.scalar(select(ClientPayment.id).where(ClientPayment.referencia == referencia))
    if exists:
        return
    db.add(ClientPayment(
        id=uuid.uuid4(), client_id=m.client_id, membership_id=m.id, proveedor=m.proveedor or "mock",
        referencia=referencia, monto_centavos=monto, moneda=moneda, estado="pagado",
    ))
    set_membership_state(m, "activa", add_month(hoy()))


# ---------- Mercado Pago notices (sync context: spans clients) ----------
async def handle_mercadopago(db: AsyncSession, aviso: dict) -> str:
    tipo = aviso.get("type") or aviso.get("topic") or ""
    data_id = str((aviso.get("data") or {}).get("id") or aviso.get("resource") or "").rsplit("/", 1)[-1]
    if not data_id:
        raise EventoIgnorado("sin data.id")

    if tipo in ("subscription_preapproval", "preapproval"):
        sub = await _mp_request("GET", f"/preapproval/{data_id}")
        m = await _membership_from_ref(db, sub.get("external_reference"))
        estado = _MP_PREAPPROVAL.get(sub.get("status", ""))
        if m is None or estado is None:
            raise EventoIgnorado("suscripción ajena o sin cambio")
        proximo = _parse_date(sub.get("next_payment_date"))
        set_membership_state(m, estado, proximo)
        return estado

    if tipo != "payment":
        raise EventoIgnorado(f"tipo {tipo}")
    pago = await _mp_request("GET", f"/v1/payments/{data_id}")
    estado = _MP_PAYMENT.get(pago.get("status", ""))
    if estado is None:
        raise EventoIgnorado(f"pago {pago.get('status')}")
    ref = str(pago.get("external_reference") or "")
    monto = round(float(pago.get("transaction_amount") or 0) * 100)
    moneda = pago.get("currency_id") or ""
    if ref.startswith("clientes:"):
        try:
            pago_id = uuid.UUID(ref.removeprefix("clientes:"))
        except ValueError as exc:
            raise EventoIgnorado("referencia inválida") from exc
        out = await apply_payment(db, pago_id, estado, f"mp_pay_{data_id}", monto, moneda)
        return out.estado
    m = await _membership_from_ref(db, ref)
    if m is None:
        raise EventoIgnorado("pago ajeno al portal")
    if estado == "pagado":
        await record_membership_payment(db, m, f"mp_pay_{data_id}", monto, moneda)
    return estado


async def _membership_from_ref(db: AsyncSession, ref: str | None) -> Membership | None:
    if not ref or not str(ref).startswith("membresia:"):
        return None
    try:
        mid = uuid.UUID(str(ref).removeprefix("membresia:"))
    except ValueError:
        return None
    return await db.scalar(select(Membership).where(Membership.id == mid).with_for_update())


def _parse_date(value) -> date | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()
    except ValueError:
        return None


def overdue(charge: Charge, today: date | None = None) -> bool:
    today = today or hoy()
    return charge.estado == "pendiente" and charge.vence_en is not None and charge.vence_en < today

