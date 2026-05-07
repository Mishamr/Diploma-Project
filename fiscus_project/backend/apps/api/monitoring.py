"""
API monitoring — health check, scraper status, scraper trigger.
"""

import threading
from datetime import timedelta

from django.utils import timezone

from apps.core.models import Chain, Price, Product, Store, StoreItem
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

# Global log buffer for SSE streaming (thread-safe, max 500 lines)
_LOG_BUFFER: list[str] = []
_LOG_LOCK = threading.Lock()
_SCRAPER_RUNNING = False


def _log(msg: str):
    """Append to in-memory SSE log buffer."""
    ts = timezone.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    with _LOG_LOCK:
        _LOG_BUFFER.append(line)
        if len(_LOG_BUFFER) > 500:
            _LOG_BUFFER.pop(0)


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """GET /api/v1/health/ — system health."""
    return Response(
        {
            "status": "ok",
            "timestamp": timezone.now().isoformat(),
            "version": "3.0.0",
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def scraper_status(request):
    """GET /api/v1/status/ — scraper pipeline status."""
    now = timezone.now()
    last_24h = now - timedelta(hours=24)

    chains = Chain.objects.filter(is_active=True)
    chain_status = []

    for chain in chains:
        latest_scrape = (
            StoreItem.objects.filter(store__chain=chain)
            .order_by("-last_scraped")
            .values_list("last_scraped", flat=True)
            .first()
        )

        products_count = StoreItem.objects.filter(
            store__chain=chain, in_stock=True
        ).count()

        recent_prices = Price.objects.filter(
            store_item__store__chain=chain,
            recorded_at__gte=last_24h,
        ).count()

        stores = Store.objects.filter(chain=chain, is_active=True)
        store_list = [
            {"id": s.id, "name": s.name, "city": s.city, "address": s.address}
            for s in stores
        ]

        chain_status.append(
            {
                "chain": chain.name,
                "slug": chain.slug,
                "scraper_type": chain.scraper_type,
                "products_in_stock": products_count,
                "prices_last_24h": recent_prices,
                "last_scrape": latest_scrape.isoformat() if latest_scrape else None,
                "stores": store_list,
                "has_scraper": chain.slug
                in ["atb", "silpo", "auchan", "novus", "rukavychka"],
            }
        )

    return Response(
        {
            "timestamp": now.isoformat(),
            "scraper_running": _SCRAPER_RUNNING,
            "total_products": Product.objects.count(),
            "total_prices": Price.objects.count(),
            "total_stores": Store.objects.filter(is_active=True).count(),
            "chains": chain_status,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def run_scraper_api(request):
    """POST /api/v1/scraper/run/ — trigger scraper in background thread."""
    chain = request.data.get("chain", "all")

    if _SCRAPER_RUNNING:
        return Response(
            {"status": "already_running", "message": "Скрепер вже працює"}, status=409
        )

    # Clear old logs
    with _LOG_LOCK:
        _LOG_BUFFER.clear()

    def _run_thread():
        global _SCRAPER_RUNNING
        _SCRAPER_RUNNING = True
        try:
            from apps.scraper.services import cleanup_outdated_items
            from apps.scraper.stores import ScraperFactory

            available = ScraperFactory.get_available_chains()
            chains_to_run = [chain] if chain != "all" else available

            _log(f"=== Початок: {', '.join(chains_to_run)} ===")
            _log(f"Доступні скрепери: {available}")

            for slug in chains_to_run:
                _log(f"--- Запуск: {slug.upper()} ---")
                try:
                    scraper = ScraperFactory.get_scraper(slug)
                    scraper.scrape()
                    cleanup_outdated_items(slug)
                    _log(f"--- Готово: {slug.upper()} ---")
                except Exception as e:
                    _log(f"[ПОМИЛКА] {slug}: {e}")

            _log("=== Всі скрепери завершили роботу ===")
        except Exception as e:
            _log(f"[КРИТИЧНА ПОМИЛКА] {e}")
        finally:
            _SCRAPER_RUNNING = False

    t = threading.Thread(target=_run_thread, daemon=True)
    t.start()

    return Response(
        {"status": "started", "chain": chain, "message": "Скрепер запущено"}
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def scraper_logs(request):
    """GET /api/v1/scraper/logs/ — return current log buffer as JSON."""
    with _LOG_LOCK:
        logs = list(_LOG_BUFFER)
    return Response(
        {
            "running": _SCRAPER_RUNNING,
            "logs": logs,
            "count": len(logs),
        }
    )
