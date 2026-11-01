from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_admin
from app.db.admin_session import get_admin_db
from app.db.models import Service, ServiceCategory

router = APIRouter(prefix="/admin/categories", tags=["admin-categories"])


class CategoryPayload(BaseModel):
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


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    display_order: int
    is_active: bool


def _duplicate_category_query(db: Session, category: ServiceCategory, payload: CategoryPayload):
    return db.scalar(
        select(ServiceCategory).where(
            ServiceCategory.id != category.id,
            (func.lower(ServiceCategory.name) == payload.name.lower())
            | (ServiceCategory.slug == payload.slug),
        )
    )


@router.get("", response_model=list[CategoryResponse])
def list_admin_categories(
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
) -> list[CategoryResponse]:
    categories = db.scalars(
        select(ServiceCategory).order_by(ServiceCategory.display_order, ServiceCategory.id)
    ).all()
    return [CategoryResponse.model_validate(category) for category in categories]


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryPayload,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
) -> CategoryResponse:
    duplicate = db.scalar(
        select(ServiceCategory).where(
            (func.lower(ServiceCategory.name) == payload.name.lower())
            | (ServiceCategory.slug == payload.slug)
        )
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category name or slug already exists.")

    category = ServiceCategory(**payload.model_dump())
    db.add(category)
    try:
        db.commit()
        db.refresh(category)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category slug already exists.") from error
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Category could not be saved.") from error
    return CategoryResponse.model_validate(category)


@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    payload: CategoryPayload,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
) -> CategoryResponse:
    category = db.get(ServiceCategory, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
    if _duplicate_category_query(db, category, payload):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category name or slug already exists.")

    for field, value in payload.model_dump().items():
        setattr(category, field, value)
    try:
        db.commit()
        db.refresh(category)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category slug already exists.") from error
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Category could not be updated.") from error
    return CategoryResponse.model_validate(category)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
) -> None:
    category = db.get(ServiceCategory, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    service_count = db.scalar(
        select(func.count(Service.id)).where(Service.category_id == category_id)
    ) or 0
    if service_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This category cannot be deleted because it contains services. "
                "Please delete its services first, or deactivate the category instead."
            ),
        )

    db.delete(category)
    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Category could not be deleted.") from error
