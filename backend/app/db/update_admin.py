"""Securely update the existing admin credentials from an interactive terminal."""

from __future__ import annotations

import getpass
import re
import sys

from sqlalchemy import create_engine, func, select, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from app.core.migration_credentials import get_migrator_database_url
from app.core.security import hash_password
from app.db.models import AdminSession, AdminUser


_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _prompt_email() -> str:
    email = input("New admin email: ").strip()
    if not _EMAIL_PATTERN.fullmatch(email):
        raise ValueError("Enter a valid admin email address.")
    return email


def _prompt_password() -> str:
    password = getpass.getpass("New admin password (hidden): ")
    confirmation = getpass.getpass("Re-enter new admin password (hidden): ")
    if not password:
        raise ValueError("Password cannot be empty.")
    if password != confirmation:
        raise ValueError("Passwords did not match; no credentials were changed.")
    return password


def update_admin_credentials(email: str, password: str) -> None:
    """Update the sole existing admin and revoke its active sessions atomically."""
    engine = create_engine(get_migrator_database_url(), pool_pre_ping=True)
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    try:
        with session_factory() as session:
            with session.begin():
                admins = session.scalars(select(AdminUser).order_by(AdminUser.id)).all()
                if not admins:
                    raise ValueError("No existing admin account was found; no credentials were changed.")
                if len(admins) > 1:
                    raise ValueError(
                        "Multiple admin accounts exist; credential update stopped without changes."
                    )

                admin = admins[0]
                conflict = session.scalar(
                    select(AdminUser).where(
                        AdminUser.id != admin.id,
                        func.lower(AdminUser.username) == email.casefold(),
                    )
                )
                if conflict is not None:
                    raise ValueError("Another admin account already uses that email.")

                admin.username = email
                admin.password_hash = hash_password(password)
                session.execute(
                    update(AdminSession)
                    .where(
                        AdminSession.admin_user_id == admin.id,
                        AdminSession.revoked_at.is_(None),
                    )
                    .values(revoked_at=func.now())
                )
                session.flush()
    except IntegrityError as exc:
        raise ValueError("The new email conflicts with an existing admin account; no changes were saved.") from exc
    except SQLAlchemyError as exc:
        raise RuntimeError("Credentials could not be updated; the transaction was rolled back.") from exc
    finally:
        engine.dispose()


def main() -> int:
    try:
        email = _prompt_email()
        password = _prompt_password()
        try:
            update_admin_credentials(email, password)
        finally:
            del password
    except (RuntimeError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print(f"Admin credentials updated for {email}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
