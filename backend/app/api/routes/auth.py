from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.schemas import (
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserRead,
)
from app.auth.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
    verify_unknown_user_password,
)
from app.core.config import get_settings
from app.db.session import get_db
from app.models import User, UserSession

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _issue_tokens(db: Session, user: User) -> TokenResponse:
    settings = get_settings()
    refresh_token = generate_refresh_token()
    user_session = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_refresh_token(refresh_token),
        expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_days),
    )
    db.add(user_session)
    db.flush()

    access_token = create_access_token(user.id, user_session.id)
    db.commit()
    db.refresh(user)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.access_token_minutes * 60,
        user=user,
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a user",
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    existing_user = db.scalar(select(User).where(User.email == payload.email))
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(email=payload.email, password_hash=hash_password(payload.password))
    db.add(user)
    try:
        db.flush()
        response = _issue_tokens(db, user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from None
    return response


@router.post("/login", response_model=TokenResponse, summary="Log in")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        verify_unknown_user_password(payload.password)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
        )

    if not verify_password(payload.password, user.password_hash) or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
        )

    return _issue_tokens(db, user)


@router.post("/refresh", response_model=TokenResponse, summary="Rotate refresh token")
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    now = datetime.now(UTC)
    user_session = db.scalar(
        select(UserSession)
        .where(UserSession.refresh_token_hash == hash_refresh_token(payload.refresh_token))
        .with_for_update()
    )
    if (
        user_session is None
        or user_session.revoked_at is not None
        or user_session.expires_at <= now
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or expired.",
        )

    user = db.get(User, user_session.user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or expired.",
        )

    settings = get_settings()
    new_refresh_token = generate_refresh_token()
    user_session.refresh_token_hash = hash_refresh_token(new_refresh_token)
    user_session.expires_at = now + timedelta(days=settings.refresh_token_days)
    db.commit()

    return TokenResponse(
        access_token=create_access_token(user.id, user_session.id),
        refresh_token=new_refresh_token,
        expires_in=settings.access_token_minutes * 60,
        user=user,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Revoke a session")
def logout(payload: LogoutRequest, db: Session = Depends(get_db)) -> None:
    user_session = db.scalar(
        select(UserSession).where(
            UserSession.refresh_token_hash == hash_refresh_token(payload.refresh_token)
        )
    )
    if user_session is not None and user_session.revoked_at is None:
        user_session.revoked_at = datetime.now(UTC)
        db.commit()


@router.get("/me", response_model=UserRead, summary="Get current user")
def get_me(user: User = Depends(get_current_user)) -> User:
    return user
