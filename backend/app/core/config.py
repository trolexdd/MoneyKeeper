from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_secret_key: str = ""
    database_url: str = (
        "postgresql+psycopg://moneykeeper:moneykeeper@localhost:5432/moneykeeper"
    )
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    telegram_bot_token: str = ""
    telegram_mini_app_url: str = ""
    telegram_init_data_max_age_seconds: int = 3600
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
