"""
Celery tasks for scraping.
Використовує ScraperFactory для запуску скреперів.
"""

import logging
import time

from celery import shared_task
from django.utils import timezone

from .stores import ScraperFactory

logger = logging.getLogger(__name__)


@shared_task(bind=True, queue='scraper', max_retries=3, default_retry_delay=300)
def scrape_chain(self, chain_slug: str, shop_id: str = "1"):
    """
    Scrape all categories for a specific chain.
    Uses ScraperFactory to get the right scraper.
    """
    start = time.time()

    try:
        scraper = ScraperFactory.get_scraper(chain_slug, shop_id=shop_id)
        scraper.scrape()
        scraper.close()

        duration = round(time.time() - start, 2)
        logger.info(f"[Task] {chain_slug}: завершено за {duration}s")

        return {
            'chain': chain_slug,
            'duration_sec': duration,
            'status': 'success',
        }

    except Exception as e:
        logger.error(f"[Task] {chain_slug} failed: {e}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)
        return {'chain': chain_slug, 'error': str(e)}


@shared_task(queue='scraper')
def scrape_all_nightly():
    """
    Nightly task: запуск скреперів для всіх зареєстрованих мереж.
    Runs at 02:00 via Celery Beat.
    """
    available = ScraperFactory.get_available_chains()
    dispatched = 0

    for slug in available:
        scrape_chain.delay(slug)
        dispatched += 1

    logger.info(f"[Nightly] Відправлено {dispatched} задач")
    return {'dispatched': dispatched, 'timestamp': timezone.now().isoformat()}
