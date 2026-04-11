import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


# --- Request schemas ---

class PaymentCreate(BaseModel):
    fee_item_id: uuid.UUID | None = None
    category: str | None = None  # tuition | accommodation | lab | library | other
    amount: Decimal
    payment_date: date
    payment_method: str | None = None  # bank_transfer | card | online_portal | cash
    reference: str | None = None
    notes: str | None = None


# --- Response schemas ---

class PaymentOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    fee_item_id: uuid.UUID | None
    category: str | None
    amount: Decimal
    payment_date: date
    payment_method: str | None
    reference: str | None
    notes: str | None
    status: str
    receipt_url: str | None
    submitted_at: datetime
    reviewed_at: datetime | None
    reviewed_by: uuid.UUID | None

    reviewed_by_name: str | None = None

    model_config = {"from_attributes": True}


class PaymentListOut(BaseModel):
    items: list[PaymentOut]
    total: int
    total_confirmed: Decimal
