import os
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
    monkeypatch.setenv("ACCESS_TOKEN_MINUTES", "15")
    monkeypatch.setenv("REFRESH_TOKEN_DAYS", "30")
    get_settings.cache_clear()

    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    test_session_factory = sessionmaker(
        bind=engine,
        class_=Session,
        autoflush=False,
        autocommit=False,
    )

    def override_get_db() -> Generator[Session, None, None]:
        db = test_session_factory()
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


def test_register_login_and_get_current_user(client: TestClient) -> None:
    registration = client.post(
        "/api/v1/auth/register",
        json={"email": "  Test@Example.com ", "password": "a-strong-password-123"},
    )

    assert registration.status_code == 201
    tokens = registration.json()
    assert tokens["user"]["email"] == "test@example.com"
    assert tokens["token_type"] == "bearer"
    assert len(tokens["refresh_token"]) >= 32

    profile = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert profile.status_code == 200
    assert profile.json()["email"] == "test@example.com"

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "TEST@example.com", "password": "a-strong-password-123"},
    )
    assert login.status_code == 200


def test_duplicate_registration_is_rejected(client: TestClient) -> None:
    payload = {"email": "duplicate@example.com", "password": "a-strong-password-123"}
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    assert client.post("/api/v1/auth/register", json=payload).status_code == 409


def test_weak_password_and_invalid_login_are_rejected(client: TestClient) -> None:
    weak = client.post(
        "/api/v1/auth/register",
        json={"email": "weak@example.com", "password": "short"},
    )
    assert weak.status_code == 422

    invalid = client.post(
        "/api/v1/auth/login",
        json={"email": "missing@example.com", "password": "a-strong-password-123"},
    )
    assert invalid.status_code == 401


def test_refresh_rotation_and_logout_revoke_access(client: TestClient) -> None:
    registration = client.post(
        "/api/v1/auth/register",
        json={"email": "session@example.com", "password": "a-strong-password-123"},
    )
    original = registration.json()

    rotated = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": original["refresh_token"]},
    )
    assert rotated.status_code == 200
    current = rotated.json()
    assert current["refresh_token"] != original["refresh_token"]

    reused = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": original["refresh_token"]},
    )
    assert reused.status_code == 401

    logout = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": current["refresh_token"]},
    )
    assert logout.status_code == 204

    profile = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {current['access_token']}"},
    )
    assert profile.status_code == 401


def test_invalid_access_token_is_rejected(client: TestClient) -> None:
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not-a-valid-token"},
    )
    assert response.status_code == 401
