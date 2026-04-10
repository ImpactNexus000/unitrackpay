import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


# --- Request schemas ---

class FeeItemCreate(BaseModel):
    user_id: uuid.UUID
    description: str | None = None
    amount_due: Decimal
    due_date: date | None = None
    category: str | None = None  # tuition | accommodation | lab | library | other


# --- Response schemas ---

class FeeItemOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    description: str | None
    amount_due: Decimal
    due_date: date | None
    category: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Balance response ---

class BalanceOut(BaseModel):
    total_owed: float
    total_confirmed: float
    total_pending: float
    remaining: float
    progress_pct: float
