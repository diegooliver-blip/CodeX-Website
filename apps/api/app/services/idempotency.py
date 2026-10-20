"""`Idempotency-Key` support: same key + same body = same response, and the effect happens once.

The key row is inserted first, inside the caller's transaction. A concurrent request with the same key
blocks on that insert until the first transaction commits, then reads its stored response.
"""

import hashlib
import json
from collections.abc import Awaitable, Callable

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import ApiError
from app.models import IdempotencyKey

MAX_KEY_LENGTH = 200


def body_fingerprint(payload: dict) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()


async def run_once(
    session: AsyncSession,
    *,
    scope: str,
    key: str | None,
    payload: dict,
    effect: Callable[[], Awaitable[tuple[int, dict]]],
) -> tuple[int, dict]:
    """Run `effect` (which must not commit) at most once per (scope, key). Commits on success."""
    if not key:
        status, body = await effect()
        await session.commit()
        return status, body
    if len(key) > MAX_KEY_LENGTH:
        raise ApiError(400, "IDEMPOTENCIA_INVALIDA", "La llave de idempotencia es demasiado larga.")

    fingerprint = body_fingerprint(payload)
    inserted = await session.scalar(
        insert(IdempotencyKey)
        .values(clave=key, alcance=scope, huella=fingerprint)
        .on_conflict_do_nothing()
        .returning(IdempotencyKey.clave)
    )
    if inserted is None:
        stored = (
            await session.execute(
                select(IdempotencyKey.huella, IdempotencyKey.status, IdempotencyKey.respuesta).where(
                    IdempotencyKey.clave == key, IdempotencyKey.alcance == scope
                )
            )
        ).first()
        await session.rollback()
        if stored is None or stored.huella != fingerprint:
            raise ApiError(409, "IDEMPOTENCIA_CONFLICTO", "Esta llave ya se usó con otros datos.")
        return stored.status or 200, stored.respuesta or {}

    status, body = await effect()
    row = await session.get(IdempotencyKey, (key, scope))
    row.status, row.respuesta = status, body
    await session.commit()
    return status, body
