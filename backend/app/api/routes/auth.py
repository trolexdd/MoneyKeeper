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
    TelegramLinkRequest,
    TelegramLoginRequest,
    TokenResponse,
    UserRead,
)
from app.auth.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password_and_update,
    verify_unknown_user_password,
)
from app.auth.telegram import (
    TelegramIdentity,
    TelegramInitDataError,
    validate_telegram_init_data,
)
from app.core.config import get_settings
from app.db.session import get_db
from app.models import User, UserSession

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _validated_telegram_identity(init_data: str) -> TelegramIdentity:
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Вход через Telegram пока не настроен на сервере.",
        )
    try:
        return validate_telegram_init_data(
            init_data,
            settings.telegram_bot_token,
            settings.telegram_init_data_max_age_seconds,
        )
    except TelegramInitDataError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Данные Telegram недействительны или устарели. Перезапустите Mini App.",
        ) from None


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

    password_is_valid, upgraded_hash = verify_password_and_update(
        payload.password,
        user.password_hash,
    )
    if not password_is_valid or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
        )

    if upgraded_hash is not None:
        user.password_hash = upgraded_hash

    return _issue_tokens(db, user)


@router.post(
    "/telegram",
    response_model=TokenResponse,
    summary="Log in with a linked Telegram account",
)
def telegram_login(
    payload: TelegramLoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    identity = _validated_telegram_identity(payload.init_data)
    user = db.scalar(select(User).where(User.telegram_id == identity.user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Telegram ещё не привязан к MoneyKeeper. Привяжите существующий аккаунт.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Аккаунт MoneyKeeper недоступен.",
        )

    user.telegram_username = identity.username
    return _issue_tokens(db, user)


@router.post(
    "/telegram/link",
    response_model=TokenResponse,
    summary="Link Telegram to an existing MoneyKeeper account",
)
def link_telegram_account(
    payload: TelegramLinkRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    identity = _validated_telegram_identity(payload.init_data)
    user = db.scalar(select(User).where(User.email == payload.email))

    if user is None:
        verify_unknown_user_password(payload.password)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Почта или пароль указаны неверно.",
        )

    password_is_valid, upgraded_hash = verify_password_and_update(
        payload.password,
        user.password_hash,
    )
    if not password_is_valid or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Почта или пароль указаны неверно.",
        )

    telegram_owner = db.scalar(
        select(User).where(User.telegram_id == identity.user_id)
    )
    if telegram_owner is not None and telegram_owner.id != user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Этот аккаунт Telegram уже привязан к другому профилю MoneyKeeper.",
        )
    if user.telegram_id is not None and user.telegram_id != identity.user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="К этому профилю MoneyKeeper уже привязан другой аккаунт Telegram.",
        )

    user.telegram_id = identity.user_id
    user.telegram_username = identity.username
    if upgraded_hash is not None:
        user.password_hash = upgraded_hash

    try:
        return _issue_tokens(db, user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Не удалось привязать этот аккаунт Telegram.",
        ) from None


@router.post("/refresh", response_model=TokenResponse, summary="Rotate refresh token")
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    now = datetime.now(UTC)
    user_session = db.scalar(
        select(UserSession)
        .where(UserSession.refresh_token_hash == hash_refresh_token(payload.refresh_token))
        .with_for_update()
    )
    if user_session is None or user_session.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or expired.",
        )

    expires_at = user_session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at <= now:
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
