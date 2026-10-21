"""students: one-time tokens (password reset, email verification) and verified-email timestamp

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-21
"""

import sqlalchemy as sa

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email_verificado_en", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "student_tokens",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),  # sha256; the raw token only travels by email
        sa.Column("expira_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("usado_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("tipo IN ('restablecer', 'verificar')", name="ck_student_tokens_tipo"),
    )
    op.create_index("ix_student_tokens_user_id", "student_tokens", ["user_id"])


def downgrade() -> None:
    op.drop_table("student_tokens")
    op.drop_column("users", "email_verificado_en")
