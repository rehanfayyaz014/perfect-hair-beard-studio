"""Read-only verification for the initial salon catalog."""

from sqlalchemy import create_engine, text

from app.core.migration_credentials import get_migrator_database_url
from app.db.seed_data import CATEGORY_SEEDS, DEAL_SEEDS, SERVICE_SEEDS


def verify_catalog() -> bool:
    engine = create_engine(get_migrator_database_url(), pool_pre_ping=True)
    try:
        with engine.connect() as connection, connection.begin():
            connection.exec_driver_sql("SET TRANSACTION READ ONLY")
            database, role = connection.execute(
                text("SELECT current_database(), current_user")
            ).one()

            counts = {
                "categories": connection.execute(text("SELECT COUNT(*) FROM service_categories")).scalar_one(),
                "services": connection.execute(text("SELECT COUNT(*) FROM services")).scalar_one(),
                "deals": connection.execute(text("SELECT COUNT(*) FROM deals")).scalar_one(),
                "deal_items": connection.execute(text("SELECT COUNT(*) FROM deal_items")).scalar_one(),
            }
            deal_counts = dict(
                connection.execute(
                    text(
                        "SELECT d.slug, COUNT(di.id) "
                        "FROM deals AS d LEFT JOIN deal_items AS di ON di.deal_id = d.id "
                        "GROUP BY d.slug ORDER BY d.slug"
                    )
                ).all()
            )

            categories = connection.execute(
                text("SELECT name, slug FROM service_categories")
            ).all()
            services = connection.execute(
                text(
                    "SELECT s.name, s.slug, s.price, c.slug AS category_slug "
                    "FROM services AS s LEFT JOIN service_categories AS c ON c.id = s.category_id"
                )
            ).all()
            deals = connection.execute(text("SELECT name, slug, price FROM deals")).all()
            items = connection.execute(
                text(
                    "SELECT d.slug AS deal_slug, di.label FROM deal_items AS di "
                    "JOIN deals AS d ON d.id = di.deal_id"
                )
            ).all()

            duplicate_checks = {
                "category slugs": connection.execute(
                    text("SELECT COUNT(*) FROM (SELECT slug FROM service_categories GROUP BY slug HAVING COUNT(*) > 1) q")
                ).scalar_one(),
                "service slugs": connection.execute(
                    text("SELECT COUNT(*) FROM (SELECT slug FROM services GROUP BY slug HAVING COUNT(*) > 1) q")
                ).scalar_one(),
                "service names": connection.execute(
                    text("SELECT COUNT(*) FROM (SELECT name FROM services GROUP BY name HAVING COUNT(*) > 1) q")
                ).scalar_one(),
                "deal slugs": connection.execute(
                    text("SELECT COUNT(*) FROM (SELECT slug FROM deals GROUP BY slug HAVING COUNT(*) > 1) q")
                ).scalar_one(),
                "deal names": connection.execute(
                    text("SELECT COUNT(*) FROM (SELECT name FROM deals GROUP BY name HAVING COUNT(*) > 1) q")
                ).scalar_one(),
                "duplicate item labels within deals": connection.execute(
                    text(
                        "SELECT COUNT(*) FROM (SELECT deal_id, label FROM deal_items "
                        "GROUP BY deal_id, label HAVING COUNT(*) > 1) q"
                    )
                ).scalar_one(),
            }
            invalid_category_refs = connection.execute(
                text(
                    "SELECT COUNT(*) FROM services AS s LEFT JOIN service_categories AS c "
                    "ON c.id = s.category_id WHERE c.id IS NULL"
                )
            ).scalar_one()
            invalid_deal_refs = connection.execute(
                text(
                    "SELECT COUNT(*) FROM deal_items AS di LEFT JOIN deals AS d ON d.id = di.deal_id "
                    "WHERE d.id IS NULL"
                )
            ).scalar_one()
            invalid_optional_service_refs = connection.execute(
                text(
                    "SELECT COUNT(*) FROM deal_items AS di LEFT JOIN services AS s ON s.id = di.service_id "
                    "WHERE di.service_id IS NOT NULL AND s.id IS NULL"
                )
            ).scalar_one()

        expected_categories = {(row.name, row.slug) for row in CATEGORY_SEEDS}
        expected_services = {
            (row.name, row.slug, row.price, row.category_slug) for row in SERVICE_SEEDS
        }
        expected_deals = {(row.name, row.slug, row.price) for row in DEAL_SEEDS}
        expected_items = {
            (deal.slug, item.label)
            for deal in DEAL_SEEDS
            for item in deal.items
        }
        expected_counts = {"categories": 4, "services": 20, "deals": 5, "deal_items": 18}
        expected_deal_counts = {deal.slug: len(deal.items) for deal in DEAL_SEEDS}
        actual_sets = {
            "categories": {(row.name, row.slug) for row in categories},
            "services": {(row.name, row.slug, row.price, row.category_slug) for row in services},
            "deals": {(row.name, row.slug, row.price) for row in deals},
            "deal_items": {(row.deal_slug, row.label) for row in items},
        }
        expected_sets = {
            "categories": expected_categories,
            "services": expected_services,
            "deals": expected_deals,
            "deal_items": expected_items,
        }
        no_duplicates = all(count == 0 for count in duplicate_checks.values())
        relationships_valid = not (invalid_category_refs or invalid_deal_refs or invalid_optional_service_refs)
        matched_catalog = all(actual_sets[key] == expected_sets[key] for key in expected_sets)
        succeeded = (
            counts == expected_counts
            and deal_counts == expected_deal_counts
            and no_duplicates
            and relationships_valid
            and matched_catalog
        )

        print(f"DATABASE={database}")
        print(f"ROLE={role}")
        for name, count in counts.items():
            print(f"{name.upper()}={count}")
        print("DEAL_ITEM_COUNTS=" + ", ".join(f"{slug}:{count}" for slug, count in sorted(deal_counts.items())))
        print("DUPLICATE_GROUPS=" + str(duplicate_checks))
        print(
            "INVALID_RELATIONSHIPS="
            f"categories:{invalid_category_refs}, deals:{invalid_deal_refs}, optional_services:{invalid_optional_service_refs}"
        )
        print(f"CATALOG_MATCHES_SEED_DEFINITIONS={matched_catalog}")
        print(f"VERIFICATION={'PASSED' if succeeded else 'FAILED'}")
        return succeeded
    finally:
        engine.dispose()


if __name__ == "__main__":
    raise SystemExit(0 if verify_catalog() else 1)
