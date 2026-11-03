import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TransactionCreate(BaseModel):
    type: Literal["income", "expense"]
    amount: Decimal = Field(gt=Decimal("0"), max_digits=14, decimal_places=2)
    category: str = Field(min_length=1, max_length=80)
    description: str = Field(min_length=1, max_length=200)
    occurred_at: datetime | None = None

    @field_validator("category", "description")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty.")
        return value

    @field_validator("occurred_at")
    @classmethod
    def ensure_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: Literal["income", "expense"]
    amount: Decimal
    currency: str
    category: str
    description: str
    occurred_at: datetime
    created_at: datetime


class SummaryPoint(BaseModel):
    label: str
    income: Decimal
    expenses: Decimal


class CategoryExpense(BaseModel):
    category: str
    amount: Decimal


class TransactionSummary(BaseModel):
    balance: Decimal
    total_income: Decimal
    total_expenses: Decimal
    period_income: Decimal
    period_expenses: Decimal
    series: list[SummaryPoint]
    expenses_by_category: list[CategoryExpense]
