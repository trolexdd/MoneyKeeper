import calendar
from collections import defaultdict
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models import Transaction, User
from app.schemas.transactions import (
    CategoryExpense,
    SummaryPoint,
    TransactionCreate,
    TransactionRead,
    TransactionSummary,
)

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])
ZERO = Decimal("0.00")
WEEKDAY_LABELS = ("Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс")
MONTH_LABELS = ("Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек")


@router.get("", response_model=list[TransactionRead], summary="List current user's transactions")
def list_transactions(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Transaction]:
    statement = (
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(Transaction.occurred_at.desc(), Transaction.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(statement).all())


@router.post(
    "",
    response_model=TransactionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a transaction",
)
def create_transaction(
    payload: TransactionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Transaction:
    transaction = Transaction(
        user_id=user.id,
        type=payload.type,
        amount=payload.amount,
        currency="RUB",
        category=payload.category,
        description=payload.description,
        occurred_at=payload.occurred_at or datetime.now(UTC),
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete(
    "/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a transaction",
)
def delete_transaction(
    transaction_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    transaction = db.scalar(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == user.id,
        )
    )
    if transaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")
    db.delete(transaction)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/summary", response_model=TransactionSummary, summary="Get balances and chart data")
def get_summary(
    period: Literal["week", "month", "year"] = Query(default="month"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransactionSummary:
    now = datetime.now(UTC)
    today = now.date()

    if period == "week":
        start_date = today - timedelta(days=today.weekday())
        dates = [start_date + timedelta(days=offset) for offset in range(7)]
        labels = list(WEEKDAY_LABELS)
        bucket_keys: list[date | int] = dates
    elif period == "month":
        start_date = today.replace(day=1)
        day_count = calendar.monthrange(today.year, today.month)[1]
        bucket_keys = list(range(1, day_count + 1))
        labels = [f"{day:02d}" for day in bucket_keys]
    else:
        start_date = date(today.year, 1, 1)
        bucket_keys = list(range(1, 13))
        labels = list(MONTH_LABELS)

    start_at = datetime.combine(start_date, time.min, tzinfo=UTC)
    period_transactions = list(
        db.scalars(
            select(Transaction).where(
                Transaction.user_id == user.id,
                Transaction.occurred_at >= start_at,
                Transaction.occurred_at <= now,
            )
        ).all()
    )

    income_by_bucket: dict[date | int, Decimal] = defaultdict(lambda: ZERO)
    expense_by_bucket: dict[date | int, Decimal] = defaultdict(lambda: ZERO)
    category_totals: dict[str, Decimal] = defaultdict(lambda: ZERO)
    period_income = ZERO
    period_expenses = ZERO

    for transaction in period_transactions:
        occurred_at = transaction.occurred_at
        if occurred_at.tzinfo is None:
            occurred_at = occurred_at.replace(tzinfo=UTC)
        occurred_date = occurred_at.astimezone(UTC).date()

        if period == "week":
            bucket: date | int = occurred_date
        elif period == "month":
            bucket = occurred_date.day
        else:
            bucket = occurred_date.month

        if transaction.type == "income":
            period_income += transaction.amount
            income_by_bucket[bucket] += transaction.amount
        else:
            period_expenses += transaction.amount
            expense_by_bucket[bucket] += transaction.amount
            category_totals[transaction.category] += transaction.amount

    total_income = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), ZERO)).where(
            Transaction.user_id == user.id,
            Transaction.type == "income",
        )
    ) or ZERO
    total_expenses = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), ZERO)).where(
            Transaction.user_id == user.id,
            Transaction.type == "expense",
        )
    ) or ZERO

    series = [
        SummaryPoint(
            label=label,
            income=income_by_bucket[key],
            expenses=expense_by_bucket[key],
        )
        for key, label in zip(bucket_keys, labels, strict=True)
    ]
    expenses_by_category = [
        CategoryExpense(category=category, amount=amount)
        for category, amount in sorted(
            category_totals.items(),
            key=lambda item: item[1],
            reverse=True,
        )
    ]

    return TransactionSummary(
        balance=total_income - total_expenses,
        total_income=total_income,
        total_expenses=total_expenses,
        period_income=period_income,
        period_expenses=period_expenses,
        series=series,
        expenses_by_category=expenses_by_category,
    )
