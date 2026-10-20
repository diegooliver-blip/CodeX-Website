"""Append-only admin audit trail. Call `record` inside the same transaction as the change it describes."""

import uuid
from datetime import date, datetime

from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AdminAudit, User
from app.observability import trace_id_var

# Never copied into the audit trail.
_SECRET_COLUMNS = {"password_hash", "embedding", "tsv"}


def snapshot(obj) -> dict:
    """Column values of an ORM object as JSON-safe data."""
    out = {}
    for attr in inspect(obj).mapper.column_attrs:
        if attr.key in _SECRET_COLUMNS:
            continue
        value = getattr(obj, attr.key)
        out[attr.key] = str(value) if isinstance(value, uuid.UUID | datetime | date) else value
    return out


def record(
    session: AsyncSession,
    actor: User,
    accion: str,
    entidad: str,
    entidad_id: object = "",
    *,
    antes: dict | None = None,
    despues: dict | None = None,
) -> None:
    session.add(
        AdminAudit(
            actor_id=actor.id,
            actor_email=actor.email,
            accion=accion,
            entidad=entidad,
            entidad_id=str(entidad_id),
            antes=antes,
            despues=despues,
            trace_id=trace_id_var.get(),
        )
    )
