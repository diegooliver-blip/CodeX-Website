"""Apply Master Control events to the portal replica. Pure upserts keyed by Master Control ids; stale versions are ignored."""

from datetime import UTC, date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clientes import service as identity
from app.clientes.models import STAGES, Client, ClientUser, Deliverable, Service, ServiceUpdate
from app.errors import ApiError

DELIVERABLE_PREFIX = "entregables/"


# ---------- payloads ----------
class ClientIn(BaseModel):
    mc_client_id: str = Field(min_length=1, max_length=80)
    nombre: str = Field(min_length=1, max_length=200)
    activo: bool = True
    es_demo: bool = False


class InviteIn(BaseModel):
    mc_client_id: str
    email: EmailStr
    nombre: str = Field(default="", max_length=200)


class DisableUserIn(BaseModel):
    email: EmailStr


class ServiceIn(BaseModel):
    mc_service_id: str = Field(min_length=1, max_length=80)
    mc_client_id: str
    nombre: str = Field(min_length=1, max_length=200)
    servicio_slug: str = Field(default="", max_length=80)
    descripcion: str = Field(default="", max_length=4000)
    etapa: Literal[STAGES] = "diagnostico"  # type: ignore[valid-type]
    avance: int = Field(default=0, ge=0, le=100)
    fecha_estimada: date | None = None
    monitor_url: str = Field(default="", max_length=500, pattern=r"^(https://\S+)?$")


class ServiceRef(BaseModel):
    mc_service_id: str


class UpdateIn(BaseModel):
    mc_update_id: str = Field(min_length=1, max_length=80)
    mc_service_id: str
    titulo: str = Field(min_length=1, max_length=200)
    cuerpo: str = Field(default="", max_length=8000)
    publicado_en: datetime


class UpdateRef(BaseModel):
    mc_update_id: str


class DeliverableIn(BaseModel):
    mc_deliverable_id: str = Field(min_length=1, max_length=80)
    mc_service_id: str
    titulo: str = Field(min_length=1, max_length=200)
    storage_key: str = Field(max_length=500)
    tipo_contenido: str = Field(default="application/octet-stream", max_length=120)
    tamano_bytes: int = Field(default=0, ge=0)
    publicado_en: datetime


class DeliverableRef(BaseModel):
    mc_deliverable_id: str


# ---------- helpers ----------
async def _client(db: AsyncSession, mc_client_id: str) -> Client:
    c = await db.scalar(select(Client).where(Client.mc_client_id == mc_client_id))
    if c is None:
        raise ApiError(422, "CLIENTE_DESCONOCIDO", f"No existe el cliente {mc_client_id}; envía client.upserted primero.")
    return c


async def _service(db: AsyncSession, mc_service_id: str) -> Service:
    s = await db.scalar(select(Service).where(Service.mc_service_id == mc_service_id))
    if s is None:
        raise ApiError(422, "SERVICIO_DESCONOCIDO", f"No existe el servicio {mc_service_id}; envía service.upserted primero.")
    return s


def _is_stale(row, version: int) -> bool:
    return row is not None and row.version >= version


# ---------- handlers: (db, datos, version) -> result dict ----------
async def client_upserted(db, datos: dict, version: int) -> dict:
    p = ClientIn.model_validate(datos)
    row = await db.scalar(select(Client).where(Client.mc_client_id == p.mc_client_id).with_for_update())
    if _is_stale(row, version):
        return {"resultado": "version_antigua"}
    if row is None:
        row = Client(mc_client_id=p.mc_client_id)
        db.add(row)
    row.nombre, row.activo, row.es_demo, row.version = p.nombre, p.activo, p.es_demo, version
    if not p.activo and row.id:
        for user in await db.scalars(select(ClientUser).where(ClientUser.client_id == row.id)):
            await identity.revoke_sessions(db, user.id)
    return {"resultado": "aplicado"}


async def user_invited(db, datos: dict, version: int) -> dict:
    p = InviteIn.model_validate(datos)
    client = await _client(db, p.mc_client_id)
    email = p.email.lower()
    user = await db.scalar(select(ClientUser).where(ClientUser.email == email).with_for_update())
    if user is not None and user.client_id != client.id:
        raise ApiError(409, "CORREO_DE_OTRO_CLIENTE", "Ese correo ya pertenece a otro cliente.")
    if user is None:
        user = ClientUser(client_id=client.id, email=email, nombre=p.nombre)
        db.add(user)
        await db.flush()
    elif user.estado == "desactivado":
        user.estado = "invitado" if user.password_hash is None else "activo"
    if p.nombre:
        user.nombre = p.nombre
    tipo = "invitacion" if user.estado == "invitado" else "restablecer"
    link = await identity.issue_link(db, user, tipo)
    identity.audit(db, "invitacion", "enviada", user_id=user.id, email=email)
    # Returned to Master Control only (server-to-server) so the team can share it if the email is delayed.
    return {"resultado": "aplicado", "enlace": link, "tipo_enlace": tipo}


