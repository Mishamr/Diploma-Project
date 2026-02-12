#!/usr/bin/env python3
"""
Fiscus — one-shot scraping runner.

Iterates category URLs, picks the right scraper via Factory,
scrapes products, and upserts them into the Django database
(PostgreSQL) so they are immediately available via the API.

Usage:
    cd fiscus_project/backend
    python -m apps.scraper.main
"""

import logging
import os
import sys
from datetime import datetime
from urllib.parse import urlparse

# ─── Django bootstrap (needed when running as standalone script) ──────
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402
django.setup()

from django.db import transaction  # noqa: E402

from apps.core.models import Store, Product, StoreItem, Price  # noqa: E402
from apps.scraper.stores import ScraperFactory  # noqa: E402

# ─── Logging ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("fiscus.main")

# ─── Category URLs ───────────────────────────────────────────────────
CATEGORY_URLS = [
    # ATB
    "https://www.atbmarket.com/catalog/300-molochni-produkti-yaycya",
    "https://www.atbmarket.com/catalog/302-hlibobulochni-virobi",
    "https://www.atbmarket.com/catalog/306-m-yaso-kovbasi",
    "https://www.atbmarket.com/catalog/303-krupi-makaroni-boroshno",
    # Silpo
    "https://silpo.ua/category/molocni-produkti-ta-yajcya-318",
    "https://silpo.ua/category/hlibobulochni-virobi-320",
    "https://silpo.ua/category/myaso-ta-kovbasy-316",
    # Novus
    "https://novus.online/category/molocna-produkciya",
    "https://novus.online/category/hlibobulochni-virobi",
    # Varus  (uncomment when URLs confirmed)
    # "https://varus.ua/catalog/dairy",
    # Auchan
    # "https://auchan.ua/ua/supermarket/molocni-produkti/",
    # Metro
    # "https://metro.zakaz.ua/uk/categories/dairy/",
    # Fozzy
    # "https://fozzyshop.ua/molochnye-produkty/",
    # MegaMarket
    # "https://megamarket.ua/catalog/molocni-produkti",
    # Eko
    # "https://eko.com.ua/molochnye-produkty/",
    # Fora
    # "https://fora.ua/catalog/molocni-produkti",
]

# ─── Store name → base URL mapping ───────────────────────────────────
_STORE_URLS: dict[str, str] = {}


def _base_url(url: str) -> str:
    """Extract 'https://domain.com' from a full URL."""
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"


def upsert_product_django(data: dict) -> None:
    """
    Insert or update a scraped product into Django ORM models.

    Creates/updates: Store → Product → StoreItem, and appends a Price
    history record so the frontend can show price trends.

    Parameters
    ----------
    data : dict
        Required keys: store_name, name, price, product_url
        Optional keys: image_url
    """
    store_name: str = data["store_name"]
    product_name: str = data["name"]
    price: float = data["price"]
    product_url: str = data["product_url"]
    image_url: str = data.get("image_url", "")

    if price is None or price <= 0:
        raise ValueError(f"Invalid price: {price} for '{product_name}'")

    # Resolve store base URL (cache per store_name for this run)
    if store_name not in _STORE_URLS:
        _STORE_URLS[store_name] = _base_url(product_url)

    with transaction.atomic():
        # 1. Store
        store, _ = Store.objects.get_or_create(
            name=store_name,
            defaults={"url_base": _STORE_URLS[store_name]},
        )

        # 2. Product (global catalog entry)
        product, created = Product.objects.get_or_create(
            name=product_name,
            defaults={"image_url": image_url},
        )
        # Update image if product had none
        if not created and not product.image_url and image_url:
            product.image_url = image_url
            product.save(update_fields=["image_url"])

        # 3. StoreItem (price per store)
        StoreItem.objects.update_or_create(
            store=store,
            product=product,
            defaults={
                "price": price,
                "url": product_url,
            },
        )

        # 4. Price history (for charts / promotions detection)
        Price.objects.create(
            product=product,
            store_name=store_name,
            price_value=price,
        )


def run():
    """Main entry point."""
    logger.info("=" * 60)
    logger.info("Fiscus Scraper — %s", datetime.now().strftime("%Y-%m-%d %H:%M"))
    logger.info("Registered stores: %s", ", ".join(ScraperFactory.supported_stores()))
    logger.info("=" * 60)

    factory = ScraperFactory()

    total_scraped = 0
    total_saved = 0
    failed_urls: list[str] = []

    for idx, url in enumerate(CATEGORY_URLS, 1):
        logger.info("─" * 50)
        logger.info("[%d/%d] %s", idx, len(CATEGORY_URLS), url)

        try:
            scraper = factory.get_scraper(url)
        except ValueError as exc:
            logger.error("  ✗ No scraper: %s", exc)
            failed_urls.append(url)
            continue

        try:
            products = scraper.scrape_category(url)
        except Exception as exc:
            logger.error("  ✗ Scrape failed: %s", exc, exc_info=True)
            failed_urls.append(url)
            continue

        if not products:
            logger.warning("  ⚠ 0 products (selectors outdated?)")
            continue

        saved = 0
        for p in products:
            try:
                upsert_product_django(p)
                saved += 1
            except (KeyError, ValueError) as exc:
                logger.warning("  ✗ Bad data for '%s': %s", p.get("name", "?"), exc)
            except Exception as exc:
                logger.warning("  ✗ DB error for '%s': %s", p.get("name", "?"), exc)

        total_scraped += len(products)
        total_saved += saved
        logger.info("  ✓ Scraped %d, saved %d", len(products), saved)

    logger.info("=" * 60)
    logger.info("DONE  │  Scraped: %d  │  Saved: %d  │  Failed URLs: %d",
                total_scraped, total_saved, len(failed_urls))
    if failed_urls:
        for u in failed_urls:
            logger.info("  FAILED: %s", u)
    logger.info("=" * 60)


if __name__ == "__main__":
    run()
