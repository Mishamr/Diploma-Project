"""
Celery tasks for Fiscus scraping operations.

This module defines asynchronous tasks for scraping
product prices from external store websites.

Tasks are designed to be:
    - Idempotent (safe to retry)
    - Rate-limited to avoid blocking
    - Resilient to individual failures
"""
import logging
from typing import Optional

from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
from django.db import transaction

from apps.core.models import StoreItem
from apps.scraper.engine import ATBScraper, SilpoScraper

logger = logging.getLogger(__name__)

# Scraper configuration
SCRAPER_MAP = {
    "atb": ATBScraper,
    "silpo": SilpoScraper,
}


def _get_scraper_for_store_item(item: StoreItem):
    """
    Select appropriate scraper based on store URL or name.
    
    Routing logic:
        - ATB: matches "atbmarket" in URL or "atb" in name
        - Silpo: matches "silpo" in URL or "сільпо" in name
        - Default: ATB scraper
    
    Args:
        item: StoreItem with associated store.
    
    Returns:
        Scraper instance for the store.
    """
    url_base = (item.store.url_base or "").lower()
    store_name = item.store.name.lower()

    if "atbmarket" in url_base or "atb" in store_name:
        return ATBScraper()
    
    if "silpo" in url_base or "сільпо" in store_name:
        return SilpoScraper()

    # Default fallback
    logger.warning(
        f"No specific scraper for store '{item.store.name}', using ATB"
    )
    return ATBScraper()


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    soft_time_limit=120,
    time_limit=180
)
def scrape_store_item_task(self, store_item_id: int) -> str:
    """
    Scrape a single store item and update its price.
    
    This task:
        1. Fetches the StoreItem from database
        2. Selects appropriate scraper
        3. Scrapes the product page
        4. Updates the price if successful
    
    Args:
        store_item_id: Database ID of the StoreItem to scrape.
    
    Returns:
        Status message describing the result.
    
    Retry Policy:
        - Max 3 retries with 60s delay
        - Soft time limit: 2 minutes
        - Hard time limit: 3 minutes
    """
    logger.info(f"Starting scrape task for StoreItem {store_item_id}")

    try:
        item = StoreItem.objects.select_related(
            "store", "product"
        ).get(id=store_item_id)
    except StoreItem.DoesNotExist:
        logger.error(f"StoreItem {store_item_id} not found")
        return f"StoreItem {store_item_id} not found"

    if not item.url:
        logger.warning(f"StoreItem {store_item_id} has no URL")
        return f"StoreItem {store_item_id}: No URL provided"

    scraper = _get_scraper_for_store_item(item)

    try:
        result = scraper.scrape_product(item.url)
        
        if result.get("status") == "success" and result.get("price"):
            with transaction.atomic():
                item.price = result["price"]
                item.save(update_fields=["price", "updated_at"])
            
            message = (
                f"Updated {item.product.name} @ {item.store.name}: "
                f"{item.price} UAH"
            )
            logger.info(message)
            return message

        error_msg = result.get("error", "Unknown error")
        logger.warning(
            f"Scrape failed for {item.product.name}: {error_msg}"
        )
        
        # Retry on transient errors
        if "timeout" in error_msg.lower():
            raise self.retry(exc=Exception(error_msg))
        
        return f"Failed: {item.product.name} - {error_msg}"

    except SoftTimeLimitExceeded:
        logger.error(f"Scrape task timed out for item {store_item_id}")
        raise self.retry(exc=SoftTimeLimitExceeded())

    except Exception as e:
        logger.exception(f"Unexpected error scraping item {store_item_id}")
        
        # Check if we should retry
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)
        
        return f"Error after retries: {str(e)}"


@shared_task(
    soft_time_limit=3600,
    time_limit=3900
)
def scrape_all_items_periodic() -> str:
    """
    Queue scraping tasks for all StoreItem entries.
    
    Intended to be scheduled by Celery Beat (e.g., daily at 6 AM).
    
    This task acts as an orchestrator:
        - Fetches all items that need updating
        - Queues individual scrape tasks
        - Does not block on individual scrapes
    
    Returns:
        Summary message with count of queued items.
    """
    logger.info("Starting periodic scrape of all items")

    items = StoreItem.objects.filter(url__isnull=False).exclude(url="")
    total_count = items.count()

    if total_count == 0:
        logger.warning("No items with URLs to scrape")
        return "No items to scrape"

    queued_count = 0
    
    for item in items.iterator():
        try:
            # Queue with countdown to spread load
            countdown = queued_count * 2  # 2 seconds between each
            scrape_store_item_task.apply_async(
                args=[item.id],
                countdown=countdown
            )
            queued_count += 1
        except Exception as e:
            logger.error(f"Failed to queue scrape for item {item.id}: {e}")

    message = f"Queued {queued_count}/{total_count} items for scraping"
    logger.info(message)
    return message


@shared_task
def scrape_single_store(store_id: int) -> str:
    """
    Queue scraping tasks for all items from a specific store.
    
    Useful for manual refresh of a single store's prices.
    
    Args:
        store_id: Database ID of the Store.
    
    Returns:
        Summary message.
    """
    items = StoreItem.objects.filter(
        store_id=store_id,
        url__isnull=False
    ).exclude(url="")
    
    count = items.count()
    
    for idx, item in enumerate(items):
        scrape_store_item_task.apply_async(
            args=[item.id],
            countdown=idx * 2
        )
    
    return f"Queued {count} items from store {store_id}"
