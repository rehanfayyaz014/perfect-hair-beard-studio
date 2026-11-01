from __future__ import annotations

import json
from pathlib import PurePosixPath
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies.auth import get_current_admin
from app.db.admin_session import get_admin_db
from app.db.models import GalleryCategory, GalleryItem

router = APIRouter(prefix="/admin/gallery", tags=["admin-gallery"])


def _validate_asset_path(value: str) -> str:
    normalized = value.strip().replace("\\", "/")
    path = PurePosixPath(normalized)
    if (
        not normalized.startswith("gallery/")
        or normalized.startswith(("http:", "https:", "data:"))
        or ".." in path.parts
        or "?" in normalized
        or "#" in normalized
        or "\x00" in normalized
        or path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}
    ):
        raise ValueError("Asset path must reference a managed gallery image.")
    return normalized


def _asset_is_allowlisted(asset_path: str) -> bool:
    """Fail closed unless the checked-in frontend manifest contains the asset."""
    manifest_path = Path(__file__).resolve().parents[4] / "frontend" / "public" / "gallery" / "manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    return isinstance(manifest, list) and asset_path in manifest


class GalleryCategoryPayload(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    display_order: int = Field(default=0, ge=0)
    is_active: bool = True

    @field_validator("name", "slug")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value cannot be blank.")
        return value


class GalleryItemPayload(BaseModel):
    category_id: int = Field(gt=0)
    asset_path: str
    title: str | None = Field(default=None, max_length=160)
    caption: str | None = Field(default=None, max_length=500)
    alt_text: str = Field(min_length=1, max_length=255)
    display_order: int = Field(default=0, ge=0)
    is_published: bool = False

    @field_validator("asset_path")
    @classmethod
    def validate_asset(cls, value: str) -> str:
        return _validate_asset_path(value)

    @field_validator("alt_text")
    @classmethod
    def strip_alt_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Alt text cannot be blank.")
        return value


class GalleryCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    display_order: int
    is_active: bool


class GalleryItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    asset_path: str
    title: str | None
    caption: str | None
    alt_text: str
    display_order: int
    is_published: bool


def _duplicate_category(db: Session, payload: GalleryCategoryPayload, category_id: int | None = None):
    query = select(GalleryCategory).where(
        (func.lower(GalleryCategory.name) == payload.name.lower()) | (GalleryCategory.slug == payload.slug)
    )
    if category_id is not None:
        query = query.where(GalleryCategory.id != category_id)
    return db.scalar(query)


def _duplicate_item(db: Session, payload: GalleryItemPayload, item_id: int | None = None):
    query = select(GalleryItem).where(GalleryItem.asset_path == payload.asset_path)
    if item_id is not None:
        query = query.where(GalleryItem.id != item_id)
    return db.scalar(query)


@router.get("/categories", response_model=list[GalleryCategoryResponse])
def list_gallery_categories(_admin=Depends(get_current_admin), db: Session = Depends(get_admin_db)):
    return db.scalars(select(GalleryCategory).order_by(GalleryCategory.display_order, GalleryCategory.id)).all()


@router.post("/categories", response_model=GalleryCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_gallery_category(payload: GalleryCategoryPayload, _admin=Depends(get_current_admin), db: Session = Depends(get_admin_db)):
    if _duplicate_category(db, payload):
        raise HTTPException(status_code=409, detail="Gallery category name or slug already exists.")
    category = GalleryCategory(**payload.model_dump())
    db.add(category)
    try:
        db.commit()
        db.refresh(category)
        return category
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Gallery category already exists.") from error
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=503, detail="Gallery category could not be saved.") from error


@router.patch("/categories/{category_id}", response_model=GalleryCategoryResponse)
def update_gallery_category(category_id: int, payload: GalleryCategoryPayload, _admin=Depends(get_current_admin), db: Session = Depends(get_admin_db)):
    category = db.get(GalleryCategory, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Gallery category not found.")
    if _duplicate_category(db, payload, category_id):
        raise HTTPException(status_code=409, detail="Gallery category name or slug already exists.")
    for field, value in payload.model_dump().items():
        setattr(category, field, value)
    try:
        db.commit()
        db.refresh(category)
        return category
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=503, detail="Gallery category could not be updated.") from error


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gallery_category(category_id: int, _admin=Depends(get_current_admin), db: Session = Depends(get_admin_db)):
    category = db.get(GalleryCategory, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Gallery category not found.")
    if db.scalar(select(func.count(GalleryItem.id)).where(GalleryItem.category_id == category_id)):
        raise HTTPException(status_code=409, detail="This gallery category contains photos. Deactivate it instead.")
    db.delete(category)
    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=503, detail="Gallery category could not be deleted.") from error


@router.get("/items", response_model=list[GalleryItemResponse])
def list_gallery_items(_admin=Depends(get_current_admin), db: Session = Depends(get_admin_db)):
    return db.scalars(select(GalleryItem).order_by(GalleryItem.display_order, GalleryItem.id)).all()


@router.post("/items", response_model=GalleryItemResponse, status_code=status.HTTP_201_CREATED)
def create_gallery_item(payload: GalleryItemPayload, _admin=Depends(get_current_admin), db: Session = Depends(get_admin_db)):
    if not _asset_is_allowlisted(payload.asset_path):
        raise HTTPException(status_code=422, detail="This gallery asset is not present in the checked-in asset manifest.")
    if db.get(GalleryCategory, payload.category_id) is None:
        raise HTTPException(status_code=422, detail="Gallery category not found.")
    if _duplicate_item(db, payload):
        raise HTTPException(status_code=409, detail="This gallery asset is already registered.")
    item = GalleryItem(**payload.model_dump())
    db.add(item)
    try:
        db.commit()
        db.refresh(item)
        return item
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Gallery asset already exists.") from error
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=503, detail="Gallery item could not be saved.") from error


@router.patch("/items/{item_id}", response_model=GalleryItemResponse)
def update_gallery_item(item_id: int, payload: GalleryItemPayload, _admin=Depends(get_current_admin), db: Session = Depends(get_admin_db)):
    item = db.get(GalleryItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Gallery item not found.")
    if db.get(GalleryCategory, payload.category_id) is None:
        raise HTTPException(status_code=422, detail="Gallery category not found.")
    if not _asset_is_allowlisted(payload.asset_path):
        raise HTTPException(status_code=422, detail="This gallery asset is not present in the checked-in asset manifest.")
    if _duplicate_item(db, payload, item_id):
        raise HTTPException(status_code=409, detail="This gallery asset is already registered.")
    for field, value in payload.model_dump().items():
        setattr(item, field, value)
    try:
        db.commit()
        db.refresh(item)
        return item
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=503, detail="Gallery item could not be updated.") from error


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gallery_item(item_id: int, _admin=Depends(get_current_admin), db: Session = Depends(get_admin_db)):
    item = db.get(GalleryItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Gallery item not found.")
    db.delete(item)
    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=503, detail="Gallery item could not be deleted.") from error
