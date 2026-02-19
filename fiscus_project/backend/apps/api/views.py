"""
API Views for Fiscus application.

This module provides REST API endpoints for products, stores,
shopping lists, and price comparison functionality.
"""
import logging
import math
from typing import Optional

from rest_framework import viewsets, filters, status, permissions
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Prefetch

from apps.core.models import (
    Product, Store, ShoppingList, StoreItem, ShoppingListItem, Price
)
from apps.api.serializers import (
    ProductSerializer, ProductDetailSerializer,
    StoreSerializer, StoreItemSerializer,
    ShoppingListSerializer, ShoppingListItemSerializer
)
from apps.api.permissions import IsPremiumUser, IsManager
from apps.scraper.services import compare_prices
from apps.scraper.smart_selector import get_best_value_product
from apps.scraper.tasks import scrape_all_items_periodic

logger = logging.getLogger(__name__)


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for retrieving products.
    
    Provides list and detail views for Product model.
    Supports search by name and category.
    
    Endpoints:
        GET /api/v1/products/ - List all products
        GET /api/v1/products/{id}/ - Get product details with cheapest option
    """
    queryset = Product.objects.all().prefetch_related('store_items__store')
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'category']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductSerializer


class StoreViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for retrieving stores.
    
    Provides list view and nearby search functionality.
    
    Endpoints:
        GET /api/v1/stores/ - List all stores
        GET /api/v1/stores/nearby/?lat=X&lon=Y&radius=Z - Find nearby stores
    """
    queryset = Store.objects.all()
    serializer_class = StoreSerializer

    @action(detail=False, methods=['get'])
    def nearby(self, request):
        """
        Find stores within specified radius using Haversine formula.
        
        Query Parameters:
            lat (float): User latitude (required)
            lon (float): User longitude (required)
            radius (float): Search radius in kilometers (default: 10)
        
        Returns:
            List of stores within radius, sorted by distance.
        """
        try:
            user_lat = float(request.query_params.get('lat'))
            user_lon = float(request.query_params.get('lon'))
            radius = float(request.query_params.get('radius', 10.0))
        except (TypeError, ValueError) as e:
            logger.warning(f"Invalid coordinates provided: {e}")
            return Response(
                {"error": "Invalid lat/lon parameters. Must be valid numbers."},
                status=status.HTTP_400_BAD_REQUEST
            )

        nearby_stores = []
        earth_radius_km = 6371

        for store in self.get_queryset():
            # Перевірка на None, щоб math.radians не "впав"
            if store.latitude is None or store.longitude is None:
                continue
            
            # Haversine formula
            d_lat = math.radians(store.latitude - user_lat)
            d_lon = math.radians(store.longitude - user_lon)
            a = (
                math.sin(d_lat / 2) ** 2 +
                math.cos(math.radians(user_lat)) *
                math.cos(math.radians(store.latitude)) *
                math.sin(d_lon / 2) ** 2
            )
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            distance = earth_radius_km * c

            if distance <= radius:
                nearby_stores.append((store, distance))

        # Sort by distance
        nearby_stores.sort(key=lambda x: x[1])
        stores_only = [s[0] for s in nearby_stores]

        serializer = self.get_serializer(stores_only, many=True)
        return Response(serializer.data)


class ShoppingListViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing shopping lists.
    
    Provides full CRUD operations for ShoppingList model.
    Filters lists by the authenticated user.
    """
    serializer_class = ShoppingListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Return shopping lists owned by the current user.
        """
        return ShoppingList.objects.filter(
            user=self.request.user
        ).prefetch_related(
            'shoppinglistitem_set__product__store_items__store'
        )

    def perform_create(self, serializer):
        """Assign the current user as the list owner."""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        """
        Add a product to a shopping list.
        
        POST /api/v1/shopping-lists/{id}/add_item/
        Body: { "product_id": 1, "quantity": 2 }
        """
        
        shopping_list = self.get_object()
        product_id = request.data.get('product_id')
        quantity = request.data.get('quantity', 1)
        
        if not product_id:
            return Response(
                {'error': 'product_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if item already exists, increment quantity if so
        item, created = ShoppingListItem.objects.get_or_create(
            shopping_list=shopping_list,
            product=product,
            defaults={'quantity': quantity}
        )
        
        if not created:
            item.quantity += quantity
            item.save()
        
        serializer = self.get_serializer(shopping_list)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def remove_item(self, request, pk=None):
        """
        Remove a product from a shopping list.
        
        POST /api/v1/shopping-lists/{id}/remove_item/
        Body: { "item_id": 1 } or { "product_id": 1 }
        """
        
        shopping_list = self.get_object()
        item_id = request.data.get('item_id')
        product_id = request.data.get('product_id')
        
        try:
            if item_id:
                item = ShoppingListItem.objects.get(
                    id=item_id,
                    shopping_list=shopping_list
                )
            elif product_id:
                item = ShoppingListItem.objects.get(
                    shopping_list=shopping_list,
                    product_id=product_id
                )
            else:
                return Response(
                    {'error': 'item_id or product_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            item.delete()
            serializer = self.get_serializer(shopping_list)
            return Response(serializer.data)
            
        except ShoppingListItem.DoesNotExist:
            return Response(
                {'error': 'Item not found in list'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def toggle_item(self, request, pk=None):
        """
        Toggle checked status of an item.
        
        POST /api/v1/shopping-lists/{id}/toggle_item/
        Body: { "item_id": 1 }
        """
        
        shopping_list = self.get_object()
        item_id = request.data.get('item_id')
        
        try:
            item = ShoppingListItem.objects.get(
                id=item_id,
                shopping_list=shopping_list
            )
            item.is_checked = not item.is_checked
            item.save()
            
            serializer = self.get_serializer(shopping_list)
            return Response(serializer.data)
            
        except ShoppingListItem.DoesNotExist:
            return Response(
                {'error': 'Item not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class PromotionsViewSet(viewsets.ViewSet):
    """
    ViewSet for current promotions/price drops.
    
    Detects products where current price is lower than average.
    
    Endpoints:
        GET /api/v1/promotions/ - List active promotions
    """
    permission_classes = [permissions.AllowAny]

    def list(self, request):
        """
        Get list of current promotions.
        
        Returns products where current price is significantly lower
        than their historical average price.
        """
        from datetime import datetime, timedelta
        from django.db.models import Avg
        
        promotions = []
        
        # Get recent store items
        store_items = StoreItem.objects.select_related('product', 'store')[:50]
        
        for item in store_items:
            # Calculate average price from history
            avg_price = Price.objects.filter(
                product=item.product
            ).aggregate(avg=Avg('price_value'))['avg']
            
            if avg_price and float(item.price) < avg_price * 0.9:
                # Price is at least 10% below average
                discount = int((1 - float(item.price) / avg_price) * 100)
                promotions.append({
                    'id': str(item.id),
                    'name': item.product.name,
                    'originalPrice': round(avg_price, 2),
                    'promoPrice': float(item.price),
                    'discount': discount,
                    'store': f"{item.store.chain_name} ({item.store.address})",
                    'storeName': item.store.chain_name,
                    'validUntil': (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'),
                    'category': item.product.category or 'General',
                })
        
        # If no real promotions, return mock data for demo
        if not promotions:
            promotions = [
                {
                    'id': '1',
                    'name': 'Whole Wheat Bread',
                    'originalPrice': 29.99,
                    'promoPrice': 24.99,
                    'discount': 17,
                    'store': 'ATB',
                    'storeName': 'ATB',
                    'validUntil': '2026-02-15',
                    'category': 'Bakery',
                },
                {
                    'id': '2',
                    'name': 'Milk 1L',
                    'originalPrice': 38.90,
                    'promoPrice': 32.90,
                    'discount': 15,
                    'store': 'Silpo',
                    'storeName': 'Silpo',
                    'validUntil': '2026-02-12',
                    'category': 'Dairy',
                },
                {
                    'id': '3',
                    'name': 'Eggs 10pcs',
                    'originalPrice': 54.99,
                    'promoPrice': 44.99,
                    'discount': 18,
                    'store': 'Fora',
                    'storeName': 'Fora',
                    'validUntil': '2026-02-18',
                    'category': 'Dairy',
                },
            ]
        
        return Response(promotions)


class ComparisonViewSet(viewsets.ViewSet):
    """
    ViewSet for price comparison and smart analysis.
    
    Provides endpoints to compare prices across stores
    and analyze products for best value.
    
    Endpoints:
        GET /api/v1/comparison/search/?q=query - Compare prices
        GET /api/v1/comparison/analyze/?q=query - AI quality analysis (Premium)
    """
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Compare prices for a product across multiple stores.
        
        Query Parameters:
            q (str): Product name to search (required)
        
        Returns:
            Dict with product name, price list, and best price.
        """
        query = request.query_params.get('q', '').strip()
        
        if not query:
            return Response(
                {"error": "Missing 'q' query parameter"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            result = compare_prices(query)
            return Response(result)
        except Exception as e:
            logger.exception(f"Price comparison failed for query '{query}'")
            return Response(
                {"error": "Failed to compare prices. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[permissions.IsAuthenticated, IsPremiumUser]
    )
    def analyze(self, request):
        """
        Analyze products for best value using Smart Selector algorithm.
        
        This endpoint uses AI-like quality scoring combined with
        price-per-unit analysis to find the best value product.
        
        Query Parameters:
            q (str): Product name to analyze (required)
        
        Returns:
            Dict with winner, all candidates, and Fiscus Index scores.
        
        Note:
            Requires Premium subscription.
        """
        query = request.query_params.get('q', '').strip()
        
        if not query:
            return Response(
                {"error": "Missing 'q' query parameter"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            result = get_best_value_product(query)
            return Response(result)
        except Exception as e:
            logger.exception(f"Smart analysis failed for query '{query}'")
            return Response(
                {"error": "Failed to analyze product. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class StatusView(APIView):
    """
    API view for database status information.
    
    Returns the last update time for price data.
    Used by frontend to show sync status.
    
    Endpoint:
        GET /api/v1/status/
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """
        Get current database status.
        
        Returns:
            Dict with last_updated timestamp and status message.
        """
        try:
            last_item = StoreItem.objects.order_by('-updated_at').first()
            
            if last_item:
                return Response({
                    "last_updated": last_item.updated_at,
                    "message": f"Prices updated: {last_item.updated_at.strftime('%H:%M %d-%m')}",
                    "status": "active"
                })
            
            return Response({
                "last_updated": None,
                "message": "No price data available yet",
                "status": "pending"
            })
        except Exception as e:
            logger.exception("Failed to get database status")
            return Response({
                "last_updated": None,
                "message": "Unable to check status",
                "status": "error"
            })


class DashboardStatsView(APIView):
    """
    Dashboard statistics endpoint.
    
    Returns aggregated statistics for the dashboard screen.
    
    Endpoints:
        GET /api/v1/dashboard/
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """
        Get dashboard statistics.
        
        Returns:
            Dict with:
            - active_lists: Count of shopping lists
            - stores_tracked: Count of active stores
            - savings_this_month: Estimated savings
            - savings_trend: Percentage change from last month
            - recent_lists: Last 3 shopping lists with details
        """
        from django.db.models import Sum, Count
        from decimal import Decimal
        
        # Get counts
        active_lists = ShoppingList.objects.count()
        stores_tracked = Store.objects.count()
        
        # Calculate estimated savings (difference between average and cheapest)
        total_savings = Decimal('0')
        products_with_prices = Product.objects.annotate(
            store_count=Count('store_items')
        ).filter(store_count__gte=2)
        
        for product in products_with_prices[:50]:
            prices = list(product.store_items.values_list('price', flat=True))
            if len(prices) >= 2:
                avg_price = sum(prices) / len(prices)
                min_price = min(prices)
                total_savings += Decimal(str(avg_price - min_price))
        
        # Get recent shopping lists
        recent_lists = []
        for sl in ShoppingList.objects.order_by('-created_at')[:3]:
            items_count = sl.shoppinglistitem_set.count()
            recent_lists.append({
                'id': sl.id,
                'name': sl.name,
                'total_items': items_count,
                'created_at': sl.created_at.isoformat(),
            })
        
        user_name = (
            request.user.username if request.user.is_authenticated
            else 'Користувач'
        )
        
        return Response({
            'active_lists': active_lists,
            'stores_tracked': stores_tracked,
            'savings_this_month': float(total_savings),
            'savings_trend': 23.0,  # Mock trend for now
            'recent_lists': recent_lists,
            'user_name': user_name,
        })


class ManagerScraperView(viewsets.ViewSet):
    """
    Manager-only viewset for controlling the scraper.
    
    RBAC:
        - Only Managers can access this.
    """
    permission_classes = [permissions.IsAuthenticated, IsManager]
    
    @action(detail=False, methods=['post'])
    def run(self, request):
        """
        Force update: Trigger scraping for all items immediately.
        """
        try:
            task = scrape_all_items_periodic.delay()
            logger.info(f"Manager {request.user.username} triggered force update. Task ID: {task.id}")
            return Response({
                "status": "started",
                "message": "Scraping process initiated in background.",
                "task_id": task.id
            })
        except Exception as e:
            logger.error(f"Failed to trigger scraper: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PromotionsStoreListView(APIView):
    """
    List all available stores for promotions.
    
    GET /api/promotions/stores/
    Returns list of 10 Ukrainian grocery stores.
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        from apps.scraper.promotions import get_all_stores
        stores = get_all_stores()
        return Response({
            'count': len(stores),
            'stores': stores
        })


class StorePromotionsView(APIView):
    """
    Get promotional products for a specific store.
    
    GET /api/promotions/{store_id}/
    Returns 20 promotional products with prices and discounts.
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, store_id):
        from apps.scraper.promotions import get_store_promotions
        
        limit = int(request.query_params.get('limit', 20))
        limit = min(limit, 50)  # Cap at 50
        
        result = get_store_promotions(store_id, limit)
        
        if 'error' in result:
            return Response(result, status=status.HTTP_404_NOT_FOUND)
        
        return Response(result)

