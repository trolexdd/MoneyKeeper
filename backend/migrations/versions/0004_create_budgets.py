"""create monthly category budgets

Revision ID: 0004_create_budgets
Revises: 0003_create_transactions
Create Date: 2026-11-03
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0004_create_budgets"
down_revision: Union[str, None] = "0003_create_transactions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "budgets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("limit_amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), server_default="RUB", nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint("limit_amount > 0", name="ck_budgets_limit_positive"),
        sa.CheckConstraint(
            "month >= 1 AND month <= 12",
            name="ck_budgets_month_range",
        ),
        sa.CheckConstraint(
            "year >= 2000 AND year <= 9999",
            name="ck_budgets_year_range",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "category",
            "year",
            "month",
            name="uq_budgets_user_category_period",
        ),
    )
    op.create_index(
        "ix_budgets_user_period",
        "budgets",
        ["user_id", "year", "month"],
    )


def downgrade() -> None:
    op.drop_index("ix_budgets_user_period", table_name="budgets")
    op.drop_table("budgets")
