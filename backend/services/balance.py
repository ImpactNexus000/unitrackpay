import uuid
from collections import OrderedDict

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.models.fee_item import FeeItem
from backend.models.payment import Payment

CATEGORY_LABELS = {
    "tuition": "Tuition",
    "accommodation": "Accommodation",
    "lab": "Lab fees",
    "library": "Library",
    "other": "Other",
}


def _build_balance(total_owed: float, total_confirmed: float, total_pending: float) -> dict:
    return {
        "total_owed": total_owed,
        "total_confirmed": total_confirmed,
        "total_pending": total_pending,
        "remaining": total_owed - total_confirmed,
        "progress_pct": round((total_confirmed / total_owed) * 100, 1) if total_owed else 0,
    }


def get_student_balance(user_id: uuid.UUID, db: Session) -> dict:
    total_owed = float(
        db.query(func.sum(FeeItem.amount_due))
        .filter(FeeItem.user_id == user_id)
        .scalar() or 0
    )

    total_confirmed = float(
        db.query(func.sum(Payment.amount))
        .filter(Payment.user_id == user_id, Payment.status == "confirmed")
        .scalar() or 0
    )

    total_pending = float(
        db.query(func.sum(Payment.amount))
        .filter(Payment.user_id == user_id, Payment.status == "pending")
        .scalar() or 0
    )

    return _build_balance(total_owed, total_confirmed, total_pending)


def get_balance_by_category(user_id: uuid.UUID, db: Session) -> list[dict]:
    """Return balance breakdown per payment category.

    Tuition always appears first. Other categories appear only if the student
    has made at least one payment in that category.
    """
    # Fee items owed, grouped by category
    owed_rows = (
        db.query(
            FeeItem.category,
            func.sum(FeeItem.amount_due),
            func.sum(FeeItem.discount),
        )
        .filter(FeeItem.user_id == user_id)
        .group_by(FeeItem.category)
        .all()
    )
    owed_by_cat = {row[0]: float(row[1]) for row in owed_rows}
    discount_by_cat = {row[0]: float(row[2]) for row in owed_rows if row[2]}

    # Confirmed payments grouped by category
    confirmed_rows = (
        db.query(Payment.category, func.sum(Payment.amount))
        .filter(Payment.user_id == user_id, Payment.status == "confirmed")
        .group_by(Payment.category)
        .all()
    )
    confirmed_by_cat = {row[0]: float(row[1]) for row in confirmed_rows}

    # Pending payments grouped by category
    pending_rows = (
        db.query(Payment.category, func.sum(Payment.amount))
        .filter(Payment.user_id == user_id, Payment.status == "pending")
        .group_by(Payment.category)
        .all()
    )
    pending_by_cat = {row[0]: float(row[1]) for row in pending_rows}

    # Collect all categories that have either owed fees or payments
    all_cats = set(owed_by_cat.keys()) | set(confirmed_by_cat.keys()) | set(pending_by_cat.keys())
    # Remove None entries
    all_cats.discard(None)

    # Ensure tuition is always present
    all_cats.add("tuition")

    # Order: tuition first, then alphabetical
    ordered = ["tuition"] + sorted(c for c in all_cats if c != "tuition")

    result = []
    for cat in ordered:
        result.append({
            "category": cat,
            "label": CATEGORY_LABELS.get(cat, cat.title()),
            "discount": discount_by_cat.get(cat, 0.0),
            **_build_balance(
                owed_by_cat.get(cat, 0.0),
                confirmed_by_cat.get(cat, 0.0),
                pending_by_cat.get(cat, 0.0),
            ),
        })

    return result
