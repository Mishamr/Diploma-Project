"""
Geo services — Haversine distance, nearest store lookup.
"""

import math

from apps.core.models import Store


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two points on Earth using Haversine formula.
    Returns distance in kilometers.
    """
    R = 6371  # Earth radius in km

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def find_nearest_store(
    lat: float, lon: float, chain_slug: str = None, max_distance_km: float = 50.0
) -> Store | None:
    """
    Find the nearest active store using Haversine formula.
    Optionally filter by chain slug.
    """
    stores = Store.objects.filter(is_active=True).select_related("chain")
    if chain_slug:
        stores = stores.filter(chain__slug=chain_slug)

    nearest = None
    min_dist = float("inf")

    for store in stores:
        if store.latitude == 0.0 and store.longitude == 0.0:
            continue
        dist = haversine_distance(lat, lon, store.latitude, store.longitude)
        if dist < min_dist and dist <= max_distance_km:
            min_dist = dist
            nearest = store

    return nearest


def find_nearest_stores(
    lat: float, lon: float, limit: int = 10, max_distance_km: float = 50.0
) -> list[dict]:
    """
    Find nearest stores across all chains.
    Returns list of {store, chain, distance_km}.
    """
    stores = Store.objects.filter(is_active=True).select_related("chain")

    results = []
    for store in stores:
        if store.latitude == 0.0 and store.longitude == 0.0:
            continue
        dist = haversine_distance(lat, lon, store.latitude, store.longitude)
        if dist <= max_distance_km:
            results.append(
                {
                    "store": store,
                    "chain": store.chain,
                    "distance_km": round(dist, 2),
                }
            )

    results.sort(key=lambda x: x["distance_km"])
    return results[:limit]


def find_cheapest_basket_stores(
    lat: float, lon: float, product_ids: list[int], limit: int = 5
) -> list[dict]:
    """
    Find stores with the cheapest total for a list of products.
    """
    from apps.core.models import StoreItem

    nearby = find_nearest_stores(lat, lon, limit=20)

    basket_prices = []
    for item in nearby:
        store = item["store"]
        total = 0
        found = 0

        for pid in product_ids:
            si = StoreItem.objects.filter(
                store=store, product_id=pid, in_stock=True
            ).first()
            if si:
                latest = si.prices.order_by("-recorded_at").first()
                if latest:
                    total += float(latest.price)
                    found += 1

        if found > 0:
            basket_prices.append(
                {
                    "store_id": store.id,
                    "store_name": store.name,
                    "chain": store.chain.name,
                    "chain_slug": store.chain.slug,
                    "address": store.address,
                    "latitude": store.latitude,
                    "longitude": store.longitude,
                    "distance_km": item["distance_km"],
                    "basket_total": round(total, 2),
                    "products_found": found,
                    "products_total": len(product_ids),
                }
            )

    basket_prices.sort(key=lambda x: x["basket_total"])
    return basket_prices[:limit]
