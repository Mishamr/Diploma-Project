"""
API monitoring — health check and scraper status.
"""

from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.models import Chain, Store, Product, Price, StoreItem


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """GET /api/v1/health/ — system health."""
    return Response({
        'status': 'ok',
        'timestamp': timezone.now().isoformat(),
        'version': '3.0.0',
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def scraper_status(request):
    """GET /api/v1/status/ — scraper pipeline status."""
    now = timezone.now()
    last_24h = now - timedelta(hours=24)

    chains = Chain.objects.filter(is_active=True)
    chain_status = []

    for chain in chains:
        latest_scrape = (
            StoreItem.objects
            .filter(store__chain=chain)
            .order_by('-last_scraped')
            .values_list('last_scraped', flat=True)
            .first()
        )

        products_count = (
            StoreItem.objects
            .filter(store__chain=chain, in_stock=True)
            .count()
        )

        recent_prices = (
            Price.objects
            .filter(
                store_item__store__chain=chain,
                recorded_at__gte=last_24h,
            )
            .count()
        )

        chain_status.append({
            'chain': chain.name,
            'slug': chain.slug,
            'scraper_type': chain.scraper_type,
            'products_in_stock': products_count,
            'prices_last_24h': recent_prices,
            'last_scrape': latest_scrape.isoformat() if latest_scrape else None,
        })

    return Response({
        'timestamp': now.isoformat(),
        'total_products': Product.objects.count(),
        'total_prices': Price.objects.count(),
        'total_stores': Store.objects.filter(is_active=True).count(),
        'chains': chain_status,
    })
