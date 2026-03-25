"""
Geo views — store locations and nearest store search.
"""

from apps.api.serializers import StoreSerializer
from apps.core.models import Store
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .services import find_cheapest_basket_stores, find_nearest_stores


@api_view(["GET"])
@permission_classes([AllowAny])
def nearby_stores_view(request):
    """
    GET /api/v1/geo/nearby/?lat=50.45&lon=30.52&limit=10
    Find nearest stores.
    """
    lat = request.query_params.get("lat")
    lon = request.query_params.get("lon")
    limit = int(request.query_params.get("limit", 10))

    if not lat or not lon:
        return Response(
            {"error": "lat and lon parameters required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    results = find_nearest_stores(float(lat), float(lon), limit=limit)

    stores_data = []
    for item in results:
        store = item["store"]
        stores_data.append(
            {
                "id": store.id,
                "name": store.name,
                "chain": store.chain.name,
                "chain_slug": store.chain.slug,
                "address": store.address,
                "latitude": store.latitude,
                "longitude": store.longitude,
                "distance_km": item["distance_km"],
            }
        )

    return Response(stores_data)


@api_view(["GET"])
@permission_classes([AllowAny])
def stores_on_map_view(request):
    """
    GET /api/v1/geo/stores/
    All active stores for map display.
    """
    stores = Store.objects.filter(is_active=True).select_related("chain")
    chain_filter = request.query_params.get("chain")
    if chain_filter:
        stores = stores.filter(chain__slug=chain_filter)

    data = []
    for store in stores:
        if store.latitude == 0.0 and store.longitude == 0.0:
            continue
        data.append(
            {
                "id": store.id,
                "name": store.name,
                "chain": store.chain.name,
                "chain_slug": store.chain.slug,
                "address": store.address,
                "city": store.city,
                "latitude": store.latitude,
                "longitude": store.longitude,
            }
        )

    return Response(data)


@api_view(["POST"])
@permission_classes([AllowAny])
def cheapest_basket_view(request):
    """
    POST /api/v1/geo/cheapest-basket/
    Body: { "lat": 50.45, "lon": 30.52, "product_ids": [1, 2, 3] }
    Find stores with cheapest total for selected products.
    """
    lat = request.data.get("lat")
    lon = request.data.get("lon")
    product_ids = request.data.get("product_ids", [])

    if not lat or not lon:
        return Response(
            {"error": "lat and lon required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not product_ids:
        return Response(
            {"error": "product_ids required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    results = find_cheapest_basket_stores(
        float(lat),
        float(lon),
        product_ids,
        limit=5,
    )

    return Response(results)
