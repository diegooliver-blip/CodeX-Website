"""client portal: identity, one-time tokens, sessions, auth audit, Master Control replica with RLS

Revision ID: c0001
Revises:
Create Date: 2026-10-20
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "c0001"
down_revision = None
branch_labels = None
depends_on = None

NOW = sa.text("now()")
RLS_TABLES = ("services", "service_updates", "deliverables", "uptime_checks")


def _uuid_pk() -> sa.Column:
    return sa.Column("id", sa.UUID(), primary_key=True)


def _client_fk() -> sa.Column:
    return sa.Column("client_id", sa.UUID(), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")

    op.create_table(
        "clients",
        _uuid_pk(),
        sa.Column("mc_client_id", sa.String(80), nullable=False, unique=True),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("es_demo", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("version", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
    )
    op.create_table(
        "client_users",
        _uuid_pk(),
        _client_fk(),
        sa.Column("email", postgresql.CITEXT(), nullable=False, unique=True),
        sa.Column("nombre", sa.String(200), server_default="", nullable=False),
        sa.Column("password_hash", sa.String(200), nullable=True),
        sa.Column("estado", sa.String(20), server_default="invitado", nullable=False),
        sa.Column("intentos_fallidos", sa.Integer(), server_default="0", nullable=False),
        sa.Column("bloqueado_hasta", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ultimo_acceso", sa.DateTime(timezone=True), nullable=True),
        sa.Column("contrasena_cambiada_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.CheckConstraint("estado IN ('invitado', 'activo', 'desactivado')", name="ck_client_users_estado"),
    )
    op.create_table(
        "client_sessions",
        _uuid_pk(),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("client_users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("ultimo_uso_en", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("expira_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revocado_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_hash", sa.String(64), server_default="", nullable=False),
        sa.Column("user_agent", sa.String(200), server_default="", nullable=False),
    )
    op.create_table(
        "auth_tokens",
        _uuid_pk(),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("client_users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expira_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("usado_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.CheckConstraint("tipo IN ('invitacion', 'restablecer')", name="ck_auth_tokens_tipo"),
    )
    op.create_table(
        "auth_audit",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("email_hash", sa.String(64), server_default="", nullable=False),
        sa.Column("evento", sa.String(40), nullable=False),
        sa.Column("resultado", sa.String(40), nullable=False),
        sa.Column("ip_hash", sa.String(64), server_default="", nullable=False),
        sa.Column("trace_id", sa.String(64), server_default="", nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
    )
    op.create_index("ix_auth_audit_user", "auth_audit", ["user_id", "creado_en"])

    op.create_table(
        "services",
        _uuid_pk(),
        _client_fk(),
        sa.Column("mc_service_id", sa.String(80), nullable=False, unique=True),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("servicio_slug", sa.String(80), server_default="", nullable=False),
        sa.Column("descripcion", sa.Text(), server_default="", nullable=False),
        sa.Column("etapa", sa.String(20), server_default="diagnostico", nullable=False),
        sa.Column("avance", sa.Integer(), server_default="0", nullable=False),
        sa.Column("fecha_estimada", sa.Date(), nullable=True),
        sa.Column("monitor_url", sa.String(500), server_default="", nullable=False),
        sa.Column("version", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("eliminado_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.CheckConstraint("avance BETWEEN 0 AND 100", name="ck_services_avance"),
        sa.CheckConstraint(
            "etapa IN ('diagnostico', 'diseno', 'desarrollo', 'pruebas', 'entrega', 'operacion')", name="ck_services_etapa"
        ),
    )
    op.create_table(
        "service_updates",
        _uuid_pk(),
        _client_fk(),
        sa.Column("service_id", sa.UUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("mc_update_id", sa.String(80), nullable=False, unique=True),
        sa.Column("titulo", sa.String(200), nullable=False),
        sa.Column("cuerpo", sa.Text(), server_default="", nullable=False),
        sa.Column("publicado_en", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "deliverables",
        _uuid_pk(),
        _client_fk(),
        sa.Column("service_id", sa.UUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("mc_deliverable_id", sa.String(80), nullable=False, unique=True),
        sa.Column("titulo", sa.String(200), nullable=False),
        sa.Column("storage_key", sa.String(500), nullable=False),
        sa.Column("tipo_contenido", sa.String(120), server_default="application/octet-stream", nullable=False),
        sa.Column("tamano_bytes", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("publicado_en", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "uptime_checks",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        _client_fk(),
        sa.Column("service_id", sa.UUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False),
        sa.Column("revisado_en", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("ok", sa.Boolean(), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("latencia_ms", sa.Integer(), nullable=True),
    )
    op.create_index("ix_uptime_service_time", "uptime_checks", ["service_id", "revisado_en"])
    # Same shape as the site's outbox (app.services.outbox): emails here commit atomically with the token rows.
    op.create_table(
        "outbox_events",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("tipo", sa.String(60), nullable=False),
        sa.Column("entidad", sa.String(60), nullable=False),
        sa.Column("entidad_id", sa.String(80), nullable=False),
        sa.Column("datos", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("ocurrido_en", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("siguiente_intento_en", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("procesado_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dlq_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("intentos", sa.Integer(), server_default="0", nullable=False),
        sa.Column("ultimo_error", sa.Text(), nullable=True),
    )
    op.execute(
        "CREATE INDEX ix_outbox_pendientes ON outbox_events (siguiente_intento_en, id) "
        "WHERE procesado_en IS NULL AND dlq_en IS NULL"
    )
    op.create_table(
        "sync_inbox",
        sa.Column("event_id", sa.String(80), primary_key=True),
        sa.Column("tipo", sa.String(60), nullable=False),
        sa.Column("resultado", sa.String(40), nullable=False),
        sa.Column("recibido_en", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
    )

    # ---- immutable security log ----
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
        "CREATE TRIGGER auth_audit_inmutable BEFORE UPDATE OR DELETE ON auth_audit "
        "FOR EACH ROW EXECUTE FUNCTION app.impedir_modificacion()"
    )
    op.execute(
        "CREATE TRIGGER auth_audit_sin_truncate BEFORE TRUNCATE ON auth_audit "
        "FOR EACH STATEMENT EXECUTE FUNCTION app.impedir_modificacion()"
    )

    # ---- row-level security: a client session only ever sees its own rows ----
    # FORCE applies the policies to the table owner too (the app connects as the owner role).
    for table in RLS_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"""
            CREATE POLICY por_cliente ON {table}
            USING (
              client_id = nullif(current_setting('app.client_id', true), '')::uuid
              OR current_setting('app.contexto', true) = 'sync'
            )
            WITH CHECK (
              client_id = nullif(current_setting('app.client_id', true), '')::uuid
              OR current_setting('app.contexto', true) = 'sync'
            )
            """
        )


def downgrade() -> None:
    for table in ("outbox_events", "sync_inbox", "uptime_checks", "deliverables", "service_updates", "services"):
        op.drop_table(table)
    op.execute("DROP TABLE IF EXISTS auth_audit")
    op.execute("DROP FUNCTION IF EXISTS app.impedir_modificacion()")
    for table in ("auth_tokens", "client_sessions", "client_users", "clients"):
        op.drop_table(table)
