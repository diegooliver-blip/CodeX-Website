"""Tables of the dedicated client-portal database (migrations: alembic_clientes/).

Identity (clients, users, sessions, one-time tokens, auth audit) plus the replica of what Master Control
publishes (services, updates, deliverables) and the uptime history. Portal-data tables carry `client_id`
and are protected by row-level security.
"""

import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Identity, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import CITEXT, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.clientes.db import ClientesBase

STAGES = ("diagnostico", "diseno", "desarrollo", "pruebas", "entrega", "operacion")


def _id() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def _now() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now())


class Client(ClientesBase):
    __tablename__ = "clients"
    id: Mapped[uuid.UUID] = _id()
    mc_client_id: Mapped[str] = mapped_column(String(80), unique=True)
    nombre: Mapped[str] = mapped_column(String(200))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    es_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(BigInteger, default=0)
    creado_en: Mapped[datetime] = _now()


class ClientUser(ClientesBase):
    __tablename__ = "client_users"
    id: Mapped[uuid.UUID] = _id()
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(CITEXT, unique=True)
    nombre: Mapped[str] = mapped_column(String(200), default="")
    password_hash: Mapped[str | None] = mapped_column(String(200), nullable=True)
    estado: Mapped[str] = mapped_column(String(20), default="invitado")  # invitado | activo | desactivado
    intentos_fallidos: Mapped[int] = mapped_column(Integer, default=0)
    bloqueado_hasta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ultimo_acceso: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    contrasena_cambiada_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    creado_en: Mapped[datetime] = _now()


class ClientSession(ClientesBase):
    __tablename__ = "client_sessions"
    id: Mapped[uuid.UUID] = _id()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("client_users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    creado_en: Mapped[datetime] = _now()
    ultimo_uso_en: Mapped[datetime] = _now()
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revocado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ip_hash: Mapped[str] = mapped_column(String(64), default="")
    user_agent: Mapped[str] = mapped_column(String(200), default="")


class AuthToken(ClientesBase):
    """One-time invitation / password-reset tokens. Only the sha256 is stored."""

    __tablename__ = "auth_tokens"
    id: Mapped[uuid.UUID] = _id()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("client_users.id", ondelete="CASCADE"), index=True)
    tipo: Mapped[str] = mapped_column(String(20))  # invitacion | restablecer
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    usado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    creado_en: Mapped[datetime] = _now()


class AuthAudit(ClientesBase):
    """Append-only security log (trigger rejects UPDATE/DELETE). Emails and IPs are stored hashed."""

    __tablename__ = "auth_audit"
    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    email_hash: Mapped[str] = mapped_column(String(64), default="")
    evento: Mapped[str] = mapped_column(String(40))
    resultado: Mapped[str] = mapped_column(String(40))
    ip_hash: Mapped[str] = mapped_column(String(64), default="")
    trace_id: Mapped[str] = mapped_column(String(64), default="")
    creado_en: Mapped[datetime] = _now()


# ---------- replica of Master Control (row-level security by client_id) ----------
class Service(ClientesBase):
    __tablename__ = "services"
    id: Mapped[uuid.UUID] = _id()
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    mc_service_id: Mapped[str] = mapped_column(String(80), unique=True)
    nombre: Mapped[str] = mapped_column(String(200))
    servicio_slug: Mapped[str] = mapped_column(String(80), default="")
    descripcion: Mapped[str] = mapped_column(Text, default="")
    etapa: Mapped[str] = mapped_column(String(20), default="diagnostico")
    avance: Mapped[int] = mapped_column(Integer, default=0)
    fecha_estimada: Mapped[date | None] = mapped_column(Date, nullable=True)
    monitor_url: Mapped[str] = mapped_column(String(500), default="")
    version: Mapped[int] = mapped_column(BigInteger, default=0)
    eliminado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ServiceUpdate(ClientesBase):
    __tablename__ = "service_updates"
    id: Mapped[uuid.UUID] = _id()
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    service_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("services.id", ondelete="CASCADE"), index=True)
    mc_update_id: Mapped[str] = mapped_column(String(80), unique=True)
    titulo: Mapped[str] = mapped_column(String(200))
    cuerpo: Mapped[str] = mapped_column(Text, default="")
    publicado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Deliverable(ClientesBase):
    __tablename__ = "deliverables"
    id: Mapped[uuid.UUID] = _id()
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    service_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("services.id", ondelete="CASCADE"), index=True)
    mc_deliverable_id: Mapped[str] = mapped_column(String(80), unique=True)
    titulo: Mapped[str] = mapped_column(String(200))
    storage_key: Mapped[str] = mapped_column(String(500))
    tipo_contenido: Mapped[str] = mapped_column(String(120), default="application/octet-stream")
    tamano_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    publicado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class UptimeCheck(ClientesBase):
    __tablename__ = "uptime_checks"
    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    service_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("services.id", ondelete="CASCADE"), index=True)
    revisado_en: Mapped[datetime] = _now()
    ok: Mapped[bool] = mapped_column(Boolean)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latencia_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)


class SyncInbox(ClientesBase):
    """Every Master Control event id seen once; a replayed id is acknowledged without re-applying."""

    __tablename__ = "sync_inbox"
    event_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    tipo: Mapped[str] = mapped_column(String(60))
    resultado: Mapped[str] = mapped_column(String(40))
    recibido_en: Mapped[datetime] = _now()
