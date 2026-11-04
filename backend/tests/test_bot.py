from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.bot.finance import (
    find_linked_user_id,
    format_money,
    get_balance_totals,
    get_monthly_totals,
    get_recent_transactions,
)
from app.bot.keyboards import build_mini_app_keyboard, normalize_mini_app_url
from app.db.base import Base
from app.models import Transaction, User


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


def _make_user(db: Session, email: str, telegram_id: int | None = None) -> User:
    user = User(
        email=email,
        password_hash="test-password-hash",
        telegram_id=telegram_id,
    )
    db.add(user)
    db.flush()
    return user


def _make_transaction(
    db: Session,
    user: User,
    transaction_type: str,
    amount: str,
    category: str,
    occurred_at: datetime,
    description: str = "Test operation",
) -> None:
    db.add(
        Transaction(
            user_id=user.id,
            type=transaction_type,
            amount=Decimal(amount),
            currency="RUB",
            category=category,
            description=description,
            occurred_at=occurred_at,
        )
    )
    db.flush()


def test_finance_queries_are_scoped_to_the_linked_telegram_user() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        first_user = _make_user(db, "first@example.com", telegram_id=111)
        second_user = _make_user(db, "second@example.com", telegram_id=222)

        _make_transaction(
            db,
            first_user,
            "income",
            "1500.00",
            "Salary",
            datetime(2026, 11, 2, 9, tzinfo=UTC),
        )
        _make_transaction(
            db,
            first_user,
            "expense",
            "250.00",
            "Food",
            datetime(2026, 11, 3, 12, tzinfo=UTC),
        )
        _make_transaction(
            db,
            second_user,
            "income",
            "99999.00",
            "Other",
            datetime(2026, 11, 3, 12, tzinfo=UTC),
        )
        db.commit()

        linked_user_id = find_linked_user_id(db, 111)
        assert linked_user_id == first_user.id
        assert find_linked_user_id(db, 999) is None

        balance = get_balance_totals(db, linked_user_id)
        assert balance.total_income == Decimal("1500.00")
        assert balance.total_expenses == Decimal("250.00")
        assert balance.balance == Decimal("1250.00")

        recent = get_recent_transactions(db, linked_user_id)
        assert len(recent) == 2
        assert all(item.user_id == first_user.id for item in recent)

    engine.dispose()


def test_monthly_stats_use_current_utc_month_and_top_expense_categories() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    now = datetime(2026, 11, 4, 12, tzinfo=UTC)

    with Session(engine) as db:
        user = _make_user(db, "month@example.com", telegram_id=333)
        _make_transaction(
            db,
            user,
            "income",
            "2000.00",
            "Salary",
            datetime(2026, 11, 1, 9, tzinfo=UTC),
        )
        _make_transaction(
            db,
            user,
            "expense",
            "300.00",
            "Food",
            datetime(2026, 11, 2, 9, tzinfo=UTC),
        )
        _make_transaction(
            db,
            user,
            "expense",
            "125.00",
            "Transport",
            datetime(2026, 11, 3, 9, tzinfo=UTC),
        )
        _make_transaction(
            db,
            user,
            "income",
            "500.00",
            "Old month",
            datetime(2026, 10, 31, 23, tzinfo=UTC),
        )
        _make_transaction(
            db,
            user,
            "expense",
            "999.00",
            "Future",
            datetime(2026, 11, 5, 9, tzinfo=UTC),
        )
        db.commit()

        stats = get_monthly_totals(db, user.id, now)
        assert stats.income == Decimal("2000.00")
        assert stats.expenses == Decimal("425.00")
        assert stats.top_categories == (
            ("Food", Decimal("300.00")),
            ("Transport", Decimal("125.00")),
        )

    engine.dispose()


def test_inactive_telegram_account_is_not_authorized() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        user = _make_user(db, "inactive@example.com", telegram_id=444)
        user.is_active = False
        db.commit()

        assert find_linked_user_id(db, 444) is None

    engine.dispose()


def test_format_money_uses_russian_number_format() -> None:
    assert format_money(Decimal("1234567.89")) == "1 234 567,89 ₽"
    assert format_money(Decimal("-42.50")) == "−42,50 ₽"
