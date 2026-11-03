from collections.abc import Generator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    monkeypatch.setenv("APP_SECRET_KEY", "test-secret-key-with-at-least-thirty-two-characters")
    get_settings.cache_clear()
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, class_=Session, autoflush=False, autocommit=False)

    def override_get_db() -> Generator[Session, None, None]:
        db = factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    engine.dispose()
    get_settings.cache_clear()


def register(client: TestClient, email: str) -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "a-strong-password-123"},
    )
    assert response.status_code == 201
    return response.json()


def headers(session: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {session['access_token']}"}


def current_period() -> tuple[int, int]:
    now = datetime.now(UTC)
    return now.year, now.month


def create_expense(
    client: TestClient,
    auth: dict[str, str],
    amount: str,
    category: str = "Продукты",
) -> dict:
    response = client.post(
        "/api/v1/transactions",
        headers=auth,
        json={
            "type": "expense",
            "amount": amount,
            "category": category,
            "description": "Тестовый расход",
            "occurred_at": datetime.now(UTC).isoformat(),
        },
    )
    assert response.status_code == 201
    return response.json()


def test_create_budget_calculates_actual_spending_and_over_limit(
    client: TestClient,
) -> None:
    session = register(client, "budget-owner@example.com")
    auth = headers(session)
    year, month = current_period()

    create_expense(client, auth, "75.50")
    create_expense(client, auth, "44.50")
    create_expense(client, auth, "300.00", category="Кафе")

    response = client.post(
        "/api/v1/budgets",
        headers=auth,
        json={
            "category": "Продукты",
            "limit_amount": "100.00",
            "year": year,
            "month": month,
        },
    )
    assert response.status_code == 201
    budget = response.json()
    assert budget["limit_amount"] == "100.00"
    assert budget["spent_amount"] == "120.00"
    assert budget["remaining_amount"] == "-20.00"
    assert budget["usage_percent"] == "120.0"
    assert budget["is_over_limit"] is True

    listed = client.get(
        f"/api/v1/budgets?year={year}&month={month}",
        headers=auth,
    )
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["category"] == "Продукты"


def test_budget_can_be_updated_and_deleted(client: TestClient) -> None:
    session = register(client, "budget-edit@example.com")
    auth = headers(session)
    year, month = current_period()

    created = client.post(
        "/api/v1/budgets",
        headers=auth,
        json={
            "category": "Транспорт",
            "limit_amount": "5000.00",
            "year": year,
            "month": month,
        },
    )
    budget_id = created.json()["id"]

    updated = client.patch(
        f"/api/v1/budgets/{budget_id}",
        headers=auth,
        json={"limit_amount": "6500.00"},
    )
    assert updated.status_code == 200
    assert updated.json()["limit_amount"] == "6500.00"

    deleted = client.delete(f"/api/v1/budgets/{budget_id}", headers=auth)
    assert deleted.status_code == 204

    listing = client.get(
        f"/api/v1/budgets?year={year}&month={month}",
        headers=auth,
    )
    assert listing.status_code == 200
    assert listing.json() == []


def test_budgets_are_private_and_duplicate_category_is_rejected(
    client: TestClient,
) -> None:
    owner = register(client, "budget-private@example.com")
    other = register(client, "budget-other@example.com")
    year, month = current_period()

    created = client.post(
        "/api/v1/budgets",
        headers=headers(owner),
        json={
            "category": "Продукты",
            "limit_amount": "2000.00",
            "year": year,
            "month": month,
        },
    )
    budget_id = created.json()["id"]

    duplicate = client.post(
        "/api/v1/budgets",
        headers=headers(owner),
        json={
            "category": "Продукты",
            "limit_amount": "3000.00",
            "year": year,
            "month": month,
        },
    )
    assert duplicate.status_code == 409

    other_listing = client.get(
        f"/api/v1/budgets?year={year}&month={month}",
        headers=headers(other),
    )
    assert other_listing.status_code == 200
    assert other_listing.json() == []

    other_update = client.patch(
        f"/api/v1/budgets/{budget_id}",
        headers=headers(other),
        json={"limit_amount": "1.00"},
    )
    assert other_update.status_code == 404

    other_delete = client.delete(
        f"/api/v1/budgets/{budget_id}",
        headers=headers(other),
    )
    assert other_delete.status_code == 404


def test_budget_validation_and_missing_auth(client: TestClient) -> None:
    payload = {
        "category": "Продукты",
        "limit_amount": "0",
        "year": 2026,
        "month": 13,
    }
    unauthorized = client.post("/api/v1/budgets", json=payload)
    assert unauthorized.status_code == 401

    session = register(client, "budget-validation@example.com")
    invalid_amount = client.post(
        "/api/v1/budgets",
        headers=headers(session),
        json={**payload, "month": 11},
    )
    assert invalid_amount.status_code == 422

    invalid_month = client.get(
        "/api/v1/budgets?year=2026&month=13",
        headers=headers(session),
    )
    assert invalid_month.status_code == 422
