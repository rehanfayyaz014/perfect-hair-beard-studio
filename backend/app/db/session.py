from functools import lru_cache
from collections.abc import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


@lru_cache
def get_engine() -> Engine:
    """Create the engine only when database access is explicitly requested."""
    return create_engine(get_settings().database_url, pool_pre_ping=True)


@lru_cache
def get_session_factory() -> sessionmaker[Session]:
    """Return the reusable SQLAlchemy session factory."""
    return sessionmaker(bind=get_engine(), autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session for future dependency-injected routes."""
    db = get_session_factory()()
    try:
        yield db
    finally:
        db.close()
