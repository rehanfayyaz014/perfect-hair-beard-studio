from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.models import Deal, DealItem, Service, ServiceCategory
from app.db.session import get_db

router = APIRouter(prefix="/catalog", tags=["catalog"])


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    display_order: int
    is_active: bool


class ServiceResponse(BaseModel):
    id: int
    category_id: int
    category_slug: str
    name: str
    slug: str
    price: Decimal
    currency: str
    display_order: int
    is_active: bool


class DealResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    price: Decimal
    currency: str
    display_order: int
    is_active: bool


class DealItemResponse(BaseModel):
    id: int
    deal_id: int
    deal_slug: str
    service_id: int | None
    label: str
    display_order: int


def _database_error() -> HTTPException:
    return HTTPException(
        status_code=503,
        detail="Catalog is temporarily unavailable. Please try again shortly.",
    )


@router.get("/categories", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_db)) -> list[CategoryResponse]:
    try:
        categories = db.scalars(
            select(ServiceCategory)
            .where(ServiceCategory.is_active.is_(True))
            .order_by(ServiceCategory.display_order, ServiceCategory.id)
        ).all()
        return [CategoryResponse.model_validate(category) for category in categories]
    except SQLAlchemyError as error:
        db.rollback()
        raise _database_error() from error


@router.get("/services", response_model=list[ServiceResponse])
def list_services(db: Session = Depends(get_db)) -> list[ServiceResponse]:
    try:
        rows = db.execute(
            select(Service, ServiceCategory.slug)
            .join(ServiceCategory, Service.category_id == ServiceCategory.id)
            .where(Service.is_active.is_(True), ServiceCategory.is_active.is_(True))
            .order_by(ServiceCategory.display_order, Service.display_order, Service.id)
        ).all()
        return [
            ServiceResponse(
                id=service.id,
                category_id=service.category_id,
                category_slug=category_slug,
                name=service.name,
                slug=service.slug,
                price=service.price,
                currency=service.currency,
                display_order=service.display_order,
                is_active=service.is_active,
            )
            for service, category_slug in rows
        ]
    except SQLAlchemyError as error:
        db.rollback()
        raise _database_error() from error


@router.get("/deals", response_model=list[DealResponse])
def list_deals(db: Session = Depends(get_db)) -> list[DealResponse]:
    try:
        deals = db.scalars(
            select(Deal)
            .where(Deal.is_active.is_(True))
            .order_by(Deal.display_order, Deal.id)
        ).all()
        return [DealResponse.model_validate(deal) for deal in deals]
    except SQLAlchemyError as error:
        db.rollback()
        raise _database_error() from error


@router.get("/deal-items", response_model=list[DealItemResponse])
def list_deal_items(db: Session = Depends(get_db)) -> list[DealItemResponse]:
    try:
        rows = db.execute(
            select(DealItem, Deal.slug)
            .join(Deal, DealItem.deal_id == Deal.id)
            .where(Deal.is_active.is_(True))
            .order_by(Deal.display_order, DealItem.display_order, DealItem.id)
        ).all()
        return [
            DealItemResponse(
                id=item.id,
                deal_id=item.deal_id,
                deal_slug=deal_slug,
                service_id=item.service_id,
                label=item.label,
                display_order=item.display_order,
            )
            for item, deal_slug in rows
        ]
    except SQLAlchemyError as error:
        db.rollback()
        raise _database_error() from error
