from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.user import User
from backend.schemas.user import (
    TokenRefresh,
    TokenResponse,
    UserLogin,
    UserOut,
    UserRegister,
)
from backend.services.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter()


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
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
    )


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
