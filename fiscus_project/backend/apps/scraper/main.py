"""
Scraper main runner.

Використання:
    from apps.scraper.main import run_scraper, run_all
    run_scraper('atb')           # одна мережа
    run_all()                    # всі зареєстровані мережі
"""

import sys
import logging
from .stores import ScraperFactory

logger = logging.getLogger(__name__)


def run_scraper(chain_slug: str, shop_id: str = "1"):
    """
    Запуск скрепера для однієї мережі.

    Args:
        chain_slug: ідентифікатор мережі ('atb', ...)
        shop_id: ID магазину
    """
    logger.info(f"── Запуск скрепера: {chain_slug} ──")
    scraper = ScraperFactory.get_scraper(chain_slug, shop_id=shop_id)
    try:
        scraper.scrape()
        # Clean up items that were not seen during this scrape
        from .services import cleanup_outdated_items
        cleanup_outdated_items(chain_slug)
    finally:
        scraper.close()


def run_all(shop_id: str = "1"):
    """Запуск усіх зареєстрованих скреперів."""
    ScraperFactory.run_all(shop_id=shop_id)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    if len(sys.argv) > 1:
        run_scraper(sys.argv[1])
    else:
        run_all()
