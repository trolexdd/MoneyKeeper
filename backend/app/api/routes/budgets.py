import calendar
from datetime import UTC, date, datetime, time
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models import Budget, Transaction, User
from app.schemas.budgets import BudgetCreate, BudgetRead, BudgetUpdate

router = APIRouter(prefix="/api/v1/budgets", tags=["budgets"])
ZERO = Decimal("0.00")


def _period_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    start_date = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    end_date = date(year, month, last_day)
    return (
        datetime.combine(start_date, time.min, tzinfo=UTC),
        datetime.combine(end_date, time.max, tzinfo=UTC),
    )


def _build_budget_read(
    budget: Budget,
    spent_amount: Decimal,
) -> BudgetRead:
    limit_amount = budget.limit_amount
    remaining_amount = limit_amount - spent_amount
    usage_percent = (spent_amount / limit_amount * Decimal("100")).quantize(
        Decimal("0.1")
    )
    return BudgetRead(
        id=budget.id,
        category=budget.category,
        limit_amount=limit_amount,
        spent_amount=spent_amount,
        remaining_amount=remaining_amount,
        usage_percent=usage_percent,
        is_over_limit=spent_amount > limit_amount,
        currency=budget.currency,
        year=budget.year,
        month=budget.month,
    )


@router.get("", response_model=list[BudgetRead], summary="List monthly budgets and actual spending")
def list_budgets(
    year: int | None = Query(default=None, ge=2000, le=9999),
    month: int | None = Query(default=None, ge=1, le=12),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[BudgetRead]:
    today = datetime.now(UTC).date()
    selected_year = year or today.year
    selected_month = month or today.month
    start_at, end_at = _period_bounds(selected_year, selected_month)

    budgets = list(
        db.scalars(
            select(Budget)
            .where(
                Budget.user_id == user.id,
                Budget.year == selected_year,
                Budget.month == selected_month,
            )
            .order_by(Budget.category.asc())
        ).all()
    )
    spending_rows = db.execute(
        select(
            Transaction.category,
            func.coalesce(func.sum(Transaction.amount), ZERO),
        )
        .where(
            Transaction.user_id == user.id,
            Transaction.type == "expense",
            Transaction.occurred_at >= start_at,
            Transaction.occurred_at <= end_at,
        )
        .group_by(Transaction.category)
    ).all()
    spent_by_category = {category: amount for category, amount in spending_rows}

    return [
        _build_budget_read(
            budget,
            spent_by_category.get(budget.category, ZERO),
        )
        for budget in budgets
    ]


@router.post(
    "",
    response_model=BudgetRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a monthly category budget",
)
def create_budget(
    payload: BudgetCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BudgetRead:
    budget = Budget(
        user_id=user.id,
        category=payload.category,
        limit_amount=payload.limit_amount,
        year=payload.year,
        month=payload.month,
        currency="RUB",
    )
    db.add(budget)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="На эту категорию уже создан бюджет за выбранный месяц.",
        ) from None
    db.refresh(budget)

    start_at, end_at = _period_bounds(budget.year, budget.month)
    spent_amount = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), ZERO)).where(
            Transaction.user_id == user.id,
            Transaction.type == "expense",
            Transaction.category == budget.category,
            Transaction.occurred_at >= start_at,
            Transaction.occurred_at <= end_at,
        )
    ) or ZERO
    return _build_budget_read(budget, spent_amount)


@router.patch(
    "/{budget_id}",
    response_model=BudgetRead,
    summary="Update a monthly budget limit",
)
def update_budget(
    budget_id: UUID,
    payload: BudgetUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BudgetRead:
    budget = db.scalar(
        select(Budget).where(
            Budget.id == budget_id,
            Budget.user_id == user.id,
        )
    )
    if budget is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Бюджет не найден.")

    budget.limit_amount = payload.limit_amount
    db.commit()
    db.refresh(budget)

    start_at, end_at = _period_bounds(budget.year, budget.month)
    spent_amount = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), ZERO)).where(
            Transaction.user_id == user.id,
            Transaction.type == "expense",
            Transaction.category == budget.category,
            Transaction.occurred_at >= start_at,
            Transaction.occurred_at <= end_at,
        )
    ) or ZERO
    return _build_budget_read(budget, spent_amount)


@router.delete(
    "/{budget_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a monthly budget",
)
def delete_budget(
    budget_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    budget = db.scalar(
        select(Budget).where(
            Budget.id == budget_id,
            Budget.user_id == user.id,
        )
    )
    if budget is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found.")
    db.delete(budget)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
