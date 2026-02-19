"""
Celery tasks for Fiscus scraping operations.

This module defines asynchronous tasks for scraping
product prices from external store websites.

Tasks are designed to be:
    - Idempotent (safe to retry)
    - Rate-limited to avoid blocking
    - Resilient to individual failures
    - Logged for real-time monitoring via admin panel
"""
import logging
from typing import Optional
from datetime import datetime

from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
from django.db import transaction
from django.utils import timezone

from apps.core.models import StoreItem, TaskLog, Store
from apps.scraper.stores import ScraperFactory
from apps.scraper.services import ingest_scraped_data

logger = logging.getLogger(__name__)

# Single factory instance — reads auto-discovered registry
_factory = ScraperFactory()


# ─── TASK LOGGING HELPERS ─────────────────────────────────────────────

def create_task_log(task_id: str, task_name: str, store: Optional[Store] = None, items_total: int = 0) -> TaskLog:
    """
    Create or get a TaskLog for tracking task progress.
    
    Args:
        task_id: Celery task ID
        task_name: Human-readable task name
        store: Optional Store object if store-specific
        items_total: Total items to process
    
    Returns:
        TaskLog instance
    """
    log, created = TaskLog.objects.get_or_create(
        task_id=task_id,
        defaults={
            'task_name': task_name,
            'store': store,
            'items_total': items_total,
            'status': 'started',
            'started_at': timezone.now(),
        }
    )
    
    if not created and log.status == 'pending':
        # Mark as started if was pending
        log.status = 'started'
        log.started_at = timezone.now()
        log.items_total = items_total or log.items_total
        log.save(update_fields=['status', 'started_at', 'items_total'])
    
    return log


def update_task_log(task_id: str, **kwargs):
    """
    Update TaskLog fields.
    
    Commonly used fields:
    - status: 'progress', 'completed', 'failed'
    - items_processed: int
    - items_failed: int
    - message: str
    - error_message: str
    - completed_at: datetime
    """
    try:
        log = TaskLog.objects.get(task_id=task_id)
        
        for field, value in kwargs.items():
            if hasattr(log, field):
                setattr(log, field, value)
        
        log.save()
        logger.debug(f"Updated TaskLog {task_id}: {kwargs}")
    except TaskLog.DoesNotExist:
        logger.warning(f"TaskLog {task_id} not found for update")


