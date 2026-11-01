"""Deliberately reset all admin records to one configured default account."""

from __future__ import annotations

import os
import re
import sys
import getpass

from sqlalchemy import create_engine, delete
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from app.core.migration_credentials import get_migrator_database_url
from app.core.security import hash_password
from app.db.models import AdminSession, AdminUser


_USERNAME_PATTERN = re.compile(r"^[^\s]{1,120}$")


def _read_reset_configuration() -> tuple[str, str]:
    username = os.environ.get("DEFAULT_ADMIN_USERNAME", "Admin").strip()
    password = os.environ.get("DEFAULT_ADMIN_PASSWORD", "")
    if not password:
        password = getpass.getpass("Default admin password (hidden): ")
        confirmation = getpass.getpass("Re-enter default admin password (hidden): ")
        if password != confirmation:
            raise ValueError("Passwords did not match; no admin records were changed.")
        del confirmation
    if not _USERNAME_PATTERN.fullmatch(username):
        raise ValueError("DEFAULT_ADMIN_USERNAME must be a non-empty value without spaces.")
    if len(password) < 12:
        raise ValueError("DEFAULT_ADMIN_PASSWORD must contain at least 12 characters.")
    return username, password


def reset_default_admin(username: str, password: str) -> None:
    """Replace admin records only, preserving all non-admin application data."""
    engine = create_engine(get_migrator_database_url(), pool_pre_ping=True)
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    try:
        with session_factory() as session:
            with session.begin():
                session.execute(delete(AdminSession))
                session.execute(delete(AdminUser))
                session.add(AdminUser(username=username, password_hash=hash_password(password)))
    except SQLAlchemyError as exc:
        raise RuntimeError("Default admin reset failed; the transaction was rolled back.") from exc
    finally:
        engine.dispose()


def main() -> int:
    try:
        username, password = _read_reset_configuration()
        try:
            reset_default_admin(username, password)
        finally:
            del password
    except (RuntimeError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print("Default admin reset completed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
