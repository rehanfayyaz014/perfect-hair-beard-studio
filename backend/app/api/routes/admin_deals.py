from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies.auth import get_current_admin
from app.db.admin_session import get_admin_db
from app.db.models import Deal, DealItem, Service

router = APIRouter(prefix="/admin/deals", tags=["admin-deals"])


class DealItemPayload(BaseModel):
    id: int | None = Field(default=None, gt=0)
    label: str = Field(min_length=1, max_length=200)
    service_id: int | None = Field(default=None, gt=0)
    display_order: int = Field(default=0, ge=0)

    @field_validator("label")
    @classmethod
    def strip_label(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Item label cannot be blank.")
        return value


class DealPayload(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    slug: str = Field(min_length=1, max_length=180, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    currency: str = Field(default="PKR", min_length=3, max_length=3)
    display_order: int = Field(default=0, ge=0)
    is_active: bool = True
    items: list[DealItemPayload] = Field(default_factory=list, max_length=50)

    @field_validator("name", "slug", "currency")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value cannot be blank.")
        return value


class DealItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    service_id: int | None
    display_order: int


class DealResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    price: Decimal
    currency: str
    display_order: int
    is_active: bool
    items: list[DealItemResponse]


def _response(deal: Deal) -> DealResponse:
    return DealResponse(
        id=deal.id,
        name=deal.name,
        slug=deal.slug,
        price=deal.price,
        currency=deal.currency,
        display_order=deal.display_order,
        is_active=deal.is_active,
        items=[DealItemResponse.model_validate(item) for item in deal.items],
    )


def _validate_items(db: Session, items: list[DealItemPayload]) -> None:
    labels = [item.label.casefold() for item in items]
    if len(labels) != len(set(labels)):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Deal item labels must be unique.")
    service_ids = {item.service_id for item in items if item.service_id is not None}
    if service_ids:
        existing_ids = set(db.scalars(select(Service.id).where(Service.id.in_(service_ids))).all())
        if existing_ids != service_ids:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="One or more linked services were not found.")


def _duplicate_deal_query(db: Session, payload: DealPayload, deal_id: int | None = None):
    query = select(Deal).where(
        (func.lower(Deal.name) == payload.name.lower()) | (Deal.slug == payload.slug)
    )
    if deal_id is not None:
        query = query.where(Deal.id != deal_id)
    return db.scalar(query)


def _get_deal(db: Session, deal_id: int) -> Deal:
    deal = db.scalar(
        select(Deal).where(Deal.id == deal_id).options(selectinload(Deal.items))
    )
    if deal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found.")
    return deal


@router.get("", response_model=list[DealResponse])
def list_admin_deals(
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
) -> list[DealResponse]:
    deals = db.scalars(
        select(Deal).options(selectinload(Deal.items)).order_by(Deal.display_order, Deal.id)
    ).all()
    return [_response(deal) for deal in deals]


@router.get("/{deal_id}", response_model=DealResponse)
def get_admin_deal(
    deal_id: int,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
) -> DealResponse:
    return _response(_get_deal(db, deal_id))


@router.post("", response_model=DealResponse, status_code=status.HTTP_201_CREATED)
def create_deal(
    payload: DealPayload,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
) -> DealResponse:
    if _duplicate_deal_query(db, payload):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Deal name or slug already exists.")
    _validate_items(db, payload.items)
    deal = Deal(**payload.model_dump(exclude={"items"}))
    deal.items = [DealItem(**item.model_dump(exclude={"id"})) for item in payload.items]
    db.add(deal)
    try:
        db.commit()
        db.refresh(deal)
        deal = _get_deal(db, deal.id)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Deal slug or item data already exists.") from error
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Deal could not be saved.") from error
    return _response(deal)


@router.patch("/{deal_id}", response_model=DealResponse)
def update_deal(
    deal_id: int,
    payload: DealPayload,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
) -> DealResponse:
    deal = _get_deal(db, deal_id)
    if _duplicate_deal_query(db, payload, deal_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Deal name or slug already exists.")
    _validate_items(db, payload.items)

    existing_items = {item.id: item for item in deal.items}
    incoming_ids = {item.id for item in payload.items if item.id is not None}
    if not incoming_ids.issubset(existing_items):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="One or more deal items do not belong to this deal.")

    for field, value in payload.model_dump(exclude={"items"}).items():
        setattr(deal, field, value)
    for item_payload in payload.items:
        if item_payload.id is None:
            deal.items.append(DealItem(**item_payload.model_dump(exclude={"id"})))
        else:
            item = existing_items[item_payload.id]
            item.label = item_payload.label
            item.service_id = item_payload.service_id
            item.display_order = item_payload.display_order
    for item_id, item in existing_items.items():
        if item_id not in incoming_ids:
            db.delete(item)
    try:
        db.commit()
        deal = _get_deal(db, deal_id)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Deal slug or item data already exists.") from error
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Deal could not be updated.") from error
    return _response(deal)


@router.delete("/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deal(
    deal_id: int,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
) -> None:
    deal = _get_deal(db, deal_id)
    db.delete(deal)
    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Deal could not be deleted.") from error
