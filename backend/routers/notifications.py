import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.notification import Notification
from backend.models.user import User

router = APIRouter()


class MarkReadRequest(BaseModel):
    ids: list[uuid.UUID]


@router.get("/")
def list_notifications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.is_read.asc(), Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": str(n.id),
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifs
    ]


@router.patch("/read")
def mark_read(
    payload: MarkReadRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.id.in_(payload.ids),
        Notification.user_id == user.id,
    ).update({"is_read": True}, synchronize_session="fetch")
    db.commit()
    return {"marked": len(payload.ids)}
