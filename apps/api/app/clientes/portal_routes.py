"""Client portal v5 (`/v1/clientes/...`): overview, payments, CODEX+, metrics, settings, catalog interest, monthly PDF.

Every read runs under the client's row-level security scope (set by `current_client`). Gateway webhooks
span clients, so they switch to the sync context and re-read the payment from the gateway first.
"""

import json
import uuid
from collections import defaultdict
from datetime import UTC, date, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.clientes import billing, report
from app.clientes import service as identity
from app.clientes.db import ClientesDB, scope_to_sync
from app.clientes.models import (
    Charge,
    Client,
    ClientPayment,
    InterestRequest,
    Membership,
    Service,
    ServiceMetric,
    ServiceSettings,
    ServiceUpdate,
    UptimeCheck,
)
from app.clientes.routes import Current, _card
from app.config import get_settings
from app.errors import ApiError
from app.limiter import limiter
from app.services import outbox, storage
from app.services.payments import EventoIgnorado

router = APIRouter(prefix="/v1/clientes", tags=["portal de clientes"])
INTEREST_EVENT = "cliente_interes"  # handled by app.clientes.emails.HANDLERS


# ---------- schemas ----------
class ChargeOut(BaseModel):
    id: uuid.UUID
    concepto: str
    monto_centavos: int
    moneda: str
    emitido_en: date
    vence_en: date | None
    estado: str
    vencido: bool
    pagado_en: datetime | None
    servicio: str | None
    tiene_factura: bool


class MonthTotal(BaseModel):
    mes: str  # yyyy-mm
    pagado_centavos: int


class PaymentsOut(BaseModel):
    pago_en_linea: bool
    pendiente_centavos: int
    vencido_centavos: int
    cargos: list[ChargeOut]
    historial: list[MonthTotal]


class MembershipOut(BaseModel):
    estado: Literal["ninguna", "pendiente", "activa", "pausada", "cancelada"]
    monto_centavos: int
    moneda: str
    activa_desde: datetime | None
    proximo_cobro: date | None
    pago_en_linea: bool


class Overview(BaseModel):
    servicios: list[dict]
    pendiente_centavos: int
    vencido_centavos: int
    proximo_vencimiento: date | None
    disponibilidad_30d: float | None
    membresia: MembershipOut
    contratados: list[str]  # service slugs the client already has: the catalog skips them
    reportes: list[str]  # yyyy-mm with activity, newest first


class MetricSeries(BaseModel):
    clave: str
    etiqueta: str
    total: float
    puntos: list[tuple[date, float]]


class SettingsIO(BaseModel):
    avisos_avance: bool = True
    avisos_caida: bool = True
    contacto_tecnico: str = Field(default="", max_length=200)
    ventana_mantenimiento: Literal["domingo_noche", "sabado_noche", "entre_semana_noche", "coordinar"] = "domingo_noche"


class InterestIn(BaseModel):
    tipo: Literal["servicio", "combo", "skill", "membresia"]
    slug: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9-]+$")


class CheckoutOut(BaseModel):
    url: str
    simulado: bool


class SimulateIn(BaseModel):
    estado: Literal["pagado", "fallido"] = "pagado"


# ---------- helpers ----------
def _charge_out(c: Charge, services: dict[uuid.UUID, str]) -> ChargeOut:
    return ChargeOut(
        id=c.id, concepto=c.concepto, monto_centavos=c.monto_centavos, moneda=c.moneda, emitido_en=c.emitido_en,
        vence_en=c.vence_en, estado=c.estado, vencido=billing.overdue(c), pagado_en=c.pagado_en,
        servicio=services.get(c.service_id) if c.service_id else None, tiene_factura=bool(c.factura_key),
    )


async def _membership(db, client_id: uuid.UUID) -> MembershipOut:
    m = await db.scalar(select(Membership).where(Membership.client_id == client_id))
    online = billing.provider_id() is not None
    if m is None:
        return MembershipOut(estado="ninguna", monto_centavos=billing.membership_price_cents(), moneda="MXN",
                             activa_desde=None, proximo_cobro=None, pago_en_linea=online)
    return MembershipOut(estado=m.estado, monto_centavos=m.monto_centavos, moneda=m.moneda,
                         activa_desde=m.activa_desde, proximo_cobro=m.proximo_cobro, pago_en_linea=online)


