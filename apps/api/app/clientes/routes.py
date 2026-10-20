"""Client-portal API (`/v1/clientes`). Called only by the Next.js BFF, which keeps the session in an httpOnly cookie
and forwards it as `X-Client-Session`. All portal data reads are scoped to the client through row-level security.
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select

from app.clientes import service
from app.clientes.db import ClientesDB, scope_to_client
from app.clientes.models import Client, ClientSession, ClientUser, Deliverable, Service, ServiceUpdate, UptimeCheck
from app.clientes.turnstile import require_human
from app.errors import ApiError
from app.limiter import client_ip, limiter
from app.services import storage

router = APIRouter(prefix="/v1/clientes", tags=["portal de clientes"])


# ---------- schemas ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)
    captcha: str = Field(default="", max_length=4096)


class EmailIn(BaseModel):
    email: EmailStr
    captcha: str = Field(default="", max_length=4096)


class TokenPasswordIn(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=1, max_length=256)
    captcha: str = Field(default="", max_length=4096)


class ChangePasswordIn(BaseModel):
    actual: str = Field(min_length=1, max_length=256)
    nueva: str = Field(min_length=1, max_length=256)


class Me(BaseModel):
    nombre: str
    email: str
    cliente: str
    es_demo: bool


class SessionOut(BaseModel):
    sesion: str
    expira_en: datetime
    usuario: Me


# ---------- helpers ----------
def _ua(request: Request) -> str:
    return request.headers.get("user-agent", "")


async def _me(db, user: ClientUser) -> Me:
    client = await db.get(Client, user.client_id)
    return Me(nombre=user.nombre, email=user.email, cliente=client.nombre if client else "", es_demo=bool(client and client.es_demo))


async def _commit_then_raise(db, exc: ApiError):
    """Failed attempts and audit rows must persist even though the request fails."""
    await db.commit()
    raise exc


@dataclass
class Authed:
    session: ClientSession
    user: ClientUser


async def current_client(
    db: ClientesDB, x_client_session: Annotated[str | None, Header(alias="X-Client-Session")] = None
) -> Authed:
    row, user = await service.resolve_session(db, x_client_session)
    await scope_to_client(db, user.client_id)
    return Authed(session=row, user=user)


Current = Annotated[Authed, Depends(current_client)]


# ---------- auth ----------
@router.post("/auth/login", response_model=SessionOut)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginIn, db: ClientesDB) -> SessionOut:
    await require_human(body.captcha, client_ip(request))
    try:
        raw, expires, user = await service.login(
            db, body.email.lower(), body.password, ip=client_ip(request), user_agent=_ua(request)
        )
    except ApiError as exc:
        await _commit_then_raise(db, exc)
    me = await _me(db, user)
    await db.commit()
    return SessionOut(sesion=raw, expira_en=expires, usuario=me)


@router.post("/auth/logout", status_code=204)
async def logout(db: ClientesDB, auth: Current) -> None:
    auth.session.revocado_en = datetime.now(UTC)
    service.audit(db, "logout", "ok", user_id=auth.user.id, email=auth.user.email)
    await db.commit()


@router.post("/auth/olvide", status_code=202)
@limiter.limit("5/minute")
async def forgot(request: Request, body: EmailIn, db: ClientesDB) -> dict:
    await require_human(body.captcha, client_ip(request))
    await service.request_reset(db, body.email.lower(), ip=client_ip(request))
    await db.commit()
    return {"ok": True, "mensaje": "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña."}


async def _complete_link(request: Request, body: TokenPasswordIn, db, tipo: str) -> SessionOut:
    await require_human(body.captcha, client_ip(request))
    user = await service.consume_link(db, body.token, tipo)
    await service.set_password(db, user, body.password)
    service.audit(db, tipo, "ok", user_id=user.id, email=user.email, ip=client_ip(request))
    raw, expires = await service.open_session(db, user, ip=client_ip(request), user_agent=_ua(request))
    me = await _me(db, user)
    await db.commit()
    return SessionOut(sesion=raw, expira_en=expires, usuario=me)


@router.post("/auth/activar", response_model=SessionOut)
@limiter.limit("10/minute")
async def activate(request: Request, body: TokenPasswordIn, db: ClientesDB) -> SessionOut:
    return await _complete_link(request, body, db, "invitacion")


@router.post("/auth/restablecer", response_model=SessionOut)
@limiter.limit("10/minute")
async def reset(request: Request, body: TokenPasswordIn, db: ClientesDB) -> SessionOut:
    return await _complete_link(request, body, db, "restablecer")


@router.post("/auth/cambiar-contrasena", status_code=204)
@limiter.limit("5/minute")
async def change_password(request: Request, body: ChangePasswordIn, db: ClientesDB, auth: Current) -> None:
    from app.clientes.security import verify_password

    if not verify_password(body.actual, auth.user.password_hash):
        service.audit(db, "cambiar_contrasena", "actual_incorrecta", user_id=auth.user.id, email=auth.user.email)
        await _commit_then_raise(db, ApiError(400, "CONTRASENA_ACTUAL_INCORRECTA", "Tu contraseña actual no es correcta."))
    await service.set_password(db, auth.user, body.nueva)
    # set_password revoked every session; keep the one making this request alive.
    auth.session.revocado_en = None
    service.audit(db, "cambiar_contrasena", "ok", user_id=auth.user.id, email=auth.user.email)
    await db.commit()


@router.get("/me", response_model=Me)
async def me(db: ClientesDB, auth: Current) -> Me:
    out = await _me(db, auth.user)
    await db.commit()  # persists the sliding session window
    return out


# ---------- portal data ----------
class UpdateOut(BaseModel):
    id: uuid.UUID
    titulo: str
    cuerpo: str
    publicado_en: datetime


class DeliverableOut(BaseModel):
    id: uuid.UUID
    titulo: str
    tipo_contenido: str
    tamano_bytes: int
    publicado_en: datetime


class UptimeOut(BaseModel):
    monitoreado: bool
    en_linea: bool | None
    ultima_revision: datetime | None
    disponibilidad_24h: float | None
    disponibilidad_30d: float | None
    latencia_ms: int | None


class ServiceCard(BaseModel):
    id: uuid.UUID
    nombre: str
    servicio_slug: str
    etapa: str
    avance: int
    fecha_estimada: date | None
    actualizado_en: datetime
    ultimo_avance: UpdateOut | None
    estado: UptimeOut


class ServiceDetail(ServiceCard):
    descripcion: str
    avances: list[UpdateOut]
    entregables: list[DeliverableOut]


async def _uptime(db, svc: Service) -> UptimeOut:
    if not svc.monitor_url:
        return UptimeOut(monitoreado=False, en_linea=None, ultima_revision=None, disponibilidad_24h=None, disponibilidad_30d=None, latencia_ms=None)
    last = await db.scalar(
        select(UptimeCheck).where(UptimeCheck.service_id == svc.id).order_by(UptimeCheck.revisado_en.desc()).limit(1)
    )
    now = datetime.now(UTC)

    async def ratio(window: timedelta) -> float | None:
        total, ok = (
            await db.execute(
                select(func.count(), func.count().filter(UptimeCheck.ok)).where(
                    UptimeCheck.service_id == svc.id, UptimeCheck.revisado_en >= now - window
                )
            )
        ).one()
        return round(100 * ok / total, 2) if total else None

    return UptimeOut(
        monitoreado=True,
        en_linea=last.ok if last else None,
        ultima_revision=last.revisado_en if last else None,
        disponibilidad_24h=await ratio(timedelta(hours=24)),
        disponibilidad_30d=await ratio(timedelta(days=30)),
        latencia_ms=last.latencia_ms if last else None,
    )


async def _last_update(db, svc: Service) -> UpdateOut | None:
    u = await db.scalar(
        select(ServiceUpdate).where(ServiceUpdate.service_id == svc.id).order_by(ServiceUpdate.publicado_en.desc()).limit(1)
    )
    return UpdateOut.model_validate(u, from_attributes=True) if u else None


async def _card(db, svc: Service) -> dict:
    return {
        "id": svc.id, "nombre": svc.nombre, "servicio_slug": svc.servicio_slug, "etapa": svc.etapa,
        "avance": svc.avance, "fecha_estimada": svc.fecha_estimada, "actualizado_en": svc.actualizado_en,
        "ultimo_avance": await _last_update(db, svc), "estado": await _uptime(db, svc),
    }


@router.get("/servicios", response_model=list[ServiceCard])
async def list_services(db: ClientesDB, auth: Current) -> list[dict]:
    rows = await db.scalars(select(Service).where(Service.eliminado_en.is_(None)).order_by(Service.actualizado_en.desc()))
    cards = [await _card(db, s) for s in rows]
    await db.commit()
    return cards


@router.get("/servicios/{service_id}", response_model=ServiceDetail)
async def service_detail(service_id: uuid.UUID, db: ClientesDB, auth: Current) -> dict:
    svc = await db.scalar(select(Service).where(Service.id == service_id, Service.eliminado_en.is_(None)))
    if svc is None:  # also the answer for another client's service: RLS hides it
        raise ApiError(404, "NO_ENCONTRADO", "Servicio no encontrado.")
    updates = await db.scalars(
        select(ServiceUpdate).where(ServiceUpdate.service_id == svc.id).order_by(ServiceUpdate.publicado_en.desc()).limit(50)
    )
    files = await db.scalars(select(Deliverable).where(Deliverable.service_id == svc.id).order_by(Deliverable.publicado_en.desc()))
    out = await _card(db, svc) | {
        "descripcion": svc.descripcion,
        "avances": [UpdateOut.model_validate(u, from_attributes=True) for u in updates],
        "entregables": [DeliverableOut.model_validate(f, from_attributes=True) for f in files],
    }
    await db.commit()
    return out


@router.get("/entregables/{deliverable_id}/descarga")
async def download(deliverable_id: uuid.UUID, db: ClientesDB, auth: Current) -> dict:
    d = await db.scalar(select(Deliverable).where(Deliverable.id == deliverable_id))
    if d is None:
        raise ApiError(404, "NO_ENCONTRADO", "Entregable no encontrado.")
    service.audit(db, "descarga", "ok", user_id=auth.user.id, email=auth.user.email)
    await db.commit()
    return {"url": storage.presign_get(d.storage_key, expires=300, filename=d.titulo), "expira_en_s": 300}
