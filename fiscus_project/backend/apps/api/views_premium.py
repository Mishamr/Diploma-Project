"""
Premium views — inflation analytics.
"""

from datetime import timedelta

from django.db.models import Avg, Count
from django.utils import timezone

from apps.core.models import Chain, Price, Product, Purchase
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def inflation_analytics_view(request):
    """
    GET /api/v1/analytics/inflation/
    Calculate average price changes over time.
    """
    days = int(request.query_params.get("days", 30))
    category = request.query_params.get("category")

    cutoff = timezone.now() - timedelta(days=days)

    price_qs = Price.objects.filter(recorded_at__gte=cutoff)
    if category:
        price_qs = price_qs.filter(store_item__product__category__slug=category)

    # Group by date and calculate average price
    daily_avg = (
        price_qs.extra(select={"date": "DATE(recorded_at)"})
        .values("date")
        .annotate(avg_price=Avg("price"), count=Count("id"))
        .order_by("date")
    )

    # By chain
    chain_data = {}
    chains = Chain.objects.filter(is_active=True)
    for chain in chains:
        chain_prices = price_qs.filter(store_item__store__chain=chain)
        avg = chain_prices.aggregate(avg=Avg("price"))["avg"]
        if avg:
            chain_data[chain.slug] = {
                "name": chain.name,
                "avg_price": round(float(avg), 2),
                "products_count": chain_prices.values("store_item__product")
                .distinct()
                .count(),
            }

    return Response(
        {
            "period_days": days,
            "daily_averages": list(daily_avg),
            "by_chain": chain_data,
        }
    )


@api_view(["GET"])
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
        current_avg = Price.objects.filter(
            recorded_at__gte=one_month_ago,
            store_item__product__normalized_name__icontains=cat_info["keywords"][0],
        ).aggregate(avg=Avg("price"))["avg"]

        # Previous month average
        prev_avg = Price.objects.filter(
            recorded_at__gte=two_months_ago,
            recorded_at__lt=one_month_ago,
            store_item__product__normalized_name__icontains=cat_info["keywords"][0],
        ).aggregate(avg=Avg("price"))["avg"]

        if current_avg:
            current_prices[cat_key] = {
                "category": cat_info["name"],
                "avg_price": round(float(current_avg), 2),
                "prev_avg_price": round(float(prev_avg), 2) if prev_avg else None,
                "change_pct": (
                    round((float(current_avg) / float(prev_avg) - 1) * 100, 1)
                    if prev_avg
                    else None
                ),
            }

    return Response(
        {
            "period": f"{one_month_ago.date()} — {now.date()}",
            "categories": current_prices,
        }
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def user_analytics_view(request):
    """
    GET /api/v1/analytics/user/
    Return user purchase stats (total spent, saved, latest purchases, last login).

    POST /api/v1/analytics/user/
    Save a new purchase.
    """
    if request.method == "POST":
        data = request.data
        try:
            purchase = Purchase.objects.create(
                user=request.user,
                chain_name=data.get("chain_name", "Unknown"),
                chain_slug=data.get("chain_slug", "unknown"),
                total_price=data.get("total_price", 0),
                saved_amount=data.get("saved_amount", 0),
                items_count=data.get("items_count", 0),
            )
            return Response(
                {"status": "ok", "id": purchase.id}, status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # GET method
    purchases = Purchase.objects.filter(user=request.user)

    from django.db.models import Sum

    total_spent = purchases.aggregate(total=Sum("total_price"))["total"] or 0
    total_saved = purchases.aggregate(total=Sum("saved_amount"))["total"] or 0

    last_login = request.user.last_login

    recent_purchases = purchases.order_by("-created_at")[:10]
    history = [
        {
            "id": p.id,
            "chain_name": p.chain_name,
            "chain_slug": p.chain_slug,
            "total_price": float(p.total_price),
            "saved_amount": float(p.saved_amount),
            "items_count": p.items_count,
            "date": p.created_at.isoformat(),
        }
        for p in recent_purchases
    ]

    return Response(
        {
            "total_spent": float(total_spent),
            "total_saved": float(total_saved),
            "last_login": last_login.isoformat() if last_login else None,
            "history": history,
            "purchases_count": purchases.count(),
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def expense_calendar_view(request):
    """
    GET /api/v1/analytics/calendar/
    Aggregate purchases by month/year for the current user.
    """
    from django.db.models import Sum
    from django.db.models.functions import ExtractMonth, ExtractYear

    purchases = Purchase.objects.filter(user=request.user)

    stats = (
        purchases.annotate(
            month=ExtractMonth("created_at"), year=ExtractYear("created_at")
        )
        .values("year", "month")
        .annotate(
            total_spent=Sum("total_price"),
            total_saved=Sum("saved_amount"),
            count=Count("id"),
        )
        .order_by("-year", "-month")
    )

    # Convert Decimals to floats for JSON
    results = []
    for s in stats:
        results.append(
            {
                "year": s["year"],
                "month": s["month"],
                "total_spent": float(s["total_spent"]),
                "total_saved": float(s["total_saved"]),
                "count": s["count"],
            }
        )

    return Response(results)
