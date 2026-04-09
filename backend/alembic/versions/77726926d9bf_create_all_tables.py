"""create_all_tables

Revision ID: 77726926d9bf
Revises:
Create Date: 2026-04-09 21:28:43.427469

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = '77726926d9bf'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("student_id", sa.String(20), unique=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), server_default="student"),
        sa.Column("programme", sa.String(255)),
        sa.Column("password_hash", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # --- fee_items ---
    op.create_table(
        "fee_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("description", sa.String(255)),
        sa.Column("amount_due", sa.Numeric(10, 2), nullable=False),
        sa.Column("due_date", sa.Date),
        sa.Column("category", sa.String(50)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # --- payments ---
    op.create_table(
        "payments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fee_item_id", UUID(as_uuid=True), sa.ForeignKey("fee_items.id", ondelete="SET NULL")),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("payment_date", sa.Date, nullable=False),
        sa.Column("payment_method", sa.String(50)),
        sa.Column("reference", sa.String(255)),
        sa.Column("notes", sa.Text),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("receipt_url", sa.Text),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("reviewed_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
    )

    # --- payment_reviews ---
    op.create_table(
        "payment_reviews",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("payment_id", UUID(as_uuid=True), sa.ForeignKey("payments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("admin_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("action", sa.String(20)),
        sa.Column("note", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # --- notifications ---
    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message", sa.Text),
        sa.Column("is_read", sa.Boolean, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("payment_reviews")
    op.drop_table("payments")
    op.drop_table("fee_items")
    op.drop_table("users")
