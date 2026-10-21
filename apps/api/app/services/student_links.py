"""One-time student links (password reset, email verification), emailed by the worker through Loops.

The raw token exists only in the email; the database keeps its sha256, and each token works once.
"""

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.errors import ApiError
from app.models import StudentToken, User
from app.services import outbox
from app.services.outbox import Skip

RESTABLECER, VERIFICAR = "restablecer", "verificar"
TTL = {RESTABLECER: timedelta(hours=1), VERIFICAR: timedelta(days=7)}
PATH = {RESTABLECER: "/academia/restablecer", VERIFICAR: "/academia/verificar"}

EMAIL_RESTABLECER, EMAIL_VERIFICAR = "alumno_restablecer", "alumno_verificar"
EMAIL_TYPE = {RESTABLECER: EMAIL_RESTABLECER, VERIFICAR: EMAIL_VERIFICAR}
SECRET_TYPES = frozenset(EMAIL_TYPE.values())  # payloads carry the link: erased once delivered


def digest(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


async def issue(session: AsyncSession, user: User, tipo: str) -> None:
    """New link of this kind for the user (older unused ones stop working) plus its email, in the caller's transaction."""
    now = datetime.now(UTC)
    await session.execute(
        update(StudentToken)
        .where(StudentToken.user_id == user.id, StudentToken.tipo == tipo, StudentToken.usado_en.is_(None))
        .values(usado_en=now)
    )
    raw = secrets.token_urlsafe(32)
    session.add(StudentToken(id=uuid.uuid4(), user_id=user.id, tipo=tipo, token_hash=digest(raw), expira_en=now + TTL[tipo]))
    link = f"{get_settings().portal_url.rstrip('/')}{PATH[tipo]}?token={raw}"
    outbox.enqueue(session, EMAIL_TYPE[tipo], "alumno", str(user.id), {
        "email": user.email,
        "variables": {"nombre": user.name.split(" ")[0], "enlace": link},
    })


async def consume(session: AsyncSession, raw: str, tipo: str) -> User:
    """Mark a valid token used and return its student; expired, used or unknown tokens all get the same answer."""
    row = await session.scalar(
        select(StudentToken).where(StudentToken.token_hash == digest(raw), StudentToken.tipo == tipo).with_for_update()
    )
    now = datetime.now(UTC)
    if row is None or row.usado_en is not None or row.expira_en <= now:
        raise ApiError(400, "ENLACE_INVALIDO", "El enlace venció o ya se usó. Pide uno nuevo.")
    row.usado_en = now
    user = await session.get(User, row.user_id)
    if user is None:
        raise ApiError(400, "ENLACE_INVALIDO", "El enlace venció o ya se usó. Pide uno nuevo.")
    return user


async def deliver(event) -> None:
    """Outbox handler: Loops transactional email. No key or template = skipped (never faked as sent)."""
    s = get_settings()
    template = {EMAIL_RESTABLECER: s.loops_tx_alumno_restablecer, EMAIL_VERIFICAR: s.loops_tx_alumno_verificar}[event.tipo]
    if not s.loops_api_key or not template:
        raise Skip(f"Loops transaccional sin configurar para {event.tipo}")
    d = event.datos
    async with httpx.AsyncClient(timeout=httpx.Timeout(8.0, connect=4.0)) as client:
        res = await client.post(
            "https://app.loops.so/api/v1/transactional",
            json={"transactionalId": template, "email": d["email"], "dataVariables": d.get("variables", {})},
            headers={"Authorization": f"Bearer {s.loops_api_key}", "Idempotency-Key": f"codex-outbox-{event.id}"},
        )
    if res.status_code >= 400:
        raise RuntimeError(f"Loops transaccional -> {res.status_code} {res.text[:200]}")
