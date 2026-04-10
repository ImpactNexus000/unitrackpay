import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.models.fee_item import FeeItem
from backend.models.payment import Payment


def get_student_balance(user_id: uuid.UUID, db: Session) -> dict:
    total_owed = (
        db.query(func.sum(FeeItem.amount_due))
        .filter(FeeItem.user_id == user_id)
        .scalar()
    ) or 0

    total_confirmed = (
        db.query(func.sum(Payment.amount))
        .filter(Payment.user_id == user_id, Payment.status == "confirmed")
        .scalar()
    ) or 0

    total_pending = (
        db.query(func.sum(Payment.amount))
        .filter(Payment.user_id == user_id, Payment.status == "pending")
        .scalar()
    ) or 0

    return {
        "total_owed": float(total_owed),
        "total_confirmed": float(total_confirmed),
        "total_pending": float(total_pending),
        "remaining": float(total_owed - total_confirmed),
        "progress_pct": round((float(total_confirmed) / float(total_owed)) * 100, 1)
        if total_owed
        else 0,
    }
