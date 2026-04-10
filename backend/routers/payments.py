import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.payment import Payment
from backend.models.user import User
from backend.schemas.payment import PaymentCreate, PaymentListOut, PaymentOut
from backend.services.upload import upload_receipt, validate_file

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


def _enrich_payment(payment: Payment, db: Session) -> PaymentOut:
    """Add reviewer name to payment output."""
    data = PaymentOut.model_validate(payment)
    if payment.reviewed_by:
        reviewer = db.query(User).filter(User.id == payment.reviewed_by).first()
        data.reviewed_by_name = reviewer.full_name if reviewer else None
    return data


@router.get("/", response_model=PaymentListOut)
def list_payments(
    status_filter: str | None = Query(None, alias="status"),
    method: str | None = None,
    reference: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = db.query(Payment).filter(Payment.user_id == user.id)

    if status_filter:
        base = base.filter(Payment.status == status_filter)
    if method:
        base = base.filter(Payment.payment_method == method)
    if reference:
        base = base.filter(Payment.reference.ilike(f"%{reference}%"))

    total = base.count()

    total_confirmed = (
        db.query(func.sum(Payment.amount))
        .filter(Payment.user_id == user.id, Payment.status == "confirmed")
        .scalar()
    ) or 0

    payments = (
        base.order_by(Payment.submitted_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return PaymentListOut(
        items=[_enrich_payment(p, db) for p in payments],
        total=total,
        total_confirmed=total_confirmed,
    )


@router.patch("/{payment_id}/receipt", response_model=PaymentOut)
async def upload_payment_receipt(
    payment_id: uuid.UUID,
    file: UploadFile,
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

    file_bytes = await file.read()

    error = validate_file(file_bytes, file.content_type)
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)

    url = upload_receipt(file_bytes, user.id, payment_id)
    payment.receipt_url = url
    db.commit()
    db.refresh(payment)
    return _enrich_payment(payment, db)


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
    return _enrich_payment(payment, db)
