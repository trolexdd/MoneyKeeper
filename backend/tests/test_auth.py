from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from pwdlib.hashers.argon2 import Argon2Hasher
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.auth.security import hash_password, verify_password_and_update


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



def test_new_hash_uses_tuned_argon2id_parameters() -> None:
    password_hash = hash_password("a-strong-password-123")

    assert "$argon2id$" in password_hash
    assert "m=19456,t=2,p=1" in password_hash


def test_successful_login_upgrades_legacy_argon2_hash(client: TestClient) -> None:
    from pwdlib import PasswordHash
    from sqlalchemy import select

    from app.models import User

    password = "a-strong-password-123"
    registration = client.post(
        "/api/v1/auth/register",
        json={"email": "legacy@example.com", "password": password},
    )
    assert registration.status_code == 201

    db_generator = app.dependency_overrides[get_db]()
    db = next(db_generator)
    try:
        user = db.scalar(select(User).where(User.email == "legacy@example.com"))
        assert user is not None
        user.password_hash = PasswordHash(
            (Argon2Hasher(time_cost=3, memory_cost=65_536, parallelism=4),)
        ).hash(password)
        db.commit()
    finally:
        db_generator.close()

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "legacy@example.com", "password": password},
    )
    assert login.status_code == 200

    db_generator = app.dependency_overrides[get_db]()
    db = next(db_generator)
    try:
        user = db.scalar(select(User).where(User.email == "legacy@example.com"))
        assert user is not None
        assert "m=19456,t=2,p=1" in user.password_hash
    finally:
        db_generator.close()
