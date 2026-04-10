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
    # Stores all platform users: students and admins.
    # student_id is optional (admins may not have one).
    # role defaults to "student"; admins are assigned the "admin" role.
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("student_id", sa.String(20), unique=True),           # optional; unique per student
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), server_default="student"),    # "student" | "admin"
        sa.Column("programme", sa.String(255)),                        # academic programme (students only)
        sa.Column("password_hash", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # --- fee_items ---
    # Represents individual fees assigned to a student (e.g. tuition, hostel, lab).
    # Each fee item belongs to one user and tracks the amount owed and due date.
    op.create_table(
        "fee_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("description", sa.String(255)),                      # human-readable label for the fee
        sa.Column("amount_due", sa.Numeric(10, 2), nullable=False),   # total amount owed
        sa.Column("due_date", sa.Date),                                # optional payment deadline
        sa.Column("category", sa.String(50)),                          # e.g. "tuition", "hostel", "lab"
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # --- payments ---
    # Records a payment submission by a student against a fee item.
    # fee_item_id is nullable — a payment can be submitted without linking to a specific fee.
    # reviewed_by references the admin who approved or rejected the payment.
    # status lifecycle: pending → approved | rejected
    op.create_table(
        "payments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fee_item_id", UUID(as_uuid=True), sa.ForeignKey("fee_items.id", ondelete="SET NULL")),  # nullable; SET NULL if fee removed
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("payment_date", sa.Date, nullable=False),            # date payment was made by student
        sa.Column("payment_method", sa.String(50)),                    # e.g. "bank_transfer", "mobile_money"
        sa.Column("reference", sa.String(255)),                        # bank/payment reference number
        sa.Column("notes", sa.Text),                                   # optional student notes
        sa.Column("status", sa.String(20), server_default="pending"),  # "pending" | "approved" | "rejected"
        sa.Column("receipt_url", sa.Text),                             # URL to uploaded receipt file
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),          # set when admin reviews the payment
        sa.Column("reviewed_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),  # admin who reviewed
    )

    # --- payment_reviews ---
    # Audit log of admin actions on payments (approve/reject).
    # Allows multiple review events per payment (e.g. reject then re-approve after resubmission).
    op.create_table(
        "payment_reviews",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("payment_id", UUID(as_uuid=True), sa.ForeignKey("payments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("admin_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),  # SET NULL if admin deleted
        sa.Column("action", sa.String(20)),                            # "approved" | "rejected"
        sa.Column("note", sa.Text),                                    # optional admin comment/reason
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # --- notifications ---
    # In-app notifications sent to users (e.g. payment approved, fee due soon).
    # is_read tracks whether the user has seen the notification.
    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message", sa.Text),
        sa.Column("is_read", sa.Boolean, server_default=sa.text("false")),  # false until user opens notification
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )


def downgrade() -> None:
    # Drop tables in reverse dependency order to respect foreign key constraints.
    op.drop_table("notifications")
    op.drop_table("payment_reviews")
    op.drop_table("payments")
    op.drop_table("fee_items")
    op.drop_table("users")
