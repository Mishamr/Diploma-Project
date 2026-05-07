"""
Geo / Location views — nearby stores, stores on map.
GET /api/v1/geo/nearby/?lat=…&lon=…&limit=10
GET /api/v1/geo/stores/?chain=…
"""

import logging
import math

from apps.core.models import Store
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def haversine_km(lat1, lon1, lat2, lon2):
    """Straight-line distance in km between two (lat, lon) points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return R * 2 * math.asin(math.sqrt(a))


def serialize_store(store, distance_km=None):
    return {
        "id": store.id,
        "name": store.name,
        "address": store.address,
        "city": store.city,
        "latitude": store.latitude,
        "longitude": store.longitude,
        "chain": store.chain.name,
        "chain_slug": store.chain.slug,
        "chain_color": _chain_color(store.chain.slug),
        **({"distance_km": round(distance_km, 2)} if distance_km is not None else {}),
    }


def _chain_color(slug):
    COLORS = {
        "atb": "#e74c3c",
        "silpo": "#f39c12",
        "auchan": "#27ae60",
    }
    return COLORS.get(slug, "#7c3aed")


@api_view(["GET"])
@permission_classes([AllowAny])
def nearby_stores_view(request):
    """
    GET /api/v1/geo/nearby/?lat=50.45&lon=30.52&limit=10
    Returns stores sorted by distance from the given coordinates.
    """
    try:
        lat = float(request.query_params.get("lat", 0))
        lon = float(request.query_params.get("lon", 0))
        limit = int(request.query_params.get("limit", 10))
    except (TypeError, ValueError):
        return Response({"error": "Невірні координати"}, status=400)

    if lat == 0 and lon == 0:
        return Response({"error": "Координати обов'язкові"}, status=400)

    chain_slug = request.query_params.get("chain")

    qs = Store.objects.select_related("chain").filter(
        is_active=True,
        latitude__gt=0,
        longitude__gt=0,
        chain__slug__in=["atb", "silpo", "auchan"],
    )
    if chain_slug:
        qs = qs.filter(chain__slug=chain_slug)

    # Calculate distances in Python (no PostGIS required)
    stores_with_dist = []
    for store in qs:
        dist = haversine_km(lat, lon, store.latitude, store.longitude)
        if dist <= 2.0:
            stores_with_dist.append((dist, store))

    stores_with_dist.sort(key=lambda x: x[0])
    nearest = stores_with_dist[:limit]

    return Response([serialize_store(s, d) for d, s in nearest])


@api_view(["GET"])
@permission_classes([AllowAny])
def stores_on_map_view(request):
    """
    GET /api/v1/geo/stores/?chain=atb
    Returns all active stores (optionally filtered by chain) for the map view.
    """
    chain_slug = request.query_params.get("chain")

    qs = Store.objects.select_related("chain").filter(
        is_active=True,
        latitude__gt=0,
        longitude__gt=0,
        chain__slug__in=["atb", "silpo", "auchan"],
    )
    if chain_slug:
        qs = qs.filter(chain__slug=chain_slug)

    return Response([serialize_store(s) for s in qs])


@api_view(["POST"])
@permission_classes([AllowAny])
def cheapest_basket_view(request):
    """
    POST /api/v1/geo/cheapest-basket/
    Body: { lat, lon, product_ids: [] }
    Returns the nearest store(s) sorted by total basket price.
    """
    lat = request.data.get("lat")
    lon = request.data.get("lon")
    product_ids = request.data.get("product_ids", [])

    if not lat or not lon:
        return Response({"error": "Координати обов'язкові"}, status=400)

    try:
        lat, lon = float(lat), float(lon)
    except (TypeError, ValueError):
        return Response({"error": "Невірні координати"}, status=400)

    from apps.core.models import StoreItem

    # Find nearest stores
    qs = Store.objects.select_related("chain").filter(
        is_active=True,
        latitude__gt=0,
        longitude__gt=0,
        chain__slug__in=["atb", "silpo", "auchan"],
    )
    stores_with_dist = sorted(
        [(haversine_km(lat, lon, s.latitude, s.longitude), s) for s in qs],
        key=lambda x: x[0],
    )[:20]

    results = []
    for dist, store in stores_with_dist:
        total = 0.0
        found = 0
        for pid in product_ids:
            si = StoreItem.objects.filter(
                store=store, product_id=pid, in_stock=True
            ).first()
            if si:
                price = si.prices.order_by("-recorded_at").first()
                if price:
                    total += float(price.price)
                    found += 1

        if found > 0:
            results.append(
                {
                    **serialize_store(store, dist),
                    "basket_total": round(total, 2),
                    "found_items": found,
                    "total_items": len(product_ids),
                }
            )

    results.sort(key=lambda x: x["basket_total"])
    return Response(results[:10])
