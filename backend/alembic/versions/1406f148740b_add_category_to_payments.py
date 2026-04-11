"""add_category_to_payments

Revision ID: 1406f148740b
Revises: 77726926d9bf
Create Date: 2026-04-11 07:21:34.992858

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '1406f148740b'
down_revision: Union[str, None] = '77726926d9bf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('payments', sa.Column('category', sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('payments', 'category')
