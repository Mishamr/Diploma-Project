"""
Premium views — inflation analytics.
"""

from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg, Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.models import Price, Product, Chain


@api_view(['GET'])
@permission_classes([AllowAny])
def inflation_analytics_view(request):
    """
    GET /api/v1/analytics/inflation/
    Calculate average price changes over time.
    """
    days = int(request.query_params.get('days', 30))
    category = request.query_params.get('category')

    cutoff = timezone.now() - timedelta(days=days)

    price_qs = Price.objects.filter(recorded_at__gte=cutoff)
    if category:
        price_qs = price_qs.filter(store_item__product__category__slug=category)

    # Group by date and calculate average price
    daily_avg = (
        price_qs
        .extra(select={'date': 'DATE(recorded_at)'})
        .values('date')
        .annotate(avg_price=Avg('price'), count=Count('id'))
        .order_by('date')
    )

    # By chain
    chain_data = {}
    chains = Chain.objects.filter(is_active=True)
    for chain in chains:
        chain_prices = price_qs.filter(store_item__store__chain=chain)
        avg = chain_prices.aggregate(avg=Avg('price'))['avg']
        if avg:
            chain_data[chain.slug] = {
                'name': chain.name,
                'avg_price': round(float(avg), 2),
                'products_count': chain_prices.values('store_item__product').distinct().count(),
            }

    return Response({
        'period_days': days,
        'daily_averages': list(daily_avg),
        'by_chain': chain_data,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def price_index_view(request):
    """
    GET /api/v1/analytics/price-index/
    Calculate consumer price index based on a basket of goods.
    """
    from apps.core.services.survival import SURVIVAL_CATEGORIES

    now = timezone.now()
    one_month_ago = now - timedelta(days=30)
    two_months_ago = now - timedelta(days=60)

    current_prices = {}
    previous_prices = {}

    for cat_key, cat_info in SURVIVAL_CATEGORIES.items():
        # Current month average
        current_avg = (
            Price.objects
            .filter(
                recorded_at__gte=one_month_ago,
                store_item__product__normalized_name__icontains=cat_info['keywords'][0],
            )
            .aggregate(avg=Avg('price'))['avg']
        )

        # Previous month average
        prev_avg = (
            Price.objects
            .filter(
                recorded_at__gte=two_months_ago,
                recorded_at__lt=one_month_ago,
                store_item__product__normalized_name__icontains=cat_info['keywords'][0],
            )
            .aggregate(avg=Avg('price'))['avg']
        )

        if current_avg:
            current_prices[cat_key] = {
                'category': cat_info['name'],
                'avg_price': round(float(current_avg), 2),
                'prev_avg_price': round(float(prev_avg), 2) if prev_avg else None,
                'change_pct': round((float(current_avg) / float(prev_avg) - 1) * 100, 1) if prev_avg else None,
            }

    return Response({
        'period': f"{one_month_ago.date()} — {now.date()}",
        'categories': current_prices,
    })
