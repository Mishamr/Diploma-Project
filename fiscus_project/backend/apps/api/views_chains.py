"""
Chain views — DB-only queries, no live scraping.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.models import Chain, Store, StoreItem, Price
from apps.geo.services import find_nearest_store
from .serializers import ChainSerializer, StoreSerializer, StoreItemSerializer


class ChainViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/v1/chains/       — list 10 chains with store count
    GET /api/v1/chains/{slug}/ — chain detail
    """
    queryset = Chain.objects.filter(
        is_active=True, 
        stores__items__in_stock=True
    ).distinct()
    serializer_class = ChainSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'

    @action(detail=True, methods=['get'])
    def products(self, request, slug=None):
        """
        GET /api/v1/chains/{slug}/products/?lat=49.84&lon=24.02

        Flow:
        1. Find nearest Store of this chain using Haversine
        2. Get StoreItems + latest Price for that store
        3. Return products with in_stock status
        ~50ms response (DB query only)
        """
        chain = self.get_object()
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')

        # Find nearest store
        if lat and lon:
            nearest = find_nearest_store(
                float(lat), float(lon),
                chain_slug=chain.slug,
            )
        else:
            nearest = Store.objects.filter(chain=chain, is_active=True).first()

        if not nearest:
            return Response(
                {'error': f'Магазинів мережі {chain.name} не знайдено'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get products with latest prices
        store_items = (
            StoreItem.objects
            .filter(store=nearest)
            .select_related('product', 'product__category', 'store', 'store__chain')
            .prefetch_related('prices')
        )

        products = []
        for si in store_items:
            latest_price = si.prices.order_by('-recorded_at').first()
            if latest_price:
                products.append({
                    'id': si.product.id,
                    'name': si.product.name,
                    'brand': si.product.brand,
                    'weight': si.product.weight,
                    'category': si.product.category.name if si.product.category else '',
                    'image_url': si.product.best_image_url,
                    'price': float(latest_price.price),
                    'old_price': float(latest_price.old_price) if latest_price.old_price else None,
                    'is_promo': latest_price.is_promo,
                    'in_stock': si.in_stock,
                })

        return Response({
            'chain': ChainSerializer(chain).data,
            'store': StoreSerializer(nearest).data,
            'products_count': len(products),
            'products': sorted(products, key=lambda x: x['name']),
        })

    @action(detail=True, methods=['get'])
    def stores(self, request, slug=None):
        """GET /api/v1/chains/{slug}/stores/ — list stores of a chain."""
        chain = self.get_object()
        stores = Store.objects.filter(chain=chain, is_active=True)
        serializer = StoreSerializer(stores, many=True)
        return Response(serializer.data)