async def _service_or_404(db, service_id: uuid.UUID) -> Service:
    svc = await db.scalar(select(Service).where(Service.id == service_id, Service.eliminado_en.is_(None)))
    if svc is None:
        raise ApiError(404, "NO_ENCONTRADO", "Servicio no encontrado.")
    return svc


def _month_bounds(ym: str) -> tuple[date, date]:
    try:
        start = datetime.strptime(ym, "%Y-%m").date()
    except ValueError as exc:
        raise ApiError(404, "NO_ENCONTRADO", "Reporte no encontrado.") from exc
    return start, billing.add_month(start)


def _retorno(path: str) -> str:
    return f"{get_settings().portal_url.rstrip('/')}{path}"


# ---------- overview ----------
@router.get("/resumen", response_model=Overview)
async def overview(db: ClientesDB, auth: Current) -> dict:
    rows = list(await db.scalars(select(Service).where(Service.eliminado_en.is_(None)).order_by(Service.actualizado_en.desc())))
    cards = [await _card(db, s) for s in rows]
    pending = list(await db.scalars(select(Charge).where(Charge.estado == "pendiente")))
    dispo = [c["estado"].disponibilidad_30d for c in cards if c["estado"].disponibilidad_30d is not None]
    out = {
        "servicios": cards,
        "pendiente_centavos": sum(c.monto_centavos for c in pending),
        "vencido_centavos": sum(c.monto_centavos for c in pending if billing.overdue(c)),
        "proximo_vencimiento": min((c.vence_en for c in pending if c.vence_en), default=None),
        "disponibilidad_30d": round(sum(dispo) / len(dispo), 2) if dispo else None,
        "membresia": await _membership(db, auth.user.client_id),
        "contratados": sorted({s.servicio_slug for s in rows if s.servicio_slug}),
        "reportes": await _report_months(db, auth.user.client_id),
    }
    await db.commit()
    return out


async def _report_months(db, client_id: uuid.UUID) -> list[str]:
    client = await db.get(Client, client_id)
    start = (client.creado_en.astimezone(billing.TZ) if client else datetime.now(billing.TZ)).date().replace(day=1)
    today = billing.hoy().replace(day=1)
    months, cur = [], start
    while cur <= today and len(months) < 24:
        months.append(cur.strftime("%Y-%m"))
        cur = billing.add_month(cur)
    return list(reversed(months))


# ---------- payments ----------
@router.get("/pagos", response_model=PaymentsOut)
async def payments(db: ClientesDB, auth: Current) -> dict:
    services = dict((await db.execute(select(Service.id, Service.nombre))).all())
    charges = list(await db.scalars(
        select(Charge).where(Charge.estado != "anulado").order_by(Charge.estado.desc(), Charge.vence_en.asc().nulls_last(), Charge.emitido_en.desc())
    ))
    first = billing.hoy().replace(day=1)
    since = first.replace(year=first.year - 1)  # 12 months including this one: start one year back, step 12
    mes = func.to_char(func.timezone(billing.TZ.key, ClientPayment.actualizado_en), "YYYY-MM")
    paid = await db.execute(
        select(mes, func.sum(ClientPayment.monto_centavos))
        .where(ClientPayment.estado == "pagado", ClientPayment.actualizado_en >= since)
        .group_by(mes)
    )
    by_month = dict(paid.all())
    months, cur = [], since
    for _ in range(12):
        cur = billing.add_month(cur)
        key = cur.strftime("%Y-%m")
        months.append({"mes": key, "pagado_centavos": int(by_month.get(key, 0) or 0)})
    pending = [c for c in charges if c.estado == "pendiente"]
    out = {
        "pago_en_linea": billing.provider_id() is not None,
        "pendiente_centavos": sum(c.monto_centavos for c in pending),
        "vencido_centavos": sum(c.monto_centavos for c in pending if billing.overdue(c)),
        "cargos": [_charge_out(c, services) for c in charges],
        "historial": months,
    }
    await db.commit()
    return out


