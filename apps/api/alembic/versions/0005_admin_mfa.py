"""staff MFA: TOTP secret and activation timestamp on users

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-21
"""

import sqlalchemy as sa

from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("totp_secret", sa.String(64), nullable=True))
    op.add_column("users", sa.Column("totp_activado_en", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("totp_ultimo_paso", sa.BigInteger(), nullable=True))  # last accepted step: no replays


def downgrade() -> None:
    op.drop_column("users", "totp_ultimo_paso")
    op.drop_column("users", "totp_activado_en")
    op.drop_column("users", "totp_secret")