async def user_disabled(db, datos: dict, version: int) -> dict:
    p = DisableUserIn.model_validate(datos)
    user = await db.scalar(select(ClientUser).where(ClientUser.email == p.email.lower()).with_for_update())
    if user is None:
        return {"resultado": "sin_cambios"}
    user.estado = "desactivado"
    await identity.revoke_sessions(db, user.id)
    identity.audit(db, "desactivar", "ok", user_id=user.id, email=user.email)
    return {"resultado": "aplicado"}


async def service_upserted(db, datos: dict, version: int) -> dict:
    p = ServiceIn.model_validate(datos)
    client = await _client(db, p.mc_client_id)
    row = await db.scalar(select(Service).where(Service.mc_service_id == p.mc_service_id).with_for_update())
    if _is_stale(row, version):
        return {"resultado": "version_antigua"}
    if row is None:
        row = Service(mc_service_id=p.mc_service_id, client_id=client.id)
        db.add(row)
    elif row.client_id != client.id:
        raise ApiError(409, "SERVICIO_DE_OTRO_CLIENTE", "Ese servicio ya pertenece a otro cliente.")
    for field in ("nombre", "servicio_slug", "descripcion", "etapa", "avance", "fecha_estimada", "monitor_url"):
        setattr(row, field, getattr(p, field))
    row.version, row.eliminado_en = version, None
    return {"resultado": "aplicado"}


async def service_deleted(db, datos: dict, version: int) -> dict:
    p = ServiceRef.model_validate(datos)
    row = await db.scalar(select(Service).where(Service.mc_service_id == p.mc_service_id).with_for_update())
    if row is None or _is_stale(row, version):
        return {"resultado": "sin_cambios"}
    row.eliminado_en, row.version = datetime.now(UTC), version
    return {"resultado": "aplicado"}


async def update_published(db, datos: dict, version: int) -> dict:
    p = UpdateIn.model_validate(datos)
    svc = await _service(db, p.mc_service_id)
    row = await db.scalar(select(ServiceUpdate).where(ServiceUpdate.mc_update_id == p.mc_update_id))
    if row is None:
        row = ServiceUpdate(mc_update_id=p.mc_update_id, service_id=svc.id, client_id=svc.client_id)
        db.add(row)
    row.titulo, row.cuerpo, row.publicado_en = p.titulo, p.cuerpo, p.publicado_en
    return {"resultado": "aplicado"}


async def update_deleted(db, datos: dict, version: int) -> dict:
    p = UpdateRef.model_validate(datos)
    row = await db.scalar(select(ServiceUpdate).where(ServiceUpdate.mc_update_id == p.mc_update_id))
    if row is not None:
        await db.delete(row)
    return {"resultado": "aplicado" if row else "sin_cambios"}


async def deliverable_published(db, datos: dict, version: int) -> dict:
    p = DeliverableIn.model_validate(datos)
    svc = await _service(db, p.mc_service_id)
    client = await db.get(Client, svc.client_id)
    # Keys come from /v1/sync/deliverables/presign, which scopes them to the client's folder.
    if not p.storage_key.startswith(f"{DELIVERABLE_PREFIX}{client.mc_client_id}/"):
        raise ApiError(422, "LLAVE_INVALIDA", "El archivo no pertenece a la carpeta de este cliente.")
    row = await db.scalar(select(Deliverable).where(Deliverable.mc_deliverable_id == p.mc_deliverable_id))
    if row is None:
        row = Deliverable(mc_deliverable_id=p.mc_deliverable_id, service_id=svc.id, client_id=svc.client_id)
        db.add(row)
    for field in ("titulo", "storage_key", "tipo_contenido", "tamano_bytes", "publicado_en"):
        setattr(row, field, getattr(p, field))
    return {"resultado": "aplicado"}


async def deliverable_deleted(db, datos: dict, version: int) -> dict:
    p = DeliverableRef.model_validate(datos)
    row = await db.scalar(select(Deliverable).where(Deliverable.mc_deliverable_id == p.mc_deliverable_id))
    if row is not None:
        await db.delete(row)
    return {"resultado": "aplicado" if row else "sin_cambios"}


HANDLERS = {
    "client.upserted": client_upserted,
    "client_user.invited": user_invited,
    "client_user.disabled": user_disabled,
    "service.upserted": service_upserted,
    "service.deleted": service_deleted,
    "update.published": update_published,
    "update.deleted": update_deleted,
    "deliverable.published": deliverable_published,
    "deliverable.deleted": deliverable_deleted,
}
