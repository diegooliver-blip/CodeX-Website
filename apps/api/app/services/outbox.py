"""Transactional outbox: `enqueue` inside the business transaction, `process_batch` from the worker.

Delivery is at-least-once: handlers must be idempotent (we pass the event id as the idempotency key).
Retries back off exponentially with jitter; after MAX_ATTEMPTS the event moves to the dead-letter queue.
"""

import random
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models import OutboxEvent
from app.observability import log

MAX_ATTEMPTS = 8
BASE_DELAY_S = 30
MAX_DELAY_S = 3600


class Skip(Exception):
    """Raised by a handler when the event can't apply (e.g. integration not configured): processed, not retried."""


Handler = Callable[[OutboxEvent], Awaitable[None]]


def enqueue(session: AsyncSession, tipo: str, entidad: str, entidad_id: str, datos: dict) -> OutboxEvent:
    event = OutboxEvent(tipo=tipo, entidad=entidad, entidad_id=entidad_id, datos=datos)
    session.add(event)
    return event


def backoff(attempt: int, rng: random.Random | None = None) -> timedelta:
    """30 s, 60 s, 120 s ... capped at 1 h, each with ±25 % jitter so retries don't stampede."""
    base = min(BASE_DELAY_S * 2 ** (attempt - 1), MAX_DELAY_S)
    jitter = (rng or random).uniform(0.75, 1.25)
    return timedelta(seconds=base * jitter)


async def process_batch(
    sessions: async_sessionmaker[AsyncSession],
    handlers: dict[str, Handler],
    *,
    limit: int = 20,
    now: Callable[[], datetime] = lambda: datetime.now(UTC),
) -> dict[str, int]:
    """Deliver up to `limit` due events, one transaction per event (row locked with SKIP LOCKED)."""
    stats = {"ok": 0, "reintento": 0, "dlq": 0, "omitido": 0}
    for _ in range(limit):
        async with sessions() as session, session.begin():
            event = await session.scalar(
                select(OutboxEvent)
                .where(
                    OutboxEvent.procesado_en.is_(None),
                    OutboxEvent.dlq_en.is_(None),
                    OutboxEvent.siguiente_intento_en <= now(),
                )
                .order_by(OutboxEvent.id)
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            if event is None:
                break
            handler = handlers.get(event.tipo)
            event.intentos += 1
            try:
                if handler is None:
                    raise Skip(f"sin manejador para {event.tipo}")
                await handler(event)
                event.procesado_en, event.ultimo_error = now(), None
                stats["ok"] += 1
            except Skip as exc:
                event.procesado_en, event.ultimo_error = now(), f"omitido: {exc}"
                stats["omitido"] += 1
            except Exception as exc:  # any delivery failure is retried, never lost
                event.ultimo_error = f"{type(exc).__name__}: {exc}"[:2000]
                if event.intentos >= MAX_ATTEMPTS:
                    event.dlq_en = now()
                    stats["dlq"] += 1
                    log.error("outbox_dlq", evento=event.id, tipo=event.tipo, intentos=event.intentos)
                else:
                    event.siguiente_intento_en = now() + backoff(event.intentos)
                    stats["reintento"] += 1
                    log.warning("outbox_reintento", evento=event.id, tipo=event.tipo, intentos=event.intentos)
    return stats


async def queue_stats(session: AsyncSession) -> dict[str, int]:
    pending = await session.scalar(
        select(func.count()).where(OutboxEvent.procesado_en.is_(None), OutboxEvent.dlq_en.is_(None))
    )
    dlq = await session.scalar(select(func.count()).where(OutboxEvent.dlq_en.is_not(None), OutboxEvent.procesado_en.is_(None)))
    return {"pendientes": pending or 0, "dlq": dlq or 0}
