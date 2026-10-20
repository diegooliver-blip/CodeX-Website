"""platform base: idempotency keys, outbox, worker heartbeats, immutable admin audit

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-20
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "idempotency_keys",
        sa.Column("clave", sa.String(200), primary_key=True),
        sa.Column("alcance", sa.String(60), primary_key=True),
        sa.Column("huella", sa.String(64), nullable=False),
        sa.Column("status", sa.Integer(), nullable=True),
        sa.Column("respuesta", postgresql.JSONB(), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_idempotency_keys_creado_en", "idempotency_keys", ["creado_en"])

    op.create_table(
        "outbox_events",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("tipo", sa.String(60), nullable=False),
        sa.Column("entidad", sa.String(60), nullable=False),
        sa.Column("entidad_id", sa.String(80), nullable=False),
        sa.Column("datos", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("ocurrido_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("siguiente_intento_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("procesado_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dlq_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("intentos", sa.Integer(), server_default="0", nullable=False),
        sa.Column("ultimo_error", sa.Text(), nullable=True),
    )
    # Only the pending queue is scanned, so the index covers just those rows.
    op.execute(
        "CREATE INDEX ix_outbox_pendientes ON outbox_events (siguiente_intento_en, id) "
        "WHERE procesado_en IS NULL AND dlq_en IS NULL"
    )

    op.create_table(
        "worker_heartbeats",
        sa.Column("trabajo", sa.String(60), primary_key=True),
        sa.Column("ultima_ejecucion", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resultado", sa.String(20), nullable=False),
        sa.Column("duracion_ms", sa.Integer(), server_default="0", nullable=False),
        sa.Column("detalle", sa.Text(), server_default="", nullable=False),
    )

    op.create_table(
        "admin_audit",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("actor_id", sa.UUID(), nullable=True),
        sa.Column("actor_email", sa.String(320), server_default="", nullable=False),
        sa.Column("accion", sa.String(60), nullable=False),
        sa.Column("entidad", sa.String(60), nullable=False),
        sa.Column("entidad_id", sa.String(80), server_default="", nullable=False),
        sa.Column("antes", postgresql.JSONB(), nullable=True),
        sa.Column("despues", postgresql.JSONB(), nullable=True),
        sa.Column("trace_id", sa.String(64), server_default="", nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_admin_audit_entidad", "admin_audit", ["entidad", "entidad_id"])

    op.execute("CREATE SCHEMA IF NOT EXISTS app")
    op.execute(
        """
        CREATE FUNCTION app.impedir_modificacion() RETURNS trigger
        LANGUAGE plpgsql SET search_path = '' AS $$
        BEGIN
          RAISE EXCEPTION 'Tabla % inmutable: solo inserciones', TG_TABLE_NAME USING ERRCODE = 'P0001';
        END $$
        """
    )
    op.execute(
        "CREATE TRIGGER admin_audit_inmutable BEFORE UPDATE OR DELETE ON admin_audit "
        "FOR EACH ROW EXECUTE FUNCTION app.impedir_modificacion()"
    )
    # TRUNCATE skips row triggers, so block it with a statement trigger too.
    op.execute(
        "CREATE TRIGGER admin_audit_sin_truncate BEFORE TRUNCATE ON admin_audit "
        "FOR EACH STATEMENT EXECUTE FUNCTION app.impedir_modificacion()"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS admin_audit")
    op.execute("DROP FUNCTION IF EXISTS app.impedir_modificacion()")
    op.drop_table("worker_heartbeats")
    op.drop_table("outbox_events")
    op.drop_table("idempotency_keys")
