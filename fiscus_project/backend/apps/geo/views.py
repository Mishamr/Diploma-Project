"""
Geo-location API views for Fiscus application.

This module provides REST API endpoints for geographic
store location and basket optimization.
"""
import logging
from typing import List, Dict, Any

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from apps.geo.services import find_cheapest_basket_in_radius

logger = logging.getLogger(__name__)

# Validation constants
MAX_RADIUS_KM = 50.0
MIN_RADIUS_KM = 0.1
MAX_SHOPPING_LIST_ITEMS = 100


class StoreLocatorView(APIView):
    """
    API view for locating stores and finding cheapest basket.
    
    Accepts user location and optional shopping list,
    returns stores sorted by basket price within radius.
    
    Endpoint:
        POST /api/v1/geo/locate/
    
    Request Body:
        {
            "latitude": 50.4501,      // Required
            "longitude": 30.5234,     // Required
            "radius": 10,             // Optional, default: 10km
            "shopping_list": [        // Optional
                {"product_id": 1, "quantity": 2},
                {"product_id": 5, "quantity": 1}
            ]
        }
    
    Response:
        {
            "stores": [
                {
                    "store_id": 1,
                    "store_name": "ATB",
                    "total_price": 245.50,
                    "missing_items": 0,
                    "distance_km": 1.2,
                    "location": {"latitude": 50.45, "longitude": 30.52}
                }
            ]
        }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request) -> Response:
        """
        Find stores within radius and calculate basket prices.
        
        Args:
            request: DRF Request with location and shopping list.
        
        Returns:
            Response with list of stores and prices.
        """
        # Extract and validate coordinates
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        radius = request.data.get('radius', 10.0)
        shopping_list = request.data.get('shopping_list', [])

        # Validate required fields
        if latitude is None or longitude is None:
            return Response(
                {"error": "Latitude and longitude are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate coordinate types and ranges
        try:
            latitude = float(latitude)
            longitude = float(longitude)
            radius = float(radius)
            
            # Validate coordinate ranges
            if not (-90 <= latitude <= 90):
                raise ValueError("Latitude must be between -90 and 90")
            if not (-180 <= longitude <= 180):
                raise ValueError("Longitude must be between -180 and 180")
            if not (MIN_RADIUS_KM <= radius <= MAX_RADIUS_KM):
                raise ValueError(
                    f"Radius must be between {MIN_RADIUS_KM} and {MAX_RADIUS_KM} km"
                )
                
        except (TypeError, ValueError) as e:
            logger.warning(f"Invalid geo parameters: {e}")
            return Response(
                {"error": f"Invalid parameters: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate shopping list
        validated_list = self._validate_shopping_list(shopping_list)
        if isinstance(validated_list, Response):
            return validated_list  # Error response

        # Find stores
        try:
            results = find_cheapest_basket_in_radius(
                user_lat=latitude,
                user_lon=longitude,
                radius_km=radius,
                shopping_list_items=validated_list if validated_list else None
            )
            
            logger.info(
                f"Store search: lat={latitude}, lon={longitude}, "
                f"radius={radius}km, found={len(results)} stores"
            )
            
            return Response({"stores": results})

        except Exception as e:
            logger.exception("Failed to locate stores")
            return Response(
                {"error": "Failed to search for stores. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _validate_shopping_list(
        self,
        shopping_list: List[Dict]
    ) -> List[Dict] | Response:
        """
        Validate shopping list format and contents.
        
        Args:
            shopping_list: List of items from request.
        
        Returns:
            Validated list or Error Response.
        """
        if not shopping_list:
            return []

        if not isinstance(shopping_list, list):
            return Response(
                {"error": "shopping_list must be an array"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(shopping_list) > MAX_SHOPPING_LIST_ITEMS:
            return Response(
                {"error": f"Maximum {MAX_SHOPPING_LIST_ITEMS} items allowed"},
                status=status.HTTP_400_BAD_REQUEST
            )

        validated = []
        for idx, item in enumerate(shopping_list):
            if not isinstance(item, dict):
                return Response(
                    {"error": f"Item at index {idx} must be an object"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            product_id = item.get('product_id')
            quantity = item.get('quantity', 1)

            if not product_id or not isinstance(product_id, int):
                return Response(
                    {"error": f"Invalid product_id at index {idx}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not isinstance(quantity, int) or quantity <= 0:
                return Response(
                    {"error": f"Invalid quantity at index {idx}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            validated.append({
                "product_id": product_id,
                "quantity": quantity
            })

        return validated
