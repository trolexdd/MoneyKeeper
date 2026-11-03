from datetime import UTC
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BudgetCreate(BaseModel):
    category: str = Field(min_length=1, max_length=80)
    limit_amount: Decimal = Field(
        gt=Decimal("0"),
        max_digits=14,
        decimal_places=2,
    )
    year: int = Field(ge=2000, le=9999)
    month: int = Field(ge=1, le=12)

    @field_validator("category")
    @classmethod
    def strip_category(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Category cannot be empty.")
        return value


class BudgetUpdate(BaseModel):
    limit_amount: Decimal = Field(
        gt=Decimal("0"),
        max_digits=14,
        decimal_places=2,
    )


class BudgetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category: str
    limit_amount: Decimal
    spent_amount: Decimal
    remaining_amount: Decimal
    usage_percent: Decimal
    is_over_limit: bool
    currency: str
    year: int
    month: int
