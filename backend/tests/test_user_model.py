from sqlalchemy import create_engine, inspect

from app.db.base import Base
from app import models  # noqa: F401


def test_user_table_metadata_can_be_created_with_sqlite() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    inspector = inspect(engine)
    assert "users" in inspector.get_table_names()

    columns = {column["name"] for column in inspector.get_columns("users")}
    assert {
        "id",
        "email",
        "password_hash",
        "is_active",
        "created_at",
        "updated_at",
    } <= columns

    engine.dispose()
