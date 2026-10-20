"""Identity flows of the client portal. Every function runs inside the caller's transaction (no commits here)."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.clientes import emails
from app.clientes.models import AuthAudit, AuthToken, Client, ClientSession, ClientUser
from app.clientes.security import (
    INVITE_TTL,
    LOCKOUT,
    MAX_FAILED_LOGINS,
    RESET_TTL,
    SESSION_ABSOLUTE,
    check_password_policy,
    hash_password,
    keyed_hash,
    needs_rehash,
    new_token,
    session_expired,
    token_digest,
    verify_password,
)
from app.config import get_settings
from app.errors import ApiError
from app.observability import trace_id_var
from app.services import outbox

LINK_PATH = {"invitacion": "/clientes/activar", "restablecer": "/clientes/restablecer"}
EMAIL_TYPE = {"invitacion": emails.INVITACION, "restablecer": emails.RESTABLECER}
TTL = {"invitacion": INVITE_TTL, "restablecer": RESET_TTL}


def _now() -> datetime:
    return datetime.now(UTC)


def audit(session: AsyncSession, evento: str, resultado: str, *, user_id=None, email: str = "", ip: str = "") -> None:
    session.add(
        AuthAudit(
            user_id=user_id,
            email_hash=keyed_hash(email),
            evento=evento,
            resultado=resultado,
            ip_hash=keyed_hash(ip),
            trace_id=trace_id_var.get(),
        )
    )


async def issue_link(session: AsyncSession, user: ClientUser, tipo: str) -> str:
    """Create a one-time token (invalidating older ones of the same kind), queue its email, return the link."""
    now = _now()
    await session.execute(
        update(AuthToken)
        .where(AuthToken.user_id == user.id, AuthToken.tipo == tipo, AuthToken.usado_en.is_(None))
        .values(usado_en=now)
    )
    raw, digest = new_token()
    session.add(AuthToken(user_id=user.id, tipo=tipo, token_hash=digest, expira_en=now + TTL[tipo]))
    link = f"{get_settings().portal_url.rstrip('/')}{LINK_PATH[tipo]}?token={raw}"
    outbox.enqueue(
        session,
        EMAIL_TYPE[tipo],
        "client_user",
        str(user.id),
        {"email": user.email, "variables": {"nombre": user.nombre or user.email, "enlace": link, "vigencia_horas": int(TTL[tipo].total_seconds() // 3600)}},
    )
    return link


async def consume_link(session: AsyncSession, raw: str, tipo: str) -> ClientUser:
    token = await session.scalar(
        select(AuthToken).where(AuthToken.token_hash == token_digest(raw), AuthToken.tipo == tipo).with_for_update()
    )
    if token is None or token.usado_en is not None or token.expira_en < _now():
        raise ApiError(400, "ENLACE_INVALIDO", "El enlace ya se usó o expiró. Pide uno nuevo.")
    user = await session.get(ClientUser, token.user_id, with_for_update=True)
    if user is None or user.estado == "desactivado":
        raise ApiError(400, "ENLACE_INVALIDO", "El enlace ya se usó o expiró. Pide uno nuevo.")
    token.usado_en = _now()
    return user


async def set_password(session: AsyncSession, user: ClientUser, password: str) -> None:
    check_password_policy(password, user.email)
    user.password_hash = hash_password(password)
    user.estado = "activo"
    user.intentos_fallidos, user.bloqueado_hasta = 0, None
    user.contrasena_cambiada_en = _now()
    await revoke_sessions(session, user.id)
    outbox.enqueue(
        session, emails.CONTRASENA_CAMBIADA, "client_user", str(user.id),
        {"email": user.email, "variables": {"nombre": user.nombre or user.email}},
    )


async def revoke_sessions(session: AsyncSession, user_id: uuid.UUID, *, except_id: uuid.UUID | None = None) -> None:
    stmt = update(ClientSession).where(ClientSession.user_id == user_id, ClientSession.revocado_en.is_(None))
    if except_id:
        stmt = stmt.where(ClientSession.id != except_id)
    await session.execute(stmt.values(revocado_en=_now()))


async def open_session(session: AsyncSession, user: ClientUser, *, ip: str, user_agent: str) -> tuple[str, datetime]:
    raw, digest = new_token()
    now = _now()
    session.add(
        ClientSession(
            user_id=user.id, token_hash=digest, expira_en=now + SESSION_ABSOLUTE,
            ip_hash=keyed_hash(ip), user_agent=user_agent[:200],
        )
    )
    user.ultimo_acceso = now
    return raw, now + SESSION_ABSOLUTE


async def login(session: AsyncSession, email: str, password: str, *, ip: str, user_agent: str) -> tuple[str, datetime, ClientUser]:
    user = await session.scalar(select(ClientUser).where(ClientUser.email == email).with_for_update())
    now = _now()
    generic = ApiError(401, "CREDENCIALES_INVALIDAS", "Correo o contraseña incorrectos.")
    if user is None:
        verify_password(password, None)  # same work as a real check, so timing doesn't reveal the account
        audit(session, "login", "usuario_inexistente", email=email, ip=ip)
        raise generic
    if user.bloqueado_hasta and user.bloqueado_hasta > now:
        audit(session, "login", "bloqueado", user_id=user.id, email=email, ip=ip)
        raise ApiError(423, "CUENTA_BLOQUEADA", "Demasiados intentos. Espera 15 minutos o restablece tu contraseña.")
    if user.estado != "activo" or not verify_password(password, user.password_hash):
        user.intentos_fallidos += 1
        if user.intentos_fallidos >= MAX_FAILED_LOGINS:
            user.bloqueado_hasta, user.intentos_fallidos = now + LOCKOUT, 0
        audit(session, "login", "fallido" if user.estado == "activo" else f"estado_{user.estado}", user_id=user.id, email=email, ip=ip)
        raise generic
    client = await session.get(Client, user.client_id)
    if client is None or not client.activo:
        audit(session, "login", "cliente_inactivo", user_id=user.id, email=email, ip=ip)
        raise generic
    user.intentos_fallidos, user.bloqueado_hasta = 0, None
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    raw, expires = await open_session(session, user, ip=ip, user_agent=user_agent)
    audit(session, "login", "ok", user_id=user.id, email=email, ip=ip)
    return raw, expires, user


async def request_reset(session: AsyncSession, email: str, *, ip: str) -> None:
    """Same outcome whether or not the account exists; only active/invited users actually get a link."""
    user = await session.scalar(select(ClientUser).where(ClientUser.email == email))
    if user is None or user.estado == "desactivado":
        audit(session, "olvide", "ignorado", email=email, ip=ip)
        return
    await issue_link(session, user, "restablecer" if user.estado == "activo" else "invitacion")
    audit(session, "olvide", "enviado", user_id=user.id, email=email, ip=ip)


async def resolve_session(session: AsyncSession, raw: str | None) -> tuple[ClientSession, ClientUser]:
    unauthenticated = ApiError(401, "NO_AUTENTICADO", "Tu sesión expiró. Vuelve a entrar.")
    if not raw:
        raise unauthenticated
    row = await session.scalar(select(ClientSession).where(ClientSession.token_hash == token_digest(raw)))
    now = _now()
    if row is None or row.revocado_en is not None or session_expired(row.creado_en, row.ultimo_uso_en, now):
        raise unauthenticated
    user = await session.get(ClientUser, row.user_id)
    if user is None or user.estado != "activo":
        raise unauthenticated
    if (now - row.ultimo_uso_en).total_seconds() > 300:  # sliding idle window, written at most every 5 min
        row.ultimo_uso_en = now
    return row, user