@router.post("/pagos/{charge_id}/checkout", response_model=CheckoutOut, status_code=201)
@limiter.limit("10/minute")
async def pay_charge(request: Request, charge_id: uuid.UUID, db: ClientesDB, auth: Current) -> dict:
    charge = await db.scalar(select(Charge).where(Charge.id == charge_id).with_for_update())
    if charge is None:
        raise ApiError(404, "NO_ENCONTRADO", "Cargo no encontrado.")
    out = await billing.checkout_charge(db, charge, _retorno("/clientes/panel/pagos"))
    identity.audit(db, "pago_iniciado", "ok", user_id=auth.user.id, email=auth.user.email)
    await db.commit()
    return out


@router.post("/pagos/simular/{pago_id}", response_model=dict)
async def simulate_payment(pago_id: uuid.UUID, body: SimulateIn, db: ClientesDB, auth: Current) -> dict:
    """Mock gateway only: the simulated checkout page confirms through the same apply path as a real notice."""
    if billing.provider_id() != "mock":
        raise ApiError(404, "NO_ENCONTRADO", "No disponible")
    pago = await db.scalar(select(ClientPayment).where(ClientPayment.id == pago_id))  # RLS: only this client's
    if pago is None:
        raise ApiError(404, "NO_ENCONTRADO", "Pago no encontrado.")
    await scope_to_sync(db)
    pago = await billing.apply_payment(db, pago.id, body.estado, pago.referencia or f"mock_{pago.id.hex}", pago.monto_centavos, pago.moneda)
    await db.commit()
    return {"estado": pago.estado}


@router.get("/pagos/{charge_id}/factura")
async def invoice(charge_id: uuid.UUID, db: ClientesDB, auth: Current) -> dict:
    c = await db.scalar(select(Charge).where(Charge.id == charge_id))
    if c is None or not c.factura_key:
        raise ApiError(404, "NO_ENCONTRADO", "Factura no disponible.")
    identity.audit(db, "descarga_factura", "ok", user_id=auth.user.id, email=auth.user.email)
    await db.commit()
    return {"url": storage.presign_get(c.factura_key, expires=300, filename=f"factura-{c.mc_charge_id}.pdf"), "expira_en_s": 300}


@router.post("/pagos/webhook/{proveedor}")
async def payment_webhook(proveedor: str, request: Request, db: ClientesDB) -> dict:
    """Mercado Pago notices for client charges and CODEX+. The notice is only a hint: the payment is re-read."""
    if proveedor != "mercadopago" or billing.provider_id() != "mercadopago":
        raise ApiError(404, "NO_ENCONTRADO", "Proveedor de pago desconocido.")
    try:
        aviso = json.loads(await request.body() or b"{}")
    except ValueError as exc:
        raise ApiError(400, "WEBHOOK_INVALIDO", "El aviso de pago no es válido.") from exc
    await scope_to_sync(db)
    try:
        estado = await billing.handle_mercadopago(db, aviso)
    except EventoIgnorado as exc:
        return {"ok": True, "ignorado": str(exc)}
    await db.commit()
    return {"ok": True, "estado": estado}


# ---------- CODEX+ ----------
@router.get("/membresia", response_model=MembershipOut)
async def membership(db: ClientesDB, auth: Current) -> MembershipOut:
    out = await _membership(db, auth.user.client_id)
    await db.commit()
    return out


@router.post("/membresia/suscribir", response_model=CheckoutOut, status_code=201)
@limiter.limit("5/minute")
async def subscribe(request: Request, db: ClientesDB, auth: Current) -> dict:
    out = await billing.subscribe(db, auth.user.client_id, auth.user, _retorno("/clientes/panel/codex-plus"))
    identity.audit(db, "membresia_suscribir", "ok", user_id=auth.user.id, email=auth.user.email)
    await db.commit()
    return out


@router.post("/membresia/simular", response_model=MembershipOut)
async def simulate_membership(db: ClientesDB, auth: Current) -> MembershipOut:
    if billing.provider_id() != "mock":
        raise ApiError(404, "NO_ENCONTRADO", "No disponible")
    m = await db.scalar(select(Membership).where(Membership.client_id == auth.user.client_id).with_for_update())
    if m is None or m.estado not in ("pendiente", "pausada"):
        raise ApiError(409, "SIN_SUSCRIPCION", "No hay una suscripción por confirmar.")
    await billing.record_membership_payment(db, m, f"mock_sub_pay_{m.id.hex}_{billing.hoy():%Y%m}", m.monto_centavos, m.moneda)
    await db.flush()
    out = await _membership(db, auth.user.client_id)  # before commit: the RLS scope is transaction-local
    await db.commit()
    return out


