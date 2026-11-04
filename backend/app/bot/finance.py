from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models import Transaction, User

ZERO = Decimal("0.00")


@dataclass(frozen=True, slots=True)
class BalanceTotals:
    total_income: Decimal
    total_expenses: Decimal

    @property
    def balance(self) -> Decimal:
        return self.total_income - self.total_expenses


@dataclass(frozen=True, slots=True)
class MonthlyTotals:
    income: Decimal
    expenses: Decimal
    top_categories: tuple[tuple[str, Decimal], ...]


def find_linked_user_id(db: Session, telegram_user_id: int) -> UUID | None:
    result = db.execute(
        select(User.id, User.is_active).where(User.telegram_id == telegram_user_id)
    ).one_or_none()
    if result is None or not result.is_active:
        return None
    return result.id


def get_balance_totals(db: Session, user_id: UUID) -> BalanceTotals:
    total_income = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), ZERO)).where(
            Transaction.user_id == user_id,
            Transaction.type == "income",
        )
    )
    total_expenses = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), ZERO)).where(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
        )
    )
    return BalanceTotals(
        total_income=total_income or ZERO,
        total_expenses=total_expenses or ZERO,
    )


def get_monthly_totals(
    db: Session,
    user_id: UUID,
    now: datetime | None = None,
) -> MonthlyTotals:
    reference_time = now or datetime.now(UTC)
    if reference_time.tzinfo is None:
        reference_time = reference_time.replace(tzinfo=UTC)
    reference_time = reference_time.astimezone(UTC)
    month_start = reference_time.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    totals = db.execute(
        select(Transaction.type, func.sum(Transaction.amount))
        .where(
            Transaction.user_id == user_id,
            Transaction.occurred_at >= month_start,
            Transaction.occurred_at <= reference_time,
        )
        .group_by(Transaction.type)
    ).all()
    totals_by_type = {transaction_type: amount for transaction_type, amount in totals}

    categories = db.execute(
        select(Transaction.category, func.sum(Transaction.amount).label("amount"))
        .where(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.occurred_at >= month_start,
            Transaction.occurred_at <= reference_time,
        )
        .group_by(Transaction.category)
        .order_by(desc("amount"))
        .limit(3)
    ).all()

    return MonthlyTotals(
        income=totals_by_type.get("income", ZERO) or ZERO,
        expenses=totals_by_type.get("expense", ZERO) or ZERO,
        top_categories=tuple((category, amount) for category, amount in categories),
    )


def get_recent_transactions(
    db: Session,
    user_id: UUID,
    limit: int = 5,
) -> list[Transaction]:
    safe_limit = max(1, min(limit, 10))
    statement = (
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(Transaction.occurred_at.desc(), Transaction.created_at.desc())
        .limit(safe_limit)
    )
    return list(db.scalars(statement).all())


def format_money(amount: Decimal) -> str:
    sign = "−" if amount < 0 else ""
    formatted = f"{abs(amount):,.2f}".replace(",", " ").replace(".", ",")
    return f"{sign}{formatted} ₽"
