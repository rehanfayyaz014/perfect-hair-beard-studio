from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class CategorySeed:
    name: str
    slug: str
    display_order: int


@dataclass(frozen=True)
class ServiceSeed:
    name: str
    slug: str
    category_slug: str
    price: Decimal
    display_order: int


@dataclass(frozen=True)
class DealItemSeed:
    label: str
    display_order: int
    service_slug: str | None = None


@dataclass(frozen=True)
class DealSeed:
    name: str
    slug: str
    price: Decimal
    display_order: int
    items: tuple[DealItemSeed, ...]


CATEGORY_SEEDS = (
    CategorySeed("Hair Services", "hair-services", 0),
    CategorySeed("Beard Services", "beard-services", 1),
    CategorySeed("Hair Colour", "hair-colour", 2),
    CategorySeed("Face Facial", "face-facial", 3),
)

SERVICE_SEEDS = (
    ServiceSeed("Men's Haircut", "mens-haircut", "hair-services", Decimal("500"), 0),
    ServiceSeed("Fade Cut", "fade-cut", "hair-services", Decimal("600"), 1),
    ServiceSeed("Baby Haircut", "baby-haircut", "hair-services", Decimal("500"), 2),
    ServiceSeed("Certain Hair Mask", "certain-hair-mask", "hair-services", Decimal("2500"), 3),
    ServiceSeed("Hair Straightening Reg", "hair-straightening-reg", "hair-services", Decimal("1000"), 4),
    ServiceSeed("Hair Straightening Prem", "hair-straightening-prem", "hair-services", Decimal("2000"), 5),
    ServiceSeed("Regular Beard", "regular-beard", "beard-services", Decimal("300"), 0),
    ServiceSeed("Fade Beard", "fade-beard", "beard-services", Decimal("350"), 1),
    ServiceSeed("Beard Color Reg", "beard-color-reg", "beard-services", Decimal("300"), 2),
    ServiceSeed("Beard Color Prem", "beard-color-prem", "beard-services", Decimal("500"), 3),
    ServiceSeed("Keune Colour", "keune-colour", "hair-colour", Decimal("2000"), 0),
    ServiceSeed("Freecia Colour (Eng)", "freecia-colour-eng", "hair-colour", Decimal("2000"), 1),
    ServiceSeed("Koko Colour (UAE)", "koko-colour-uae", "hair-colour", Decimal("2500"), 2),
    ServiceSeed("Olivia Colour", "olivia-colour", "hair-colour", Decimal("600"), 3),
    ServiceSeed("Colour Service", "colour-service", "hair-colour", Decimal("500"), 4),
    ServiceSeed("Face Cleansing", "face-cleansing", "face-facial", Decimal("1000"), 0),
    ServiceSeed("Gold Facial", "gold-facial", "face-facial", Decimal("5000"), 1),
    ServiceSeed("Derma Facial Reg", "derma-facial-reg", "face-facial", Decimal("3000"), 2),
    ServiceSeed("Derma Facial Prem", "derma-facial-prem", "face-facial", Decimal("6000"), 3),
    ServiceSeed("Black & Golden Mask", "black-and-golden-mask", "face-facial", Decimal("500"), 4),
)

DEAL_SEEDS = (
    DealSeed(
        "Gentleman's Complete",
        "gentlemans-complete",
        Decimal("999"),
        0,
        (
            DealItemSeed("Signature Haircut", 0),
            DealItemSeed("Beard Grooming", 1),
            DealItemSeed("Face Scrub", 2),
            DealItemSeed("Head Massage", 3),
            DealItemSeed("Head Wash", 4),
            DealItemSeed("Hair Styling", 5),
        ),
    ),
    DealSeed(
        "Hair Refresh",
        "hair-refresh",
        Decimal("699"),
        1,
        (
            DealItemSeed("Signature Haircut", 0),
            DealItemSeed("Head Massage", 1),
            DealItemSeed("Hair Styling", 2),
        ),
    ),
    DealSeed(
        "Beard Refresh",
        "beard-refresh",
        Decimal("599"),
        2,
        (
            DealItemSeed("Beard Grooming", 0),
            DealItemSeed("Beard Color", 1),
            DealItemSeed("Face Scrub", 2),
        ),
    ),
    DealSeed(
        "Beard & Glow",
        "beard-and-glow",
        Decimal("499"),
        3,
        (
            DealItemSeed("Beard Grooming", 0),
            DealItemSeed("Face Mask", 1),
            DealItemSeed("Face Threading", 2),
        ),
    ),
    DealSeed(
        "Facial Luxe",
        "facial-luxe",
        Decimal("1499"),
        4,
        (
            DealItemSeed("Premium Facial", 0),
            DealItemSeed("Beard Grooming", 1),
            DealItemSeed("Head Massage", 2),
        ),
    ),
)


def validate_seed_data() -> None:
    category_slugs = {category.slug for category in CATEGORY_SEEDS}
    service_slugs = [service.slug for service in SERVICE_SEEDS]
    deal_slugs = [deal.slug for deal in DEAL_SEEDS]

    if len(CATEGORY_SEEDS) != 4:
        raise ValueError("Expected exactly four service categories.")
    if len(SERVICE_SEEDS) != 20:
        raise ValueError("Expected exactly 20 services.")
    if len(DEAL_SEEDS) != 5:
        raise ValueError("Expected exactly five deals.")
    if sum(len(deal.items) for deal in DEAL_SEEDS) != 18:
        raise ValueError("Expected exactly 18 deal items.")
    if len(service_slugs) != len(set(service_slugs)):
        raise ValueError("Service slugs must be unique.")
    if len(deal_slugs) != len(set(deal_slugs)):
        raise ValueError("Deal slugs must be unique.")
    if any(service.category_slug not in category_slugs for service in SERVICE_SEEDS):
        raise ValueError("Every service must reference a known category slug.")
    if any(
        len({item.label for item in deal.items}) != len(deal.items)
        for deal in DEAL_SEEDS
    ):
        raise ValueError("Deal item labels must be unique within each deal.")
