import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.user import User
from backend.schemas.user import (
    ResendCode,
    TokenRefresh,
    TokenResponse,
    UserLogin,
    UserOut,
    UserRegister,
    VerifyEmail,
)
from backend.services.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from backend.services.email import send_verification_code

logger = logging.getLogger(__name__)

router = APIRouter()

VERIFY_CODE_EXPIRY_MINUTES = 10


def _generate_code() -> str:
    """Generate a 6-digit numeric verification code."""
    return f"{secrets.randbelow(1_000_000):06d}"


def _send_code(user: User, db: Session) -> None:
    """Generate, save, and email a verification code."""
    code = _generate_code()
    user.verification_code = code
    user.verification_code_expires_at = datetime.utcnow() + timedelta(
        minutes=VERIFY_CODE_EXPIRY_MINUTES
    )
    db.commit()
    send_verification_code(user.email, user.full_name, code)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    # Check for existing email
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Check for existing student ID
    if db.query(User).filter(User.student_id == payload.student_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Student ID already registered",
        )

    user = User(
        student_id=payload.student_id,
        email=payload.email,
        full_name=payload.full_name,
        programme=payload.programme,
        password_hash=hash_password(payload.password),
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Send verification code
    _send_code(user, db)

    return user


@router.post("/verify")
def verify_email(payload: VerifyEmail, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )

    if not user.verification_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code found. Request a new one.",
        )

    if (
        user.verification_code_expires_at
        and datetime.utcnow() > user.verification_code_expires_at
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Request a new one.",
        )

    if user.verification_code != payload.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    # Mark as verified (for first-time registration) and clear code
    user.is_verified = True
    user.verification_code = None
    user.verification_code_expires_at = None
    db.commit()

    # Return tokens so the user is logged in immediately
    return {
        "message": "Email verified successfully",
        "access_token": create_access_token(user.id, user.role),
        "refresh_token": create_refresh_token(user.id),
    }


@router.post("/resend-code")
def resend_verification_code(payload: ResendCode, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        # Don't reveal whether account exists
        return {"message": "If that email is registered, a new code has been sent."}

    if user.is_verified:
        return {"message": "Email already verified"}

    _send_code(user, db)

    return {"message": "If that email is registered, a new code has been sent."}


@router.post("/login")
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please check your inbox for the verification code.",
        )

    # Send OTP for login verification
    _send_code(user, db)

    return {"message": "Verification code sent", "requires_verification": True}


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: TokenRefresh, db: Session = Depends(get_db)):
    try:
        data = decode_token(payload.refresh_token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    if data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user = db.query(User).filter(User.id == data["sub"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(user: User = Depends(get_current_user)):
    # JWT is stateless — client discards the token.
    # A token blocklist can be added later if needed.
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user
