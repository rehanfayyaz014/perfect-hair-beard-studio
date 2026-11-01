"""Securely create the first admin account from an interactive terminal."""

from __future__ import annotations

import getpass
import re
import sys

from sqlalchemy import create_engine, func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from app.core.migration_credentials import get_migrator_database_url
from app.core.security import hash_password
from app.db.models import AdminUser


_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _prompt_email() -> str:
    email = input("Admin email: ").strip()
    if not _EMAIL_PATTERN.fullmatch(email):
        raise ValueError("Enter a valid admin email address.")
    return email


def _prompt_password() -> str:
    password = getpass.getpass("Admin password (hidden): ")
    confirmation = getpass.getpass("Re-enter admin password (hidden): ")
    if not password:
        raise ValueError("Password cannot be empty.")
    if password != confirmation:
        raise ValueError("Passwords did not match; no admin account was created.")
    return password


def create_admin(email: str, password: str) -> None:
    """Create one admin in a transaction using the secure migration connection."""
    engine = create_engine(get_migrator_database_url(), pool_pre_ping=True)
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    try:
        with session_factory() as session:
            with session.begin():
                duplicate = session.scalar(
                    select(AdminUser).where(func.lower(AdminUser.username) == email.casefold())
                )
                if duplicate is not None:
                    raise ValueError("An admin account with that email already exists.")

                session.add(AdminUser(username=email, password_hash=hash_password(password)))
                session.flush()
    except IntegrityError as exc:
        raise ValueError("The admin account could not be created because the email already exists.") from exc
    except SQLAlchemyError as exc:
        raise RuntimeError("The admin account could not be created; the transaction was rolled back.") from exc
    finally:
        engine.dispose()


def main() -> int:
    try:
        email = _prompt_email()
        password = _prompt_password()
        try:
            create_admin(email, password)
        finally:
            del password
    except (RuntimeError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print(f"Admin account created for {email}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
