"""
Scraper services — DB ingestion pipeline.
Takes scraped data, matches products, saves prices.
"""

import logging
from decimal import Decimal

from apps.core.models import Category, Chain, Price, Product, Store, StoreItem
from django.utils import timezone
from django.utils.text import slugify

from .matcher import ProductMatcher
from .schemas import ScrapedProduct

logger = logging.getLogger(__name__)

_matcher = ProductMatcher()

# Cache for categories to avoid repeated DB lookups
_category_cache = {}


def is_category_scraped(chain_slug: str, store_id: int, category_name: str, hours: int = 12) -> bool:
    """Check if a category was scraped recently for a given store, to allow resuming."""
    if not category_name:
        return False
        
    threshold = timezone.now() - timezone.timedelta(hours=hours)
    
    return StoreItem.objects.filter(
        store_id=store_id,
        store__chain__slug=chain_slug,
        product__category__name=category_name,
        last_scraped__gte=threshold
    ).exists()


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
    try:
        store = Store.objects.select_related('chain').get(id=store_id)
        # Ensure we are saving to a store of the correct chain
        if store.chain.slug != chain_slug:
            print(f"[Ingest] Store ID {store_id} belongs to '{store.chain.slug}', but we are scraping '{chain_slug}'. Finding appropriate store...", flush=True)
            store = Store.objects.filter(chain__slug=chain_slug, is_active=True).first()
            if not store:
                print(f"[Ingest] ERROR: No active store found for chain '{chain_slug}'.", flush=True)
                return {'saved': 0, 'errors': len(scraped_items)}
            print(f"[Ingest] Redirected to Store ID {store.id} ({store.name})", flush=True)
    except Store.DoesNotExist:
        print(f"[Ingest] Store ID {store_id} not found. Finding first available store for '{chain_slug}'...", flush=True)
        store = Store.objects.filter(chain__slug=chain_slug, is_active=True).first()
        if not store:
            print(f"[Ingest] ERROR: No store found for chain '{chain_slug}'.", flush=True)
            return {'saved': 0, 'errors': len(scraped_items)}
    saved_count = 0
    error_count = 0

    print(f"[Ingest] Starting ingestion for {chain_slug}... Total items: {len(scraped_items)}", flush=True)
    for i, raw_item in enumerate(scraped_items):
        if i > 0 and i % 100 == 0:
            print(f"  [Ingest] {chain_slug}: Processed {i}/{len(scraped_items)} items...", flush=True)

        try:
            # Validate
            item = ScrapedProduct(**raw_item)

            # Match product
            product = _matcher.find_match(item.title, chain_slug)
            if not product:
                error_count += 1
                continue
            
            # Log matching for debugging
            if product.name != item.title:
                print(f"  [Matcher] {chain_slug}: Matched '{item.title[:30]}...' -> '{product.name[:30]}...'", flush=True)

            # Update product image and category if changed
            product_updated = False
            if item.image_url and product.image_url != item.image_url:
                print(f"  [Ingest] Updated photo for '{product.name[:30]}...'", flush=True)
                product.image_url = item.image_url
                product_updated = True

            if item.category and (not product.category or product.category.name != item.category):
                category = _get_or_create_category(item.category)
                if category:
                    product.category = category
                    product_updated = True
            
            if product_updated:
                product.save()

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

def cleanup_outdated_items(chain_slug: str, hours: int = 12):
    """
    Marks items as out of stock if they haven't been scraped recently.
    This prevents outdated products from showing up in survival mode 
    or search if they were removed from the store's website.
    """
    threshold = timezone.now() - timezone.timedelta(hours=hours)
    
    outdated_items = StoreItem.objects.filter(
        store__chain__slug=chain_slug,
        in_stock=True,
        last_scraped__lt=threshold
    )
    
    count = outdated_items.count()
    if count > 0:
        outdated_items.update(in_stock=False)
        logger.info(f"[Cleanup] Marked {count} items as out of stock for {chain_slug}")
    else:
        logger.info(f"[Cleanup] No outdated items found for {chain_slug}")

