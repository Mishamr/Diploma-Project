"""
Scraper services — DB ingestion pipeline.
Takes scraped data, matches products, saves prices.
"""

import logging
from decimal import Decimal
from django.utils import timezone
from django.utils.text import slugify
from apps.core.models import Chain, Store, Product, StoreItem, Price, Category
from .matcher import ProductMatcher
from .schemas import ScrapedProduct

logger = logging.getLogger(__name__)

_matcher = ProductMatcher()

# Cache for categories to avoid repeated DB lookups
_category_cache = {}


def _get_or_create_category(category_name: str) -> Category:
    """Find or create a category by name, with caching."""
    if not category_name:
        return None

    if category_name in _category_cache:
        return _category_cache[category_name]

    slug = slugify(category_name, allow_unicode=True)
    if not slug:
        slug = category_name.lower().replace(' ', '-').replace("'", '')

    category, _ = Category.objects.get_or_create(
        slug=slug,
        defaults={'name': category_name},
    )
    _category_cache[category_name] = category
    return category


def ingest_scraped_data(scraped_items: list[dict], chain_slug: str, store_id: int):
    """
    Process scraped products and save to database.

    1. Validate each item with Pydantic
    2. Match/create Product via ProductMatcher
    3. Get/create StoreItem
    4. Create Price record
    """
    store = Store.objects.select_related('chain').get(id=store_id)
    saved_count = 0
    error_count = 0

    for raw_item in scraped_items:
        try:
            # Validate
            item = ScrapedProduct(**raw_item)

            # Match product
            product = _matcher.find_match(item.title, chain_slug)
            if not product:
                error_count += 1
                continue

            # Update product image if available and not set
            if item.image_url and not product.image_url:
                product.image_url = item.image_url
                product.save(update_fields=['image_url'])

            # Assign category if available and not yet assigned
            if item.category and not product.category:
                category = _get_or_create_category(item.category)
                if category:
                    product.category = category
                    product.save(update_fields=['category'])

            # Get or create StoreItem
            store_item, _ = StoreItem.objects.get_or_create(
                store=store,
                product=product,
                defaults={
                    'external_product_id': item.external_store_id,
                    'url': item.url,
                    'in_stock': item.in_stock,
                },
            )

            # Update stock status
            store_item.in_stock = item.in_stock
            store_item.last_scraped = timezone.now()
            if item.url:
                store_item.url = item.url
            store_item.save(update_fields=['in_stock', 'last_scraped', 'url'])

            # Create price record (avoid duplicates within 1 hour)
            one_hour_ago = timezone.now() - timezone.timedelta(hours=1)
            recent_price = Price.objects.filter(
                store_item=store_item,
                recorded_at__gte=one_hour_ago,
            ).first()

            if not recent_price or recent_price.price != Decimal(str(item.price)):
                Price.objects.create(
                    store_item=store_item,
                    price=Decimal(str(item.price)),
                    old_price=Decimal(str(item.old_price)) if item.old_price else None,
                    is_promo=item.is_promo,
                    promo_label=f"-{item.discount_pct}%" if item.is_promo else '',
                )

            saved_count += 1

        except Exception as e:
            logger.error(f"[Ingest] Error processing item: {e}")
            error_count += 1

    logger.info(
        f"[Ingest] {chain_slug}/store#{store_id}: "
        f"saved={saved_count}, errors={error_count}, total={len(scraped_items)}"
    )
    return {'saved': saved_count, 'errors': error_count}
