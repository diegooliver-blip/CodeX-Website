"""payments and students: orders, immutable payments ledger, enrollments, row-level security

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-21
"""

import sqlalchemy as sa

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

MONEY_TABLES = ("orders", "payments_ledger", "enrollments")
# Student reads run as this role (SET LOCAL ROLE), so RLS applies even when the API connects as a superuser.
STUDENT_ROLE = "codex_alumno"


def upgrade() -> None:
    op.create_table(
        "orders",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("course_id", sa.UUID(), sa.ForeignKey("courses.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("monto_centavos", sa.BigInteger(), nullable=False),
        sa.Column("moneda", sa.String(3), server_default="MXN", nullable=False),
        sa.Column("estado", sa.String(20), server_default="pendiente", nullable=False),
        sa.Column("proveedor", sa.String(20), nullable=False),
        sa.Column("referencia_externa", sa.String(200), nullable=True, unique=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("monto_centavos > 0", name="ck_orders_monto_positivo"),
        sa.CheckConstraint(
            "estado IN ('pendiente', 'pagada', 'fallida', 'reembolsada')", name="ck_orders_estado"
        ),
    )
    op.create_index("ix_orders_user_id", "orders", ["user_id"])

    op.create_table(
        "payments_ledger",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("clave", sa.String(120), nullable=False, unique=True),  # pago:<orden_id> | reembolso:<orden_id>
        sa.Column("orden_id", sa.UUID(), sa.ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("monto_centavos", sa.BigInteger(), nullable=False),  # negative for refunds
        sa.Column("moneda", sa.String(3), nullable=False),
        sa.Column("proveedor", sa.String(20), nullable=False),
        sa.Column("referencia_externa", sa.String(200), nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("tipo IN ('cargo', 'reembolso')", name="ck_ledger_tipo"),
    )
    op.create_index("ix_payments_ledger_orden_id", "payments_ledger", ["orden_id"])
    op.execute(
        "CREATE TRIGGER payments_ledger_inmutable BEFORE UPDATE OR DELETE ON payments_ledger "
        "FOR EACH ROW EXECUTE FUNCTION app.impedir_modificacion()"
    )
    op.execute(
        "CREATE TRIGGER payments_ledger_sin_truncate BEFORE TRUNCATE ON payments_ledger "
        "FOR EACH STATEMENT EXECUTE FUNCTION app.impedir_modificacion()"
    )

    op.create_table(
        "enrollments",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("course_id", sa.UUID(), sa.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("orden_id", sa.UUID(), sa.ForeignKey("orders.id", ondelete="SET NULL"), nullable=True),
        sa.Column("otorgado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "course_id", name="uq_enrollments_user_course"),
    )

    # RLS: a student sees only their own rows; the API's server-side paths say who they are with app.role.
    for table in MONEY_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"CREATE POLICY {table}_propias ON {table} USING ("
            "user_id = nullif(current_setting('app.user_id', true), '')::uuid "
            "OR current_setting('app.role', true) IN ('admin', 'sistema'))"
        )

    op.execute(
        f"""
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{STUDENT_ROLE}') THEN
            CREATE ROLE {STUDENT_ROLE} NOLOGIN NOBYPASSRLS;
          END IF;
        END $$
        """
    )
    # The connecting role must be a member to SET ROLE (superusers can anyway).
    op.execute(f"GRANT {STUDENT_ROLE} TO current_user")
    op.execute(f"GRANT USAGE ON SCHEMA public TO {STUDENT_ROLE}")
    op.execute(f"GRANT SELECT ON courses, modules, lessons, orders, enrollments, payments_ledger TO {STUDENT_ROLE}")


def downgrade() -> None:
    op.execute(f"REVOKE ALL ON courses, modules, lessons, orders, enrollments, payments_ledger FROM {STUDENT_ROLE}")
    op.execute(f"REVOKE USAGE ON SCHEMA public FROM {STUDENT_ROLE}")
    op.drop_table("enrollments")
    op.execute("DROP TABLE IF EXISTS payments_ledger")
    op.drop_table("orders")
