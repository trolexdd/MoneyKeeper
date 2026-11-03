import hashlib
import hmac
import json
import re
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl


class TelegramInitDataError(ValueError):
    """Raised when Telegram Mini App initData cannot be trusted."""


@dataclass(frozen=True, slots=True)
class TelegramIdentity:
    user_id: int
    username: str | None


def validate_telegram_init_data(
    init_data: str,
    bot_token: str,
    max_age_seconds: int = 3600,
) -> TelegramIdentity:
    if not bot_token:
        raise TelegramInitDataError("Telegram bot token is not configured.")
    if not init_data or len(init_data) > 8192:
        raise TelegramInitDataError("Telegram initData is missing or too large.")

    try:
        pairs = parse_qsl(
            init_data,
            keep_blank_values=True,
            strict_parsing=True,
            max_num_fields=100,
        )
    except ValueError:
        raise TelegramInitDataError("Telegram initData is malformed.") from None

    data: dict[str, str] = {}
    for key, value in pairs:
        if key in data:
            raise TelegramInitDataError("Telegram initData contains duplicate fields.")
        data[key] = value

    received_hash = data.pop("hash", None)
    if received_hash is None or re.fullmatch(r"[0-9a-fA-F]{64}", received_hash) is None:
        raise TelegramInitDataError("Telegram initData hash is missing or malformed.")

    data_check_string = "\n".join(
        f"{key}={value}" for key, value in sorted(data.items())
    )
    secret_key = hmac.new(
        b"WebAppData",
        bot_token.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash.lower()):
        raise TelegramInitDataError("Telegram initData signature is invalid.")

    try:
        auth_date = int(data["auth_date"])
    except (KeyError, ValueError):
        raise TelegramInitDataError("Telegram auth_date is missing or invalid.") from None

    now = int(time.time())
    if auth_date > now + 60 or now - auth_date > max_age_seconds:
        raise TelegramInitDataError("Telegram initData has expired.")

    try:
        user_data = json.loads(data["user"])
        telegram_user_id = user_data["id"]
    except (KeyError, TypeError, json.JSONDecodeError):
        raise TelegramInitDataError("Telegram user data is missing or invalid.") from None

    if (
        isinstance(telegram_user_id, bool)
        or not isinstance(telegram_user_id, int)
        or telegram_user_id <= 0
        or telegram_user_id > (2**52 - 1)
        or user_data.get("is_bot") is True
    ):
        raise TelegramInitDataError("Telegram user identity is invalid.")

    username = user_data.get("username")
    if username is not None:
        if not isinstance(username, str) or not 1 <= len(username) <= 32:
            raise TelegramInitDataError("Telegram username is invalid.")

    return TelegramIdentity(user_id=telegram_user_id, username=username)
