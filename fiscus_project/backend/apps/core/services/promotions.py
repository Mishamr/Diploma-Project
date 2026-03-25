"""
Promotions service — finds current deals and discounts.
"""

from datetime import timedelta

from apps.core.models import Price, StoreItem
from django.utils import timezone


def get_top_promotions(limit=20, chain_slug=None):
    """
    Get top current promotions (biggest discounts).

    Returns list of dicts with product, store, price, discount info.
    """
    filters = {
        "is_promo": True,
        "old_price__isnull": False,
        "recorded_at__gte": timezone.now() - timedelta(days=3),
        "store_item__in_stock": True,
    }

    if chain_slug:
        filters["store_item__store__chain__slug"] = chain_slug

    promos = (
        Price.objects.filter(**filters)
        .select_related(
            "store_item__product",
            "store_item__product__category",
            "store_item__store",
            "store_item__store__chain",
        )
        .order_by("price")[:limit]
    )

    results = []
    for p in promos:
        results.append(
            {
                "id": p.id,
                "product_name": p.store_item.product.name,
                "category": (
                    p.store_item.product.category.name
                    if p.store_item.product.category
                    else ""
                ),
                "image_url": p.store_item.product.image_url,
                "chain": p.store_item.store.chain.name,
                "chain_slug": p.store_item.store.chain.slug,
                "store": p.store_item.store.name,
                "price": float(p.price),
                "old_price": float(p.old_price),
                "discount_pct": p.discount_pct,
                "promo_label": p.promo_label,
                "recorded_at": p.recorded_at.isoformat(),
            }
        )

    return sorted(results, key=lambda x: x["discount_pct"], reverse=True)


def get_price_history(product_id, days=30):
    """Get price history for a product across stores."""
    cutoff = timezone.now() - timedelta(days=days)

    prices = (
        Price.objects.filter(
            store_item__product_id=product_id,
            recorded_at__gte=cutoff,
        )
        .select_related("store_item__store__chain")
        .order_by("recorded_at")
    )

    history = {}
    for p in prices:
        chain = p.store_item.store.chain.slug
        if chain not in history:
            history[chain] = []
        history[chain].append(
            {
                "date": p.recorded_at.date().isoformat(),
                "price": float(p.price),
                "is_promo": p.is_promo,
            }
        )

    return history
