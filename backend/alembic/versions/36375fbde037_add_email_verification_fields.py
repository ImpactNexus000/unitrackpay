"""add_email_verification_fields

Revision ID: 36375fbde037
Revises: a676c47ab416
Create Date: 2026-04-11 09:27:50.215743

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '36375fbde037'
down_revision: Union[str, None] = 'a676c47ab416'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    op.add_column('users', sa.Column('verification_code', sa.String(length=6), nullable=True))
    op.add_column('users', sa.Column('verification_code_expires_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'verification_code_expires_at')
    op.drop_column('users', 'verification_code')
    op.drop_column('users', 'is_verified')
