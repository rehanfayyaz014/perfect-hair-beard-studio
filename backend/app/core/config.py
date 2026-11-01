from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables or .env."""

    postgres_host: str = "127.0.0.1"
    postgres_port: int = 5432
    postgres_db: str = "perfect_hair_beard_studio"
    postgres_user: str = ""
    postgres_password: str = ""
    admin_session_cookie_name: str = "phbs_admin_session"
    admin_session_ttl_minutes: int = 480
    admin_cookie_secure: bool = False

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        """Build a PostgreSQL URL without storing credentials in source code."""
        if not self.postgres_user or not self.postgres_password:
            raise RuntimeError(
                "POSTGRES_USER and POSTGRES_PASSWORD must be set before using the database."
            )

        return URL.create(
            drivername="postgresql+psycopg",
            username=self.postgres_user,
            password=self.postgres_password,
            host=self.postgres_host,
            port=self.postgres_port,
            database=self.postgres_db,
        ).render_as_string(hide_password=False)


@lru_cache
def get_settings() -> Settings:
    """Return one cached settings object for the current process."""
    return Settings()
