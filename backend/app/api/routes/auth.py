from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_admin
from app.core.config import get_settings
from app.core.security import create_session_token, hash_password, hash_session_token, verify_password
from app.db.models import AdminSession, AdminUser
from app.db.admin_session import get_admin_db

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_new_password: str


class AdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str


def _set_session_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.admin_session_cookie_name,
        value=token,
        max_age=settings.admin_session_ttl_minutes * 60,
        httponly=True,
        secure=settings.admin_cookie_secure,
        samesite="lax",
        path="/",
    )


@router.post("/login", response_model=AdminResponse)
def login(
    payload: LoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_admin_db),
) -> AdminResponse:
    normalized_username = payload.username.strip().casefold()
    admin = db.scalar(
        select(AdminUser).where(func.lower(AdminUser.username) == normalized_username)
    )
    now = datetime.now(timezone.utc)
    if (
        admin is None
        or not admin.is_active
        or (admin.locked_until is not None and admin.locked_until > now)
        or not verify_password(payload.password, admin.password_hash)
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials.")

    token = create_session_token()
    session = AdminSession(
        id=hash_session_token(token),
        admin_user=admin,
        expires_at=now + timedelta(minutes=get_settings().admin_session_ttl_minutes),
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    admin.last_login_at = now
    admin.failed_login_count = 0
    db.add(session)
    db.commit()
    _set_session_cookie(response, token)
    return AdminResponse.model_validate(admin)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response, request: Request, db: Session = Depends(get_admin_db)) -> None:
    token = request.cookies.get(get_settings().admin_session_cookie_name)
    if token:
        session = db.get(AdminSession, hash_session_token(token))
        if session is not None and session.revoked_at is None:
            session.revoked_at = datetime.now(timezone.utc)
            db.commit()
    response.delete_cookie(get_settings().admin_session_cookie_name, path="/")


@router.get("/me", response_model=AdminResponse)
def current_admin(admin: AdminUser = Depends(get_current_admin)) -> AdminResponse:
    return AdminResponse.model_validate(admin)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    response: Response,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
) -> None:
    if not verify_password(payload.current_password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    if len(payload.new_password) < 12:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 12 characters.")
    if payload.new_password != payload.confirm_new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New passwords do not match.")
    if payload.new_password == payload.current_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different.")

    now = datetime.now(timezone.utc)
    admin.password_hash = hash_password(payload.new_password)
    db.execute(
        update(AdminSession)
        .where(AdminSession.admin_user_id == admin.id)
        .values(revoked_at=now)
    )
    db.commit()
    response.delete_cookie(get_settings().admin_session_cookie_name, path="/")
