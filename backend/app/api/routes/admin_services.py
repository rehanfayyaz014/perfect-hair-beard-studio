from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_admin
from app.db.admin_session import get_admin_db
from app.db.models import Service, ServiceCategory

router = APIRouter(prefix="/admin/services", tags=["admin-services"])


class ServicePayload(BaseModel):
    category_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=160)
    slug: str = Field(min_length=1, max_length=180, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    currency: str = Field(default="PKR", min_length=3, max_length=3)
    display_order: int = Field(default=0, ge=0)
    is_active: bool = True

    @field_validator("name", "slug", "currency")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value cannot be blank.")
        return value


class ServiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    category_name: str
    category_slug: str
    name: str
    slug: str
    price: Decimal
    currency: str
    display_order: int
    is_active: bool


def _response(service: Service) -> ServiceResponse:
    return ServiceResponse(
        id=service.id,
        category_id=service.category_id,
        category_name=service.category.name,
        category_slug=service.category.slug,
        name=service.name,
        slug=service.slug,
        price=service.price,
        currency=service.currency,
        display_order=service.display_order,
        is_active=service.is_active,
    )


def _duplicate_service_query(db: Session, payload: ServicePayload, service_id: int | None = None):
    query = select(Service).where(
        (func.lower(Service.name) == payload.name.lower()) | (Service.slug == payload.slug)
    )
    if service_id is not None:
        query = query.where(Service.id != service_id)
    return db.scalar(query)


def _get_category(db: Session, category_id: int) -> ServiceCategory:
    category = db.get(ServiceCategory, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Category not found.")
    return category


@router.get("", response_model=list[ServiceResponse])
def list_admin_services(
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
) -> list[ServiceResponse]:
    rows = db.scalars(
        select(Service)
        .join(ServiceCategory)
        .order_by(ServiceCategory.display_order, Service.display_order, Service.id)
    ).all()
    return [_response(service) for service in rows]


@router.get("/{service_id}", response_model=ServiceResponse)
def get_admin_service(
    service_id: int,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
) -> ServiceResponse:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
    return _response(service)


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
def create_service(
    payload: ServicePayload,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
) -> ServiceResponse:
    category = _get_category(db, payload.category_id)
    if _duplicate_service_query(db, payload):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Service name or slug already exists.")

    service = Service(**payload.model_dump())
    service.category = category
    db.add(service)
    try:
        db.commit()
        db.refresh(service)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Service slug already exists.") from error
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service could not be saved.") from error
    return _response(service)


@router.patch("/{service_id}", response_model=ServiceResponse)
def update_service(
    service_id: int,
    payload: ServicePayload,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
) -> ServiceResponse:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
    category = _get_category(db, payload.category_id)
    if _duplicate_service_query(db, payload, service_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Service name or slug already exists.")

    for field, value in payload.model_dump().items():
        setattr(service, field, value)
    service.category = category
    try:
        db.commit()
        db.refresh(service)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Service slug already exists.") from error
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service could not be updated.") from error
    return _response(service)


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    service_id: int,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
) -> None:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")

    db.delete(service)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Service could not be deleted.") from error
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service could not be deleted.") from error