@router.post("/membresia/cancelar", response_model=MembershipOut)
async def cancel_membership(db: ClientesDB, auth: Current) -> MembershipOut:
    m = await db.scalar(select(Membership).where(Membership.client_id == auth.user.client_id).with_for_update())
    if m is None:
        raise ApiError(404, "NO_ENCONTRADO", "No tienes membresía.")
    await billing.cancel(db, m)
    identity.audit(db, "membresia_cancelar", "ok", user_id=auth.user.id, email=auth.user.email)
    await db.flush()
    out = await _membership(db, auth.user.client_id)
    await db.commit()
    return out


# ---------- metrics and settings ----------
@router.get("/servicios/{service_id}/metricas", response_model=list[MetricSeries])
async def metrics(service_id: uuid.UUID, db: ClientesDB, auth: Current, dias: int = 30) -> list[dict]:
    svc = await _service_or_404(db, service_id)
    dias = max(7, min(dias, 365))
    since = billing.hoy() - timedelta(days=dias - 1)
    rows = await db.execute(
        select(ServiceMetric.clave, ServiceMetric.etiqueta, ServiceMetric.dia, ServiceMetric.valor)
        .where(ServiceMetric.service_id == svc.id, ServiceMetric.dia >= since)
        .order_by(ServiceMetric.clave, ServiceMetric.dia)
    )
    series: dict[str, dict] = {}
    for clave, etiqueta, dia, valor in rows:
        s = series.setdefault(clave, {"clave": clave, "etiqueta": etiqueta or clave, "valores": {}})
        s["valores"][dia] = valor
    out = []
    for s in series.values():
        puntos = [(since + timedelta(days=i), s["valores"].get(since + timedelta(days=i), 0.0)) for i in range(dias)]
        out.append({"clave": s["clave"], "etiqueta": s["etiqueta"], "total": sum(v for _, v in puntos), "puntos": puntos})
    await db.commit()
    return out


@router.get("/servicios/{service_id}/ajustes", response_model=SettingsIO)
async def get_settings_(service_id: uuid.UUID, db: ClientesDB, auth: Current) -> SettingsIO:
    svc = await _service_or_404(db, service_id)
    row = await db.get(ServiceSettings, svc.id)
    await db.commit()
    return SettingsIO.model_validate(row, from_attributes=True) if row else SettingsIO()


@router.put("/servicios/{service_id}/ajustes", response_model=SettingsIO)
async def put_settings(service_id: uuid.UUID, body: SettingsIO, db: ClientesDB, auth: Current) -> SettingsIO:
    svc = await _service_or_404(db, service_id)
    row = await db.get(ServiceSettings, svc.id)
    if row is None:
        row = ServiceSettings(service_id=svc.id, client_id=svc.client_id)
        db.add(row)
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    row.actualizado_en = datetime.now(UTC)
    identity.audit(db, "ajustes_servicio", "ok", user_id=auth.user.id, email=auth.user.email)
    await db.commit()
    return body


# ---------- catalog interest ----------
def _catalog_slugs(tipo: str) -> set[str]:
    o = billing.offers()
    if tipo == "combo":
        return {c["slug"] for c in o["combos"]}
    if tipo == "skill":
        return {s["slug"] for s in o["skills"]}
    if tipo == "membresia":
        return {o["membership"]["slug"]}
    root = get_settings().content_dir
    return {s["slug"] for s in json.loads((root / "services.json").read_text(encoding="utf-8"))}


@router.post("/interes", status_code=202)
@limiter.limit("20/hour")
async def interest(request: Request, body: InterestIn, db: ClientesDB, auth: Current) -> dict:
    if body.slug not in _catalog_slugs(body.tipo):
        raise ApiError(404, "NO_ENCONTRADO", "Ese elemento no está en el catálogo.")
    recent = await db.scalar(
        select(InterestRequest.id).where(
            InterestRequest.tipo == body.tipo, InterestRequest.slug == body.slug,
            InterestRequest.creado_en >= datetime.now(UTC) - timedelta(days=7),
        )
    )
    if recent is None:
        db.add(InterestRequest(client_id=auth.user.client_id, user_id=auth.user.id, tipo=body.tipo, slug=body.slug))
        client = await db.get(Client, auth.user.client_id)
        outbox.enqueue(db, INTEREST_EVENT, "interes", f"{auth.user.client_id}:{body.slug}", {
            "name": auth.user.nombre, "email": auth.user.email, "company": client.nombre if client else "",
            "service": f"{body.tipo}: {body.slug}", "source": "portal",
            "message": f"Pidió información de {body.tipo} '{body.slug}' desde el portal de clientes.",
        })
    await db.commit()
    return {"ok": True}


