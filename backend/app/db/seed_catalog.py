from collections import Counter

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.migration_credentials import get_migrator_database_url
from app.db.models import Deal, DealItem, Service, ServiceCategory
from app.db.seed_data import (
    CATEGORY_SEEDS,
    DEAL_SEEDS,
    SERVICE_SEEDS,
    DealItemSeed,
    validate_seed_data,
)
from app.db.session import get_session_factory


def _seed_categories(session: Session) -> dict[str, ServiceCategory]:
    categories: dict[str, ServiceCategory] = {}

    for seed in CATEGORY_SEEDS:
        category = session.scalar(select(ServiceCategory).where(ServiceCategory.slug == seed.slug))
        if category is None:
            category = ServiceCategory(slug=seed.slug)
            session.add(category)

        category.name = seed.name
        category.display_order = seed.display_order
        category.is_active = True
        categories[seed.slug] = category

    session.flush()
    return categories


def _seed_services(
    session: Session,
    categories: dict[str, ServiceCategory],
) -> dict[str, Service]:
    services: dict[str, Service] = {}

    for seed in SERVICE_SEEDS:
        service = session.scalar(select(Service).where(Service.slug == seed.slug))
        if service is None:
            service = Service(slug=seed.slug)
            session.add(service)

        service.category = categories[seed.category_slug]
        service.name = seed.name
        service.price = seed.price
        service.currency = "PKR"
        service.display_order = seed.display_order
        service.is_active = True
        services[seed.slug] = service

    session.flush()
    return services


def _seed_deal_items(
    session: Session,
    deal: Deal,
    labels: tuple[DealItemSeed, ...],
    services: dict[str, Service],
) -> None:
    existing_items = session.scalars(select(DealItem).where(DealItem.deal_id == deal.id)).all()
    duplicate_labels = [label for label, count in Counter(item.label for item in existing_items).items() if count > 1]
    if duplicate_labels:
        raise RuntimeError(
            f"Duplicate deal-item labels found for deal {deal.slug}: {', '.join(sorted(duplicate_labels))}"
        )

    existing_by_label = {item.label: item for item in existing_items}
    for seed in labels:
        item = existing_by_label.get(seed.label)
        if item is None:
            item = DealItem(deal=deal, label=seed.label)
            session.add(item)

        service = None
        if seed.service_slug is not None:
            service = services.get(seed.service_slug)
            if service is None:
                raise RuntimeError(
                    f"Deal item {seed.label!r} references unknown service slug "
                    f"{seed.service_slug!r}."
                )

        item.display_order = seed.display_order
        item.service_id = service.id if service is not None else None


def _seed_deals(session: Session, services: dict[str, Service]) -> None:
    for seed in DEAL_SEEDS:
        deal = session.scalar(select(Deal).where(Deal.slug == seed.slug))
        if deal is None:
            deal = Deal(slug=seed.slug)
            session.add(deal)

        deal.name = seed.name
        deal.price = seed.price
        deal.currency = "PKR"
        deal.display_order = seed.display_order
        deal.is_active = True
        session.flush()
        _seed_deal_items(session, deal, seed.items, services)


def seed_catalog(factory: sessionmaker[Session] | None = None) -> None:
    """Create or reconcile the confirmed catalog in one transaction."""
    validate_seed_data()
    session_factory = factory or get_session_factory()

    with session_factory.begin() as session:
        categories = _seed_categories(session)
        services = _seed_services(session, categories)
        _seed_deals(session, services)


def seed_catalog_as_migrator() -> None:
    """Run the catalog seed transaction with the vault-backed migrator role."""
    engine = create_engine(get_migrator_database_url(), pool_pre_ping=True)
    try:
        factory = sessionmaker(
            bind=engine,
            autoflush=False,
            autocommit=False,
        )
        seed_catalog(factory)
    finally:
        engine.dispose()


if __name__ == "__main__":
    seed_catalog_as_migrator()
