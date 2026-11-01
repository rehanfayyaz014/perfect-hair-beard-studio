from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import AdminSession, AdminUser
from app.db.admin_session import get_admin_db
from app.core.security import hash_session_token
from app.core.config import get_settings


def get_current_admin(
    request: Request,
    db: Session = Depends(get_admin_db),
) -> AdminUser:
    session_token = request.cookies.get(get_settings().admin_session_cookie_name)
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin login required.")

    now = datetime.now(timezone.utc)
    session = db.scalar(
        select(AdminSession)
        .join(AdminUser)
        .where(
            AdminSession.id == hash_session_token(session_token),
            AdminSession.revoked_at.is_(None),
            AdminSession.expires_at > now,
            AdminUser.is_active.is_(True),
        )
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin login required.")

    return session.admin_user
