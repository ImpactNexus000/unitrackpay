import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import require_admin
from backend.models.fee_item import FeeItem
from backend.models.payment import Payment
from backend.models.user import User
from backend.schemas.fee_item import FeeItemCreate, FeeItemOut
from backend.services.balance import get_student_balance

router = APIRouter()


# --- Fee item CRUD (admin only) ---


@router.post("/fees", response_model=FeeItemOut, status_code=status.HTTP_201_CREATED)
def create_fee_item(
    payload: FeeItemCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Verify the target student exists
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
