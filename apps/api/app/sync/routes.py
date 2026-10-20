"""`/v1/sync/*`: called directly by VS Master Control (not through the web BFF), authenticated by HMAC signature."""

import json
from datetime import datetime

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.clientes.db import ClientesSession, scope_to_sync
from app.clientes.models import Client, Service, SyncInbox
from app.errors import ApiError
from app.observability import log
from app.services import storage
from app.sync import handlers
from app.sync.signature import verified_body

router = APIRouter(prefix="/v1/sync", tags=["sincronización Master Control"])

MAX_EVENTS = 200


class EventIn(BaseModel):
    event_id: str = Field(min_length=8, max_length=80)
    tipo: str
    version: int = Field(ge=0, default=0)
    ocurrido_en: datetime | None = None
    datos: dict


class Batch(BaseModel):
    events: list[EventIn] = Field(min_length=1, max_length=MAX_EVENTS)


def _parse(raw: bytes, model):
    try:
        return model.model_validate(json.loads(raw or b"{}"))
    except (ValueError, ValidationError) as exc:
        detalles = exc.errors(include_url=False) if isinstance(exc, ValidationError) else None
        raise ApiError(422, "VALIDACION", "El cuerpo del evento no es válido.", {"errores": detalles}) from exc


async def apply_event(event: EventIn) -> dict:
    """One transaction per event: the inbox row and its effects commit together, so a retry is always safe."""
    handler = handlers.HANDLERS.get(event.tipo)
    if handler is None:
        return {"event_id": event.event_id, "resultado": "tipo_desconocido"}
    async with ClientesSession() as db, db.begin():
        await scope_to_sync(db)
        fresh = await db.scalar(
            insert(SyncInbox)
            .values(event_id=event.event_id, tipo=event.tipo, resultado="procesando")
            .on_conflict_do_nothing()
            .returning(SyncInbox.event_id)
        )
        if fresh is None:
            return {"event_id": event.event_id, "resultado": "duplicado"}
        try:
            out = await handler(db, event.datos, event.version)
        except ValidationError as exc:
            raise ApiError(422, "VALIDACION", f"Datos inválidos en {event.tipo}.", {"errores": exc.errors(include_url=False)}) from exc
        row = await db.get(SyncInbox, event.event_id)
        row.resultado = out["resultado"]
    return {"event_id": event.event_id, **out}


@router.post("/events")
async def receive_events(request: Request) -> dict:
    batch = _parse(await verified_body(request), Batch)
    results = []
    for event in batch.events:  # in order: Master Control sends dependencies (client) before dependents (service)
        try:
            results.append(await apply_event(event))
        except ApiError as exc:
            results.append({"event_id": event.event_id, "resultado": "error", "codigo": exc.codigo, "mensaje": exc.detail})
            log.warning("sync_evento_rechazado", evento=event.event_id, tipo=event.tipo, codigo=exc.codigo)
    return {"resultados": results}


class PresignIn(BaseModel):
    mc_client_id: str
    filename: str = Field(min_length=1, max_length=200)
    content_type: str = Field(min_length=1, max_length=120)


@router.post("/deliverables/presign")
async def presign_deliverable(request: Request) -> dict:
    p = _parse(await verified_body(request), PresignIn)
    async with ClientesSession() as db:
        if await db.scalar(select(Client.id).where(Client.mc_client_id == p.mc_client_id)) is None:
            raise ApiError(422, "CLIENTE_DESCONOCIDO", "No existe ese cliente.")
    key = storage.new_key(f"{handlers.DELIVERABLE_PREFIX}{p.mc_client_id}", p.filename)
    return {"storage_key": key, "upload_url": storage.presign_put(key, p.content_type, expires=900)}


class Snapshot(BaseModel):
    clients: list[dict] = Field(default_factory=list)
    services: list[dict] = Field(default_factory=list)
    version: int = Field(ge=0)


@router.post("/snapshot")
async def reconcile(request: Request) -> dict:
    """Nightly full state from Master Control. Services missing from it are retired, but only when the snapshot
    is at least half the size of what we hold (a truncated read must never wipe a client's portal)."""
    snap = _parse(await verified_body(request), Snapshot)
    applied = 0
    # Each entry may carry its own entity version; otherwise the snapshot version applies.
    for i, c in enumerate(snap.clients):
        v = int(c.pop("version", snap.version))
        await apply_event(EventIn(event_id=f"snap-{snap.version}-c-{i}", tipo="client.upserted", version=v, datos=c))
        applied += 1
    for i, s in enumerate(snap.services):
        v = int(s.pop("version", snap.version))
        await apply_event(EventIn(event_id=f"snap-{snap.version}-s-{i}", tipo="service.upserted", version=v, datos=s))
        applied += 1

    present = {s.get("mc_service_id") for s in snap.services}
    async with ClientesSession() as db, db.begin():
        await scope_to_sync(db)
        active = list(await db.scalars(select(Service).where(Service.eliminado_en.is_(None))))
        missing = [s for s in active if s.mc_service_id not in present]
        retired = 0
        if active and len(present) < 0.5 * len(active):
            log.warning("snapshot_incompleto", recibidos=len(present), activos=len(active))
        else:
            for s in missing:
                if s.version < snap.version:
                    s.eliminado_en = datetime.now(s.actualizado_en.tzinfo)
                    retired += 1
    return {"aplicados": applied, "retirados": retired, "omitio_bajas": bool(active and len(present) < 0.5 * len(active))}
