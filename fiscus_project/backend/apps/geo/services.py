"""
Geo-location services for Fiscus application.

This module provides geographic calculations for finding
nearby stores and calculating optimal shopping routes.

Algorithm Complexity:
    - find_cheapest_basket_in_radius: O(n*m) where n=stores, m=items
    - haversine_distance: O(1)
"""
import logging
import math
from decimal import Decimal
from typing import List, Dict, Any, Optional

from django.db.models import F
from apps.core.models import Store, StoreItem

logger = logging.getLogger(__name__)

# Earth radius in kilometers
EARTH_RADIUS_KM = 6371


def haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:
    """
    Calculate the great circle distance between two points on Earth.
    
    Uses the Haversine formula for accurate distance calculation
    on a spherical surface.
    
    Args:
        lat1: Latitude of first point in decimal degrees.
        lon1: Longitude of first point in decimal degrees.
        lat2: Latitude of second point in decimal degrees.
        lon2: Longitude of second point in decimal degrees.
    
    Returns:
        Distance between points in kilometers.
    
    Example:
        >>> haversine_distance(50.4501, 30.5234, 50.4547, 30.5238)
        0.512  # ~500 meters
    """
    # Convert decimal degrees to radians
    lon1_rad, lat1_rad = math.radians(lon1), math.radians(lat1)
    lon2_rad, lat2_rad = math.radians(lon2), math.radians(lat2)

    # Haversine formula
    delta_lon = lon2_rad - lon1_rad
    delta_lat = lat2_rad - lat1_rad
    
    a = (
        math.sin(delta_lat / 2) ** 2 +
        math.cos(lat1_rad) * math.cos(lat2_rad) *
        math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))
    
    return EARTH_RADIUS_KM * c


def find_cheapest_basket_in_radius(
    user_lat: float,
    user_lon: float,
    radius_km: float = 10.0,
    shopping_list_items: Optional[List[Dict]] = None
) -> List[Dict[str, Any]]:
    """
    Find stores within radius and calculate basket price for each.
    
    Algorithm:
        1. Filter stores by bounding box (optimization, O(1) DB query)
        2. Calculate exact Haversine distance for candidates
        3. For each valid store, calculate total basket price
        4. Sort by: missing items (asc), price (asc), distance (asc)
        5. Return top 10 results
    
    Args:
        user_lat: User's latitude in decimal degrees.
        user_lon: User's longitude in decimal degrees.
        radius_km: Search radius in kilometers (default: 10).
        shopping_list_items: List of items to price, format:
            [{"product_id": 1, "quantity": 2}, ...]
    
    Returns:
        List of stores with pricing info, sorted by best value.
        Format: [{
            "store_id": int,
            "store_name": str,
            "total_price": float,
            "missing_items": int,
            "distance_km": float,
            "location": {"latitude": float, "longitude": float}
        }]
    """
    # Rough bounding box filter (1 degree ≈ 111km)
    # Using 0.15 degrees ≈ 16.6km for safety margin
    BOUNDING_BOX_DELTA = 0.15
    
    lat_min = user_lat - BOUNDING_BOX_DELTA
    lat_max = user_lat + BOUNDING_BOX_DELTA
    lon_min = user_lon - BOUNDING_BOX_DELTA
    lon_max = user_lon + BOUNDING_BOX_DELTA

    # Query stores within bounding box
    nearby_stores = Store.objects.filter(
        latitude__range=(lat_min, lat_max),
        longitude__range=(lon_min, lon_max)
    ).prefetch_related('items')

    valid_stores = []

    # Filter by exact Haversine distance
    for store in nearby_stores:
        if not store.latitude or not store.longitude:
            continue

        distance = haversine_distance(
            user_lat, user_lon,
            store.latitude, store.longitude
        )
        
        if distance <= radius_km:
            valid_stores.append({
                "store": store,
                "distance": distance,
                "total_price": Decimal('0.00'),
                "missing_items": 0
            })

    logger.debug(f"Found {len(valid_stores)} stores within {radius_km}km")

    # If no shopping list, return stores sorted by distance
    if not shopping_list_items:
        valid_stores.sort(key=lambda x: x['distance'])
        return [
            {
                "id": s["store"].id,
                "name": s["store"].name,
                "distance_km": round(s["distance"], 2),
                "coordinates": {
                    "lat": s["store"].latitude,
                    "lon": s["store"].longitude
                }
            }
            for s in valid_stores[:10]
        ]

    # Calculate basket price for each store
    results = []
    
    for entry in valid_stores:
        store = entry['store']
        total_price = Decimal('0.00')
        missing_count = 0

        for item in shopping_list_items:
            product_id = item.get('product_id')
            quantity = item.get('quantity', 1)

            try:
                store_item = store.items.get(product_id=product_id)
                item_price = Decimal(str(store_item.price)) * quantity
                total_price += item_price
            except StoreItem.DoesNotExist:
                missing_count += 1
                logger.debug(
                    f"Product {product_id} not found in store {store.name}"
                )

        entry['total_price'] = total_price
        entry['missing_items'] = missing_count
        results.append(entry)

    # Sort by: missing items, then price, then distance
    results.sort(key=lambda x: (
        x['missing_items'],
        x['total_price'],
        x['distance']
    ))

    # Format output (top 10)
    return [
        {
            "store_id": r['store'].id,
            "store_name": r['store'].name,
            "total_price": float(r['total_price']),
            "missing_items": r['missing_items'],
            "distance_km": round(r['distance'], 2),
            "location": {
                "latitude": r['store'].latitude,
                "longitude": r['store'].longitude
            }
        }
        for r in results[:10]
    ]


def get_stores_in_radius(
    user_lat: float,
    user_lon: float,
    radius_km: float = 10.0
) -> List[Store]:
    """
    Get all stores within specified radius from user location.
    
    Simplified version of find_cheapest_basket_in_radius
    for cases where only store locations are needed.
    
    Args:
        user_lat: User's latitude.
        user_lon: User's longitude.
        radius_km: Search radius in kilometers.
    
    Returns:
        List of Store objects within radius.
    """
    result = find_cheapest_basket_in_radius(
        user_lat, user_lon, radius_km, None
    )
    
    store_ids = [r['id'] for r in result]
    return list(Store.objects.filter(id__in=store_ids))
