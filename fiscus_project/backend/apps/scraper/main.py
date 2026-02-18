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
    "https://novus.ua/category/molocna-produkciya",
    "https://novus.ua/category/hlibobulochni-virobi",
    # Varus
    # "https://varus.ua/catalog/dairy",
    # Auchan
    # "https://auchan.ua/ua/supermarket/molocni-produkti/",
    # Metro
    # "https://www.metro.ua/promotions",
    # Fozzy
    # "https://fozzy.ua/molochnye-produkty/",
    # MegaMarket
    # "https://megamarket.ua/catalog/molocni-produkti",
    # Eko
    # "https://eko.com.ua/molochnye-produkty/",
    # Fora
    # "https://fora.ua/catalog/molocni-produkti",
]

from apps.scraper.services import ingest_scraped_data

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
                # Use centralized ingestion with validation
                result = ingest_scraped_data(p, p.get("store_name", scraper.STORE_NAME))
                if result:
                    saved += 1
            except Exception as exc:
                logger.warning("  ✗ Error processing '%s': %s", p.get("name", "?"), exc)

        total_scraped += len(products)
        total_saved += saved
        logger.info("  ✓ Scraped %d, ingested %d", len(products), saved)

    logger.info("=" * 60)
    logger.info("DONE  │  Scraped: %d  │  Saved: %d  │  Failed URLs: %d",
                total_scraped, total_saved, len(failed_urls))
    if failed_urls:
        for u in failed_urls:
            logger.info("  FAILED: %s", u)
    logger.info("=" * 60)


if __name__ == "__main__":
    run()
