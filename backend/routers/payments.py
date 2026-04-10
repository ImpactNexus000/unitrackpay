import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.payment import Payment
from backend.models.user import User
from backend.schemas.payment import PaymentCreate, PaymentOut

router = APIRouter()


@router.post("/", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment = Payment(
        user_id=user.id,
        fee_item_id=payload.fee_item_id,
        amount=payload.amount,
        payment_date=payload.payment_date,
        payment_method=payload.payment_method,
        reference=payload.reference,
        notes=payload.notes,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/", response_model=list[PaymentOut])
def list_payments(
    status_filter: str | None = Query(None, alias="status"),
    method: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Payment).filter(Payment.user_id == user.id)

    if status_filter:
        query = query.filter(Payment.status == status_filter)
    if method:
        query = query.filter(Payment.payment_method == method)

    query = query.order_by(Payment.submitted_at.desc())
    payments = query.offset((page - 1) * limit).limit(limit).all()
    return payments


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment = (
        db.query(Payment)
        .filter(Payment.id == payment_id, Payment.user_id == user.id)
        .first()
    )
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )
    return payment
