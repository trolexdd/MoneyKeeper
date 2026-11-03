import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings

_password_hash = PasswordHash.recommended()
_dummy_password_hash = _password_hash.hash("not-a-real-user-password")


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _password_hash.verify(password, password_hash)


def verify_unknown_user_password(password: str) -> None:
    _password_hash.verify(password, _dummy_password_hash)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def _signing_key() -> str:
    key = get_settings().app_secret_key
    if len(key) < 32 or key.startswith("replace-with-"):
        raise RuntimeError(
            "APP_SECRET_KEY must be set to a unique random value of at least 32 characters."
        )
    return key


def create_access_token(user_id: UUID, session_id: UUID) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "sid": str(session_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_minutes),
    }
    return jwt.encode(payload, _signing_key(), algorithm="HS256")


def decode_access_token(token: str) -> dict[str, object]:
    return jwt.decode(token, _signing_key(), algorithms=["HS256"])