# ---------- monthly report ----------
@router.get("/reportes/{mes}.pdf")
async def monthly_report(mes: str, db: ClientesDB, auth: Current) -> Response:
    start, end = _month_bounds(mes)
    if start > billing.hoy():
        raise ApiError(404, "NO_ENCONTRADO", "Reporte no encontrado.")
    client = await db.get(Client, auth.user.client_id)
    services = list(await db.scalars(select(Service).where(Service.eliminado_en.is_(None)).order_by(Service.nombre)))
    names = {s.id: s.nombre for s in services}

    rows = []
    for s in services:
        total, ok = (await db.execute(
            select(func.count(), func.count().filter(UptimeCheck.ok)).where(
                UptimeCheck.service_id == s.id, UptimeCheck.revisado_en >= start, UptimeCheck.revisado_en < end
            )
        )).one()
        metric_rows = (await db.execute(
            select(ServiceMetric.clave, ServiceMetric.etiqueta, ServiceMetric.dia, ServiceMetric.valor)
            .where(ServiceMetric.service_id == s.id, ServiceMetric.dia >= start, ServiceMetric.dia < end)
            .order_by(ServiceMetric.clave, ServiceMetric.dia)
        )).all()
        totals: dict[str, list] = {}
        daily: dict[str, dict[date, float]] = defaultdict(dict)
        for clave, etiqueta, dia, valor in metric_rows:
            t = totals.setdefault(clave, [etiqueta or clave, 0.0])
            t[1] += valor
            daily[clave][dia] = valor
        main = next(iter(totals), None)
        days = (end - start).days
        serie = [(start + timedelta(days=i), daily[main].get(start + timedelta(days=i), 0.0)) for i in range(days)] if main else []
        rows.append(report.ServiceRow(
            nombre=s.nombre, etapa=s.etapa, avance=s.avance,
            disponibilidad=round(100 * ok / total, 2) if total else None,
            metricas={k: (v[0], v[1]) for k, v in totals.items()}, serie=serie,
        ))

    updates = await db.execute(
        select(ServiceUpdate.publicado_en, ServiceUpdate.service_id, ServiceUpdate.titulo)
        .where(ServiceUpdate.publicado_en >= start, ServiceUpdate.publicado_en < end)
        .order_by(ServiceUpdate.publicado_en)
    )
    paid = await db.execute(
        select(ClientPayment.actualizado_en, Charge.concepto, ClientPayment.monto_centavos, ClientPayment.moneda, ClientPayment.membership_id)
        .outerjoin(Charge, Charge.id == ClientPayment.charge_id)
        .where(ClientPayment.estado == "pagado", ClientPayment.actualizado_en >= start, ClientPayment.actualizado_en < end)
        .order_by(ClientPayment.actualizado_en)
    )
    pending = await db.scalar(select(func.coalesce(func.sum(Charge.monto_centavos), 0)).where(Charge.estado == "pendiente"))
    m = await db.scalar(select(Membership.estado).where(Membership.client_id == auth.user.client_id))

    data = report.ReportData(
        cliente=client.nombre if client else "",
        mes=start,
        servicios=rows,
        avances=[(f.date(), names.get(sid, ""), t) for f, sid, t in updates],
        pagos=[(f.date(), concepto or ("CODEX+" if mid else "Pago"), monto, moneda) for f, concepto, monto, moneda, mid in paid],
        pendiente_centavos=int(pending or 0),
        membresia_activa=m == "activa",
    )
    identity.audit(db, "reporte_mensual", "ok", user_id=auth.user.id, email=auth.user.email)
    await db.commit()
    pdf = report.build_pdf(data)
    return Response(pdf, media_type="application/pdf", headers={
        "Content-Disposition": f'attachment; filename="codex-reporte-{mes}.pdf"', "Cache-Control": "no-store",
    })
