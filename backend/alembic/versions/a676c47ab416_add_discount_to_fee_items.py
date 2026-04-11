"""add_discount_to_fee_items

Revision ID: a676c47ab416
Revises: 1406f148740b
Create Date: 2026-04-11 07:33:49.052797

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a676c47ab416'
down_revision: Union[str, None] = '1406f148740b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('fee_items', sa.Column('discount', sa.Numeric(precision=10, scale=2), nullable=True))


def downgrade() -> None:
    op.drop_column('fee_items', 'discount')
