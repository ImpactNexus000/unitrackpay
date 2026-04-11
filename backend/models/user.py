import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[str | None] = mapped_column(String(20), unique=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="student")
    programme: Mapped[str | None] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_code: Mapped[str | None] = mapped_column(String(6))
    verification_code_expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc)
    )

    fee_items = relationship("FeeItem", back_populates="user", cascade="all, delete-orphan")
    payments = relationship(
        "Payment",
        back_populates="user",
        foreign_keys="Payment.user_id",
        cascade="all, delete-orphan",
    )
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