def _get_scraper_for_store_item(item: StoreItem):
    """
    Select appropriate scraper based on store URL.

    Uses the ScraperFactory to match the item URL domain
    to the correct scraper. Falls back to ATB if no match.

    Args:
        item: StoreItem with associated store.

    Returns:
        Scraper instance for the store.
    """
    if not item.url:
        return None

    try:
        return _factory.get_scraper(item.url)
    except ValueError:
        # Try using store's base URL if item URL didn't match
        url_base = getattr(item.store, "url_base", None) or ""
        if url_base:
            try:
                return _factory.get_scraper(url_base)
            except ValueError:
                pass

        logger.warning(
            "No scraper found for store '%s' (url=%s), skipping",
            f"{item.store.chain_name} ({item.store.address})", item.url,
        )
        return None


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
        2. Selects appropriate scraper via Factory
        3. Scrapes the product page
        4. Updates the price and product image if successful
    """
    logger.info("Starting scrape task for StoreItem %d", store_item_id)

    try:
        item = StoreItem.objects.select_related(
            "store", "product"
        ).get(id=store_item_id)
    except StoreItem.DoesNotExist:
        logger.error("StoreItem %d not found", store_item_id)
        return f"StoreItem {store_item_id} not found"

    if not item.url:
        logger.warning("StoreItem %d has no URL", store_item_id)
        return f"StoreItem {store_item_id}: No URL provided"

    scraper = _get_scraper_for_store_item(item)
    if scraper is None:
        return f"StoreItem {store_item_id}: No scraper available"

    try:
        result = scraper.scrape_product(item.url)

        if result.get("status") == "success" and result.get("price"):
            with transaction.atomic():
                # Update Price
                item.price = result["price"]
                item.save(update_fields=["price", "updated_at"])

                # Update Image if found and current is empty
                image_url = result.get("image_url")
                if image_url and not item.product.image_url:
                    item.product.image_url = image_url
                    item.product.save(update_fields=["image_url"])
                    logger.info("Updated image for %s", item.product.name)

            message = (
                f"Updated {item.product.name} @ {item.store.chain_name} ({item.store.address}): "
                f"{item.price} UAH"
            )
            logger.info(message)
            return message

        error_msg = result.get("error", "Unknown error")
        logger.warning(
            "Scrape failed for %s: %s", item.product.name, error_msg
        )

        # Retry on transient errors
        if "timeout" in str(error_msg).lower() or "browser" in str(error_msg).lower():
            raise self.retry(exc=Exception(error_msg))

        return f"Failed: {item.product.name} - {error_msg}"

    except SoftTimeLimitExceeded:
        logger.error("Scrape task timed out for item %d", store_item_id)
        raise self.retry(exc=SoftTimeLimitExceeded())

    except self.MaxRetriesExceededError:
        logger.error("Max retries exceeded for item %d", store_item_id)
        return f"Max retries exceeded for StoreItem {store_item_id}"

    except Exception as e:
        logger.exception("Unexpected error scraping item %d", store_item_id)

        # Check if we should retry
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)

        return f"Error after retries: {e}"


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
            logger.error("Failed to queue scrape for item %d: %s", item.id, e)

    message = f"Queued {queued_count}/{total_count} items for scraping"
    logger.info(message)
    return message


@shared_task(bind=True)
def scrape_single_store(self, store_id: int) -> str:
    """
    Queue scraping tasks for all items from a specific store.

    Features:
    - Tracks progress in TaskLog for real-time admin monitoring
    - Throttles requests to avoid overload
    - Logs success/failure per item

    Args:
        store_id: Database ID of the Store.

    Returns:
        Summary message.
    """
    task_id = self.request.id
    
    try:
        store = Store.objects.get(id=store_id)
    except Store.DoesNotExist:
        logger.error(f"Store {store_id} not found")
        update_task_log(
            task_id,
            status='failed',
            error_message=f"Store {store_id} not found",
            completed_at=timezone.now()
        )
        return f"Store {store_id} not found"
    
    items = StoreItem.objects.filter(
        store_id=store_id,
        url__isnull=False
    ).exclude(url="")

    count = items.count()
    
    # Create task log
    task_log = create_task_log(
        task_id=task_id,
        task_name=f"Scrape {store.chain_name} ({store.address})",
        store=store,
        items_total=count
    )
    
    if count == 0:
        update_task_log(
            task_id,
            status='completed',
            message=f"No items to scrape for {store.chain_name}",
            items_processed=0,
            completed_at=timezone.now()
        )
        return f"No items to scrape for store {store_id}"
    
    logger.info(f"Scraping {count} items from store {store.chain_name}")
    
    queued_count = 0
    for idx, item in enumerate(items):
        try:
            scrape_store_item_task.apply_async(
                args=[item.id],
                countdown=idx * 2  # Throttle: 2 sec between each
            )
            queued_count += 1
            
            # Update progress every 10 items
            if (idx + 1) % 10 == 0:
                update_task_log(
                    task_id,
                    status='progress',
                    items_processed=idx + 1,
                    message=f"Queued {idx + 1}/{count} items"
                )
        except Exception as e:
            logger.error(f"Failed to queue item {item.id}: {e}")
            update_task_log(task_id, items_failed=task_log.items_failed + 1)
    
    # Mark as completed
    update_task_log(
        task_id,
        status='completed',
        items_processed=queued_count,
        message=f"Successfully queued {queued_count}/{count} items",
        completed_at=timezone.now()
    )
    
    return f"Queued {queued_count}/{count} items from store {store_id}"


@shared_task(
    soft_time_limit=600,
    time_limit=660
)
def scrape_category_task(url: str, store_name: str) -> str:
    """
    Scrape a category page and ingest valid products.
    
    Anti-Bug Protocol:
    1. Scrapes list of products.
    2. Validates each via ingest_scraped_data (Pydantic).
    3. Saves only valid data.
    """
    logger.info(f"Starting category scrape: {url}")
    
    try:
        scraper = _factory.get_scraper(url)
        results = scraper.scrape_category(url)
        
        success_count = 0
        for item_data in results:
            if ingest_scraped_data(item_data, store_name):
                success_count += 1
                
        return f"Ingested {success_count}/{len(results)} products from {url}"
        
    except Exception as e:
        logger.error(f"Category scrape failed: {e}")
        return f"Failed: {e}"
