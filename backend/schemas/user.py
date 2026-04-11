import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


# --- Request schemas ---

class UserRegister(BaseModel):
    student_id: str
    email: EmailStr
    full_name: str
    password: str
    programme: str | None = None

    @field_validator("email")
    @classmethod
    def email_must_be_herts(cls, v: str) -> str:
        if not v.lower().endswith("@herts.ac.uk"):
            raise ValueError("Only University of Hertfordshire emails (@herts.ac.uk) are allowed")
        return v.lower()


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
