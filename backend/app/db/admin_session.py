from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.admin_credentials import get_admin_database_url


@lru_cache
def get_admin_engine() -> Engine:
    """Create the admin-auth engine only when an auth route needs it."""
    return create_engine(get_admin_database_url(), pool_pre_ping=True)


@lru_cache
def get_admin_session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_admin_engine(), autoflush=False, autocommit=False)


def get_admin_db() -> Generator[Session, None, None]:
    db = get_admin_session_factory()()
    try:
        yield db
    finally:
        db.close()
