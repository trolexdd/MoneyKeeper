import pytest

from app.bot.keyboards import build_mini_app_keyboard, normalize_mini_app_url


def test_empty_mini_app_url_is_not_configured() -> None:
    assert normalize_mini_app_url("") is None
    assert normalize_mini_app_url("   ") is None


def test_mini_app_url_is_normalized() -> None:
    assert normalize_mini_app_url(" https://moneykeeper.example/app/ ") == (
        "https://moneykeeper.example/app"
    )


@pytest.mark.parametrize(
    "url",
    [
        "http://moneykeeper.example",
        "localhost:5173",
        "javascript:alert(1)",
        "https://",
    ],
)
def test_non_https_or_invalid_mini_app_url_is_rejected(url: str) -> None:
    with pytest.raises(ValueError, match="HTTPS"):
        normalize_mini_app_url(url)


def test_keyboard_is_omitted_without_public_url() -> None:
    assert build_mini_app_keyboard(None) is None


def test_keyboard_contains_web_app_button() -> None:
    keyboard = build_mini_app_keyboard("https://moneykeeper.example")
    assert keyboard is not None
    button = keyboard.inline_keyboard[0][0]
    assert button.text == "Открыть MoneyKeeper"
    assert button.web_app is not None
    assert button.web_app.url == "https://moneykeeper.example"
