from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.db.models import GalleryCategory, GalleryItem
from app.db.session import get_db

router = APIRouter(prefix="/gallery", tags=["gallery"])


class GalleryCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    display_order: int


class GalleryItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_path: str
    title: str | None
    caption: str | None
    alt_text: str
    display_order: int
    category: GalleryCategoryResponse


@router.get("", response_model=list[GalleryItemResponse])
def list_published_gallery(db: Session = Depends(get_db)) -> list[GalleryItemResponse]:
    try:
        items = db.scalars(
            select(GalleryItem)
            .join(GalleryCategory)
            .where(GalleryItem.is_published.is_(True), GalleryCategory.is_active.is_(True))
            .options(selectinload(GalleryItem.category))
            .order_by(GalleryCategory.display_order, GalleryItem.display_order, GalleryItem.id)
        ).all()
        return [GalleryItemResponse.model_validate(item) for item in items]
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=503, detail="Gallery is temporarily unavailable.") from error
