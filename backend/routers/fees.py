from fastapi import APIRouter, Depends
from sqlalchemy import asc
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.fee_item import FeeItem
from backend.models.payment import Payment
from backend.models.user import User
from backend.schemas.fee_item import BalanceOut, FeeItemOut
from backend.services.balance import get_student_balance

router = APIRouter()


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

    return {
        "student": {
            "id": str(user.id),
            "student_id": user.student_id,
            "name": user.full_name,
            "programme": user.programme,
        },
        "balance": balance,
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
                "amount": float(p.amount),
                "status": p.status,
                "submitted_at": p.submitted_at.isoformat(),
            }
            for p in recent_payments
        ],
    }
