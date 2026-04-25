import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from backend.database import get_db
from backend.dependencies import require_admin
from backend.models.fee_item import FeeItem
from backend.models.payment import Payment
from backend.models.review import PaymentReview
from backend.models.user import User
from backend.schemas.fee_item import FeeItemCreate, FeeItemOut
from backend.services.balance import get_student_balance
from backend.services.notify import (
    notify_fee_added,
    notify_payment_confirmed,
    notify_payment_rejected,
)

router = APIRouter()


# --- Review schemas ---


class ReviewAction(BaseModel):
    action: str  # "confirmed" | "rejected"
    note: str | None = None


# --- Review queue ---


@router.get("/queue")
def get_review_queue(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Pending payments with student info
    pending_query = (
        db.query(Payment)
        .options(joinedload(Payment.user))
        .filter(Payment.status == "pending")
        .order_by(Payment.submitted_at.asc())
    )

    total_pending = pending_query.count()
    pending = pending_query.offset((page - 1) * limit).limit(limit).all()

    # Metrics
    today = date.today()
    confirmed_today = (
        db.query(func.count(Payment.id))
        .filter(
            Payment.status == "confirmed",
            func.date(Payment.reviewed_at) == today,
        )
        .scalar()
    ) or 0

    first_of_month = today.replace(day=1)
    total_this_month = (
        db.query(func.sum(Payment.amount))
        .filter(
            Payment.status == "confirmed",
            Payment.reviewed_at >= datetime(
                first_of_month.year, first_of_month.month, first_of_month.day,
                tzinfo=timezone.utc,
            ),
        )
        .scalar()
    ) or 0

    # Recent activity (last 10 reviewed payments)
    recent_activity = (
        db.query(Payment)
        .options(joinedload(Payment.user))
        .filter(Payment.status.in_(["confirmed", "rejected"]))
        .order_by(Payment.reviewed_at.desc())
        .limit(10)
        .all()
    )

    return {
        "metrics": {
            "pending": total_pending,
            "confirmed_today": confirmed_today,
            "total_this_month": float(total_this_month),
        },
        "pending_submissions": [
            {
                "id": str(p.id),
                "student_name": p.user.full_name,
                "student_id": p.user.student_id,
                "amount": float(p.amount),
                "payment_method": p.payment_method,
                "reference": p.reference,
                "notes": p.notes,
                "receipt_url": p.receipt_url,
                "submitted_at": p.submitted_at.isoformat(),
                "payment_date": str(p.payment_date),
            }
            for p in pending
        ],
        "recent_activity": [
            {
                "id": str(p.id),
                "student_name": p.user.full_name,
                "payment_method": p.payment_method,
                "amount": float(p.amount),
                "status": p.status,
                "reviewed_at": p.reviewed_at.isoformat() if p.reviewed_at else None,
            }
            for p in recent_activity
        ],
    }


# --- Confirm / Reject ---


@router.patch("/payments/{payment_id}")
def review_payment(
    payment_id: uuid.UUID,
    payload: ReviewAction,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if payload.action not in ("confirmed", "rejected"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action must be 'confirmed' or 'rejected'",
        )

    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    if payment.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment already {payment.status}",
        )

    # Update payment status
    payment.status = payload.action
    payment.reviewed_at = datetime.now(timezone.utc)
    payment.reviewed_by = admin.id

    # Create audit trail entry
    review = PaymentReview(
        payment_id=payment.id,
        admin_id=admin.id,
        action=payload.action,
        note=payload.note,
    )
    db.add(review)

    # Send email + in-app notification to the student
    student = db.query(User).filter(User.id == payment.user_id).first()
    if student:
        if payload.action == "confirmed":
            notify_payment_confirmed(db, student, float(payment.amount))
        else:
            notify_payment_rejected(db, student, float(payment.amount), payload.note)

    db.commit()

    return {"message": f"Payment {payload.action}", "payment_id": str(payment_id)}


@router.delete("/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_payment(
    payment_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )
    db.delete(payment)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Reports ---


@router.get("/reports")
def get_reports(
    month: str | None = Query(None, description="YYYY-MM format"),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    today = date.today()
    if month:
        try:
            year, m = month.split("-")
            start = date(int(year), int(m), 1)
        except (ValueError, IndexError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Month must be in YYYY-MM format",
            )
    else:
        start = today.replace(day=1)

    # Next month start
    if start.month == 12:
        end = date(start.year + 1, 1, 1)
    else:
        end = date(start.year, start.month + 1, 1)

    start_dt = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)
    end_dt = datetime(end.year, end.month, end.day, tzinfo=timezone.utc)

    # Totals by payment method
    by_method = (
        db.query(
            Payment.payment_method,
            func.count(Payment.id).label("count"),
            func.sum(Payment.amount).label("total"),
        )
        .filter(
            Payment.status == "confirmed",
            Payment.reviewed_at >= start_dt,
            Payment.reviewed_at < end_dt,
        )
        .group_by(Payment.payment_method)
        .all()
    )

    # Overall totals for the month
    total_confirmed = (
        db.query(func.sum(Payment.amount))
        .filter(
            Payment.status == "confirmed",
            Payment.reviewed_at >= start_dt,
            Payment.reviewed_at < end_dt,
        )
        .scalar()
    ) or 0

    total_rejected = (
        db.query(func.count(Payment.id))
        .filter(
            Payment.status == "rejected",
            Payment.reviewed_at >= start_dt,
            Payment.reviewed_at < end_dt,
        )
        .scalar()
    ) or 0

    total_pending = (
        db.query(func.count(Payment.id))
        .filter(Payment.status == "pending")
        .scalar()
    ) or 0

    return {
        "month": start.strftime("%Y-%m"),
        "total_confirmed": float(total_confirmed),
        "total_rejected_count": total_rejected,
        "total_pending_count": total_pending,
        "by_method": [
            {
                "method": row.payment_method or "unknown",
                "count": row.count,
                "total": float(row.total),
            }
            for row in by_method
        ],
    }


# --- Fee item CRUD (admin only) ---


@router.post("/fees", response_model=FeeItemOut, status_code=status.HTTP_201_CREATED)
def create_fee_item(
    payload: FeeItemCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    student = db.query(User).filter(User.id == payload.user_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    fee = FeeItem(
        user_id=payload.user_id,
        description=payload.description,
        amount_due=payload.amount_due,
        due_date=payload.due_date,
        category=payload.category,
    )
    db.add(fee)

    # Notify student about the new fee
    notify_fee_added(
        db, student, payload.description or payload.category or "Fee", float(payload.amount_due)
    )

    db.commit()
    db.refresh(fee)
    return fee


@router.delete("/fees/{fee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fee_item(
    fee_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    fee = db.query(FeeItem).filter(FeeItem.id == fee_id).first()
    if not fee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fee item not found",
        )
    db.delete(fee)
    db.commit()


# --- Student listing (admin only) ---


@router.get("/students")
def list_students(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    students = db.query(User).filter(User.role == "student").all()
    result = []
    for s in students:
        balance = get_student_balance(s.id, db)
        result.append(
            {
                "id": str(s.id),
                "student_id": s.student_id,
                "full_name": s.full_name,
                "email": s.email,
                "programme": s.programme,
                "balance": balance,
            }
        )
    return result


@router.get("/students/{student_id}")
def get_student_detail(
    student_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    balance = get_student_balance(student.id, db)
    fees = (
        db.query(FeeItem)
        .filter(FeeItem.user_id == student.id)
        .order_by(FeeItem.due_date.asc())
        .all()
    )

    payments = (
        db.query(Payment)
        .filter(Payment.user_id == student.id)
        .order_by(Payment.submitted_at.desc())
        .all()
    )

    return {
        "student": {
            "id": str(student.id),
            "student_id": student.student_id,
            "full_name": student.full_name,
            "email": student.email,
            "programme": student.programme,
            "created_at": student.created_at.isoformat(),
        },
        "balance": balance,
        "fees": [
            {
                "id": str(f.id),
                "description": f.description,
                "amount_due": float(f.amount_due),
                "due_date": str(f.due_date) if f.due_date else None,
                "category": f.category,
            }
            for f in fees
        ],
        "payments": [
            {
                "id": str(p.id),
                "amount": float(p.amount),
                "payment_date": str(p.payment_date),
                "payment_method": p.payment_method,
                "reference": p.reference,
                "status": p.status,
                "submitted_at": p.submitted_at.isoformat(),
            }
            for p in payments
        ],
    }
