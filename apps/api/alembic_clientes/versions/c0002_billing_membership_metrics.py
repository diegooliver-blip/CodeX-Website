"""client portal v5: charges, payments, CODEX+ membership, service metrics, service settings, interest requests

Revision ID: c0002
Revises: c0001
Create Date: 2026-11-01
"""

import sqlalchemy as sa

from alembic import op

revision = "c0002"
down_revision = "c0001"
branch_labels = None
depends_on = None

NOW = sa.text("now()")
RLS_TABLES = ("charges", "client_payments", "memberships", "service_metrics", "service_settings", "interest_requests")


def _uuid_pk() -> sa.Column:
    return sa.Column("id", sa.UUID(), primary_key=True)


def _client_fk(**kw) -> sa.Column:
    return sa.Column("client_id", sa.UUID(), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, **kw)


def upgrade() -> None:
    op.create_table(
        "charges",
        _uuid_pk(),
        _client_fk(index=True),
        sa.Column("service_id", sa.UUID(), sa.ForeignKey("services.id", ondelete="SET NULL"), nullable=True),
        sa.Column("mc_charge_id", sa.String(80), nullable=False, unique=True),
        sa.Column("concepto", sa.String(200), nullable=False),
        sa.Column("monto_centavos", sa.BigInteger(), nullable=False),
        sa.Column("moneda", sa.String(3), server_default="MXN", nullable=False),
        sa.Column("emitido_en", sa.Date(), nullable=False),
        sa.Column("vence_en", sa.Date(), nullable=True),
        sa.Column("estado", sa.String(20), server_default="pendiente", nullable=False),
        sa.Column("pagado_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("factura_key", sa.String(500), server_default="", nullable=False),
        sa.Column("version", sa.BigInteger(), server_default="0", nullable=False),
        sa.CheckConstraint("monto_centavos > 0", name="ck_charges_monto_positivo"),
        sa.CheckConstraint("estado IN ('pendiente','pagado','anulado')", name="ck_charges_estado"),
    )
    op.create_table(
        "memberships",
        _uuid_pk(),
        _client_fk(unique=True),
        sa.Column("plan", sa.String(40), server_default="codex_plus", nullable=False),
        sa.Column("monto_centavos", sa.BigInteger(), nullable=False),
        sa.Column("moneda", sa.String(3), server_default="MXN", nullable=False),
        sa.Column("estado", sa.String(20), server_default="pendiente", nullable=False),
        sa.Column("proveedor", sa.String(20), server_default="", nullable=False),
        sa.Column("proveedor_ref", sa.String(120), server_default="", nullable=False),
        sa.Column("activa_desde", sa.DateTime(timezone=True), nullable=True),
        sa.Column("proximo_cobro", sa.Date(), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.CheckConstraint("estado IN ('pendiente','activa','pausada','cancelada')", name="ck_memberships_estado"),
    )
    op.create_table(
        "client_payments",
        _uuid_pk(),
        _client_fk(index=True),
        sa.Column("charge_id", sa.UUID(), sa.ForeignKey("charges.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("membership_id", sa.UUID(), sa.ForeignKey("memberships.id", ondelete="SET NULL"), nullable=True),
        sa.Column("proveedor", sa.String(20), nullable=False),
        sa.Column("referencia", sa.String(120), nullable=True, unique=True),
        sa.Column("monto_centavos", sa.BigInteger(), nullable=False),
        sa.Column("moneda", sa.String(3), server_default="MXN", nullable=False),
        sa.Column("estado", sa.String(20), server_default="pendiente", nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
    )
    op.create_table(
        "service_metrics",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        _client_fk(),
        sa.Column("service_id", sa.UUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False),
        sa.Column("clave", sa.String(40), nullable=False),
        sa.Column("etiqueta", sa.String(80), server_default="", nullable=False),
        sa.Column("dia", sa.Date(), nullable=False),
        sa.Column("valor", sa.Float(), nullable=False),
        sa.UniqueConstraint("service_id", "clave", "dia", name="uq_service_metrics_dia"),
    )
    op.create_table(
        "service_settings",
        sa.Column("service_id", sa.UUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
        _client_fk(index=True),
        sa.Column("avisos_avance", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("avisos_caida", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("contacto_tecnico", sa.String(200), server_default="", nullable=False),
        sa.Column("ventana_mantenimiento", sa.String(20), server_default="domingo_noche", nullable=False),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
    )
    op.create_table(
        "interest_requests",
        _uuid_pk(),
        _client_fk(index=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("client_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
    )

    # Same policy as c0001: a client session sees only its rows; the sync and payment webhooks run as 'sync'.
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
    for table in ("interest_requests", "service_settings", "service_metrics", "client_payments", "memberships", "charges"):
        op.drop_table(table)
