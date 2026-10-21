import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Identity, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.schema import Computed

from app.config import get_settings
from app.db import Base


def _id() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def _created() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = _id()
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20), default="editor")  # admin | editor | student
    email_verificado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    totp_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)
    totp_activado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    totp_ultimo_paso: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[datetime] = _created()


class Course(Base):
    __tablename__ = "courses"
    id: Mapped[uuid.UUID] = _id()
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    subtitle: Mapped[str] = mapped_column(String(300), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(80), default="IA aplicada")
    level: Mapped[str] = mapped_column(String(40), default="Intermedio")
    cover_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    price_mxn: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft | published
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    modules: Mapped[list["Module"]] = relationship(
        back_populates="course", cascade="all, delete-orphan", order_by="Module.position"
    )


class Module(Base):
    __tablename__ = "modules"
    id: Mapped[uuid.UUID] = _id()
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    position: Mapped[int] = mapped_column(Integer, default=0)
    course: Mapped[Course] = relationship(back_populates="modules")
    lessons: Mapped[list["Lesson"]] = relationship(
        back_populates="module", cascade="all, delete-orphan", order_by="Lesson.position"
    )


class Lesson(Base):
    __tablename__ = "lessons"
    id: Mapped[uuid.UUID] = _id()
    module_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"), index=True)
    slug: Mapped[str] = mapped_column(String(160))
    title: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(20), default="video")  # video | pdf | text
    body: Mapped[str] = mapped_column(Text, default="")
    asset_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    duration_min: Mapped[int] = mapped_column(Integer, default=0)
    is_free: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    module: Mapped[Module] = relationship(back_populates="lessons")


class Lead(Base):
    __tablename__ = "leads"
    id: Mapped[uuid.UUID] = _id()
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(320), index=True)
    company: Mapped[str] = mapped_column(String(200), default="")
    phone: Mapped[str] = mapped_column(String(40), default="")
    service: Mapped[str] = mapped_column(String(80), default="")
    message: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(String(40), default="contacto")  # contacto | academia | chat
    course_slug: Mapped[str] = mapped_column(String(160), default="")
    created_at: Mapped[datetime] = _created()


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[uuid.UUID] = _id()
    source: Mapped[str] = mapped_column(String(20))  # content | course | upload
    ref: Mapped[str] = mapped_column(String(300), index=True)
    title: Mapped[str] = mapped_column(String(300))
    url: Mapped[str] = mapped_column(String(500), default="")
    checksum: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = _created()
    chunks: Mapped[list["Chunk"]] = relationship(back_populates="document", cascade="all, delete-orphan")


class Chunk(Base):
    __tablename__ = "chunks"
    id: Mapped[uuid.UUID] = _id()
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(Vector(get_settings().embedding_dim))
    tsv: Mapped[str] = mapped_column(
        TSVECTOR, Computed("to_tsvector('spanish', content)", persisted=True)
    )
    document: Mapped[Document] = relationship(back_populates="chunks")


# ---------- platform: idempotency, outbox, worker, audit (migration 0002) ----------
class IdempotencyKey(Base):
    """One row per `Idempotency-Key`: the same key with the same body replays the stored response."""

    __tablename__ = "idempotency_keys"
    clave: Mapped[str] = mapped_column(String(200), primary_key=True)
    alcance: Mapped[str] = mapped_column(String(60), primary_key=True)  # endpoint, e.g. "leads"
    huella: Mapped[str] = mapped_column(String(64))  # sha256 of the request body
    status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    respuesta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OutboxEvent(Base):
    """Side effects (emails, CRM) are written here in the same transaction as the data, then delivered by the worker."""

    __tablename__ = "outbox_events"
    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    tipo: Mapped[str] = mapped_column(String(60))
    entidad: Mapped[str] = mapped_column(String(60))
    entidad_id: Mapped[str] = mapped_column(String(80))
    datos: Mapped[dict] = mapped_column(JSONB, default=dict)
    ocurrido_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    siguiente_intento_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    procesado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dlq_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    intentos: Mapped[int] = mapped_column(Integer, default=0)
    ultimo_error: Mapped[str | None] = mapped_column(Text, nullable=True)


class WorkerHeartbeat(Base):
    __tablename__ = "worker_heartbeats"
    trabajo: Mapped[str] = mapped_column(String(60), primary_key=True)
    ultima_ejecucion: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    resultado: Mapped[str] = mapped_column(String(20))  # ok | error | omitido
    duracion_ms: Mapped[int] = mapped_column(Integer, default=0)
    detalle: Mapped[str] = mapped_column(Text, default="")


class AdminAudit(Base):
    """Append-only log of admin actions; a trigger rejects UPDATE and DELETE."""

    __tablename__ = "admin_audit"
    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    actor_email: Mapped[str] = mapped_column(String(320), default="")
    accion: Mapped[str] = mapped_column(String(60))
    entidad: Mapped[str] = mapped_column(String(60))
    entidad_id: Mapped[str] = mapped_column(String(80), default="")
    antes: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    despues: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    trace_id: Mapped[str] = mapped_column(String(64), default="")
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ---------- payments and students (migration 0003) ----------
class Order(Base):
    """A student's purchase of one course. Amounts are integer cents; RLS limits students to their own rows."""

    __tablename__ = "orders"
    id: Mapped[uuid.UUID] = _id()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id", ondelete="RESTRICT"))
    monto_centavos: Mapped[int] = mapped_column(BigInteger)
    moneda: Mapped[str] = mapped_column(String(3), default="MXN")
    estado: Mapped[str] = mapped_column(String(20), default="pendiente")  # pendiente | pagada | fallida | reembolsada
    proveedor: Mapped[str] = mapped_column(String(20))
    referencia_externa: Mapped[str | None] = mapped_column(String(200), unique=True, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PaymentLedgerEntry(Base):
    """Append-only money movements; corrections are reverse entries, never an UPDATE (a trigger enforces it)."""

    __tablename__ = "payments_ledger"
    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    clave: Mapped[str] = mapped_column(String(120), unique=True)  # pago:<orden_id> | reembolso:<orden_id>
    orden_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="RESTRICT"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    tipo: Mapped[str] = mapped_column(String(20))  # cargo | reembolso
    monto_centavos: Mapped[int] = mapped_column(BigInteger)
    moneda: Mapped[str] = mapped_column(String(3))
    proveedor: Mapped[str] = mapped_column(String(20))
    referencia_externa: Mapped[str] = mapped_column(String(200))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Enrollment(Base):
    __tablename__ = "enrollments"
    id: Mapped[uuid.UUID] = _id()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    orden_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    otorgado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StudentToken(Base):
    """One-time link for a student (password reset or email verification). Only the sha256 is stored."""

    __tablename__ = "student_tokens"
    id: Mapped[uuid.UUID] = _id()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tipo: Mapped[str] = mapped_column(String(20))  # restablecer | verificar
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    usado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
