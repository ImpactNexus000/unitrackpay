"""Unified notification helper — sends both email + in-app notification."""

from sqlalchemy.orm import Session

from backend.models.notification import Notification
from backend.models.user import User
from backend.services.email import (
    send_fee_added,
    send_payment_confirmed,
    send_payment_rejected,
)


def _create_in_app(db: Session, user_id, message: str) -> None:
    notif = Notification(user_id=user_id, message=message)
    db.add(notif)


def notify_payment_confirmed(db: Session, student: User, amount: float) -> None:
    msg = f"Your payment of £{amount:.2f} has been confirmed."
    _create_in_app(db, student.id, msg)
    send_payment_confirmed(student.email, student.full_name, amount)


def notify_payment_rejected(
    db: Session, student: User, amount: float, note: str | None
) -> None:
    msg = f"Your payment of £{amount:.2f} has been rejected."
    if note:
        msg += f" Reason: {note}"
    _create_in_app(db, student.id, msg)
    send_payment_rejected(student.email, student.full_name, amount, note)


def notify_fee_added(
    db: Session, student: User, description: str, amount: float
) -> None:
    msg = f"A new fee has been added: {description} — £{amount:.2f}"
    _create_in_app(db, student.id, msg)
    send_fee_added(student.email, student.full_name, description, amount)
