from urllib.parse import urlsplit

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo


def normalize_mini_app_url(value: str) -> str | None:
    """Return a valid HTTPS Mini App URL, or None when it is not configured."""
    url = value.strip()
    if not url:
        return None

    parsed = urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("TELEGRAM_MINI_APP_URL must be a valid HTTPS URL")

    return url.rstrip("/")


def build_mini_app_keyboard(url: str | None) -> InlineKeyboardMarkup | None:
    if not url:
        return None

    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Открыть MoneyKeeper",
                    web_app=WebAppInfo(url=url),
                )
            ]
        ]
    )
