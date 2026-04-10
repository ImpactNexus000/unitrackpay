import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


# --- Request schemas ---

class UserRegister(BaseModel):
    student_id: str
    email: EmailStr
    full_name: str
    password: str
    programme: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenRefresh(BaseModel):
    refresh_token: str


# --- Response schemas ---

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: uuid.UUID
    student_id: str | None
    email: str
    full_name: str
    role: str
    programme: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
