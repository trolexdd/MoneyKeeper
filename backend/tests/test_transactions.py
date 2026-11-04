from collections.abc import Generator

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


def auth_headers(session: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {session['access_token']}"}


def test_transactions_are_persisted_and_summary_is_calculated(client: TestClient) -> None:
    session = register(client, "owner@example.com")
    headers = auth_headers(session)

    expense = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "type": "expense",
            "amount": "125.50",
            "category": "Продукты",
            "description": "Покупки в магазине",
        },
    )
    assert expense.status_code == 201
    expense_data = expense.json()
    assert expense_data["amount"] == "125.50"
    assert expense_data["currency"] == "RUB"

    income = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "type": "income",
            "amount": "2500.00",
            "category": "Зарплата",
            "description": "Аванс",
        },
    )
    assert income.status_code == 201

    listing = client.get("/api/v1/transactions", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 2

    summary = client.get("/api/v1/transactions/summary?period=month", headers=headers)
    assert summary.status_code == 200
    data = summary.json()
    assert data["balance"] == "2374.50"
    assert data["period_income"] == "2500.00"
    assert data["period_expenses"] == "125.50"
    assert data["expenses_by_category"] == [{"category": "Продукты", "amount": "125.50"}]


def test_users_cannot_see_or_delete_each_others_transactions(client: TestClient) -> None:
    owner = register(client, "first@example.com")
    another_user = register(client, "second@example.com")
    created = client.post(
        "/api/v1/transactions",
        headers=auth_headers(owner),
        json={
            "type": "expense",
            "amount": "10.00",
            "category": "Другое",
            "description": "Private transaction",
        },
    )
    transaction_id = created.json()["id"]

    other_list = client.get("/api/v1/transactions", headers=auth_headers(another_user))
    assert other_list.status_code == 200
    assert other_list.json() == []

    other_delete = client.delete(
        f"/api/v1/transactions/{transaction_id}",
        headers=auth_headers(another_user),
    )
    assert other_delete.status_code == 404

    owner_delete = client.delete(
        f"/api/v1/transactions/{transaction_id}",
        headers=auth_headers(owner),
    )
    assert owner_delete.status_code == 204


def test_invalid_amount_and_missing_auth_are_rejected(client: TestClient) -> None:
    missing_auth = client.post(
        "/api/v1/transactions",
        json={
            "type": "expense",
            "amount": "10.00",
            "category": "Другое",
            "description": "Valid payload without authentication",
        },
    )
    assert missing_auth.status_code == 401

    session = register(client, "validation@example.com")
    rejected = client.post(
        "/api/v1/transactions",
        headers=auth_headers(session),
        json={
            "type": "expense",
            "amount": "0",
            "category": "Другое",
            "description": "Zero amount",
        },
    )
    assert rejected.status_code == 422
