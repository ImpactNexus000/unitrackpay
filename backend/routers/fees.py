from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import asc
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.fee_item import FeeItem
from backend.models.payment import Payment
from backend.models.user import User
from backend.schemas.fee_item import BalanceOut, FeeItemOut
from backend.services.balance import get_balance_by_category, get_student_balance

router = APIRouter()


class StudentFeeSetup(BaseModel):
    category: str  # tuition | accommodation | lab | library | other
    total_amount: Decimal
    discount: Decimal | None = None


@router.get("/fees", response_model=list[FeeItemOut])
def list_my_fees(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(FeeItem)
        .filter(FeeItem.user_id == user.id)
        .order_by(asc(FeeItem.due_date))
        .all()
    )


@router.post("/fees", response_model=FeeItemOut, status_code=status.HTTP_201_CREATED)
def create_my_fee(
    payload: StudentFeeSetup,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Let a student declare what they owe for a category (one per category)."""
    existing = (
        db.query(FeeItem)
        .filter(FeeItem.user_id == user.id, FeeItem.category == payload.category)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Fee already set for {payload.category}. Update it from settings.",
        )

    discount = payload.discount or Decimal("0")
    amount_due = payload.total_amount - discount

    if amount_due < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Discount cannot exceed total amount",
        )

    LABELS = {
        "tuition": "Tuition fees",
        "accommodation": "Accommodation fees",
        "lab": "Lab fees",
        "library": "Library fees",
        "other": "Other fees",
    }

    fee = FeeItem(
        user_id=user.id,
        description=LABELS.get(payload.category, payload.category.title() + " fees"),
        amount_due=amount_due,
        discount=discount if discount > 0 else None,
        category=payload.category,
    )
    db.add(fee)
    db.commit()
    db.refresh(fee)
    return fee


@router.get("/fees/balance", response_model=BalanceOut)
def get_my_balance(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_student_balance(user.id, db)


@router.get("/dashboard")
def get_dashboard(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    balance = get_student_balance(user.id, db)

    # Next due fee item (earliest upcoming due_date)
    next_fee = (
        db.query(FeeItem)
        .filter(FeeItem.user_id == user.id, FeeItem.due_date.isnot(None))
        .order_by(asc(FeeItem.due_date))
        .first()
    )

    # Recent payments (last 5)
    recent_payments = (
        db.query(Payment)
        .filter(Payment.user_id == user.id)
        .order_by(Payment.submitted_at.desc())
        .limit(5)
        .all()
    )

    balance_by_category = get_balance_by_category(user.id, db)

    return {
        "student": {
            "id": str(user.id),
            "student_id": user.student_id,
            "name": user.full_name,
            "programme": user.programme,
        },
        "balance": balance,
        "balance_by_category": balance_by_category,
        "next_due": {
            "description": next_fee.description,
            "amount": float(next_fee.amount_due),
            "due_date": str(next_fee.due_date),
        }
        if next_fee
        else None,
        "recent_payments": [
            {
                "id": str(p.id),
                "description": p.notes or p.payment_method or "Payment",
                "category": p.category,
                "amount": float(p.amount),
                "status": p.status,
                "submitted_at": p.submitted_at.isoformat(),
            }
            for p in recent_payments
        ],
    }
