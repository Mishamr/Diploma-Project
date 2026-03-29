"""
Main API views — products, shopping lists, promotions, survival.
"""

import json
import logging
import os
import urllib.request
from pathlib import Path

logger = logging.getLogger(__name__)

from django.db.models import Q

from dotenv import load_dotenv
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

# Load env variables from root .env
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")

from apps.core.models import (
    Category,
    Product,
    ShoppingList,
    ShoppingListItem,
    StoreItem,
)
from apps.core.services.promotions import get_price_history, get_top_promotions
from apps.core.services.survival import (
    call_ai_provider,
    generate_survival_basket,
    get_ai_substitutions,
)

from .serializers import (
    CategorySerializer,
    ProductSerializer,
    ProductWithPricesSerializer,
    ShoppingListItemSerializer,
    ShoppingListSerializer,
)


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/v1/products/       — list all products
    GET /api/v1/products/{id}/  — product detail
    GET /api/v1/products/{id}/prices/ — price history
    """

    queryset = Product.objects.select_related("category").all()
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProductWithPricesSerializer
        return ProductSerializer

    @action(detail=True, methods=["get"])
    def prices(self, request, pk=None):
        """Get price history for a product."""
        product = self.get_object()
        days = int(request.query_params.get("days", 30))
        history = get_price_history(product.id, days)
        return Response(history)

    def get_queryset(self):
        qs = super().get_queryset()
        # Filter by category
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category__slug=category)
        # Search by name
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)

        # Filter by chain
        chain_slug = self.request.query_params.get("chain")
        if chain_slug:
            qs = qs.filter(store_items__store__chain__slug=chain_slug).distinct()

        return qs


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/v1/categories/ — list categories
    """

    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_queryset(self):
        qs = Category.objects.all()
        chain = self.request.query_params.get("chain")
        if chain:
            qs = qs.filter(products__store_items__store__chain__slug=chain).distinct()
        return qs

    permission_classes = [AllowAny]


class ShoppingListViewSet(viewsets.ModelViewSet):
    """
    CRUD for shopping lists.
    """

    serializer_class = ShoppingListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ShoppingList.objects.filter(user=self.request.user).prefetch_related(
            "items"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def add_item(self, request, pk=None):
        """Add item to shopping list."""
        shopping_list = self.get_object()
        product_id = request.data.get("product_id")
        custom_name = request.data.get("custom_name", "")
        quantity = int(request.data.get("quantity", 1))

        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            product_id=product_id if product_id else None,
            custom_name=custom_name,
            quantity=quantity,
        )
        return Response(
            ShoppingListItemSerializer(item).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"], url_path="toggle-item/(?P<item_id>[^/.]+)")
    def toggle_item(self, request, pk=None, item_id=None):
        """Toggle checked status of a shopping list item."""
        shopping_list = self.get_object()
        try:
            item = shopping_list.items.get(id=item_id)
            item.is_checked = not item.is_checked
            item.save(update_fields=["is_checked"])
            return Response(ShoppingListItemSerializer(item).data)
        except ShoppingListItem.DoesNotExist:
            return Response(
                {"error": "Item not found"}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=["delete"], url_path="remove-item/(?P<item_id>[^/.]+)")
    def remove_item(self, request, pk=None, item_id=None):
        """Remove item from shopping list."""
        shopping_list = self.get_object()
        try:
            item = shopping_list.items.get(id=item_id)
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ShoppingListItem.DoesNotExist:
            return Response(
                {"error": "Item not found"}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=["get"], url_path="smart-calculate")
    def smart_calculate(self, request, pk=None):
        """Calculate cheapest store for the entire shopping list based on user location."""
        shopping_list = self.get_object()
        lat = request.query_params.get("lat")
        lon = request.query_params.get("lon")
        radius_km = float(request.query_params.get("radius", 5.0))

        import math

        from apps.core.models import Store

        def haversine(lon1, lat1, lon2, lat2):
            """Calculate distance between two GPS coordinates in km."""
            lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
            dlon = lon2 - lon1
            dlat = lat2 - lat1
            a = (
                math.sin(dlat / 2) ** 2
                + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
            )
            return 6371 * 2 * math.asin(math.sqrt(a))

        all_stores = Store.objects.filter(is_active=True).select_related("chain")
        nearby_stores = []
        if lat and lon:
            lat = float(lat)
            lon = float(lon)
            for store in all_stores:
                if store.latitude and store.longitude:
                    dist = haversine(lon, lat, store.longitude, store.latitude)
                    if dist <= radius_km:
                        store.distance = dist
                        nearby_stores.append(store)
            nearby_stores.sort(key=lambda s: s.distance)
        else:
            nearby_stores = list(all_stores)
            for s in nearby_stores:
                s.distance = None

        list_items = shopping_list.items.filter(product__isnull=False).select_related(
            "product"
        )
        if not list_items.exists():
            return Response(
                {"error": "У списку немає товарів для порівняння."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        results = []
        for store in nearby_stores:
            store_total = 0.0
            items_found = 0
            missing_items = []

            for list_item in list_items:
                # Optimized query for store items
                store_item = store.items.filter(
                    product=list_item.product, in_stock=True
                ).first()
                if store_item:
                    latest_price = store_item.prices.order_by("-recorded_at").first()
                    if latest_price:
                        store_total += float(latest_price.price) * list_item.quantity
                        items_found += 1
                        continue

                missing_items.append(list_item.product.name)

            if items_found > 0:
                results.append(
                    {
                        "store_id": store.id,
                        "store_name": store.name,
                        "chain_name": store.chain.name,
                        "chain_slug": store.chain.slug,
                        "distance_km": (
                            round(store.distance, 2)
                            if store.distance is not None
                            else None
                        ),
                        "total_price": round(store_total, 2),
                        "items_found": items_found,
                        "total_items": len(list_items),
                        "missing_items": missing_items,
                    }
                )

        # Sort by most items found, then lowest total price
        results.sort(key=lambda x: (-x["items_found"], x["total_price"]))

        return Response(
            {
                "shopping_list_name": shopping_list.name,
                "total_list_items": len(list_items),
                "results": results[:20],
            }
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def promotions_view(request):
    """GET /api/v1/promotions/ — top promotions."""
    limit = int(request.query_params.get("limit", 20))
    chain = request.query_params.get("chain")
    promos = get_top_promotions(limit=limit, chain_slug=chain)
    return Response(promos)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def survival_basket_view(request):
    """GET /api/v1/survival/ — budget survival basket."""
    # profile = request.user.profile
    # if not profile.is_pro:
    #     if profile.tickets < 1:
    #         return Response(
    #             {"error": "Недостатньо тікетів"},
    #             status=status.HTTP_402_PAYMENT_REQUIRED,
    #         )
    #     profile.tickets -= 1
    #     profile.save(update_fields=["tickets"])

    budget = float(request.query_params.get("budget", 5000))
    days = int(request.query_params.get("days", 7))
    lat = request.query_params.get("lat")
    lon = request.query_params.get("lon")
    chain = request.query_params.get("chain")

    basket = generate_survival_basket(
        budget=budget,
        days=days,
        lat=float(lat) if lat else None,
        lon=float(lon) if lon else None,
        chain=chain,
    )
    return Response(basket)


@api_view(["POST"])
@permission_classes([AllowAny])
def survival_substitute_view(request):
    """POST /api/v1/survival/substitute/ — AI substitution recommendations."""
    item_name = request.data.get("item_name", "")
    item_price = float(request.data.get("item_price", 0))
    budget = float(request.data.get("budget", 5000))
    days = int(request.data.get("days", 7))
    lat = request.data.get("lat")
    lon = request.data.get("lon")
    chain = request.data.get("chain")

    if not item_name:
        return Response(
            {"error": "item_name required"}, status=status.HTTP_400_BAD_REQUEST
        )

    result = get_ai_substitutions(
        item_name=item_name,
        item_price=item_price,
        budget=budget,
        days=days,
        user_lat=float(lat) if lat else None,
        user_lon=float(lon) if lon else None,
        chain=chain,
    )
    return Response(result)


@api_view(["GET"])
@permission_classes([AllowAny])
def compare_prices_view(request):
    """
    GET /api/v1/compare/?product_id=X
    Compare prices for a product across all stores.
    """
    product_id = request.query_params.get("product_id")
    if not product_id:
        return Response(
            {"error": "product_id required"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response(
            {"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND
        )

    store_items = StoreItem.objects.filter(
        product=product, in_stock=True
    ).select_related("store__chain")

    prices = []
    for si in store_items:
        latest = si.prices.order_by("-recorded_at").first()
        if latest:
            prices.append(
                {
                    "chain": si.store.chain.name,
                    "chain_slug": si.store.chain.slug,
                    "store": si.store.name,
                    "store_id": si.store.id,
                    "price": float(latest.price),
                    "old_price": float(latest.old_price) if latest.old_price else None,
                    "is_promo": latest.is_promo,
                    "recorded_at": latest.recorded_at.isoformat(),
                }
            )

    return Response(
        {
            "product": ProductSerializer(product).data,
            "prices": sorted(prices, key=lambda x: x["price"]),
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def compare_cart_view(request):
    """
    POST /api/v1/compare-cart/
    Body: {"items": [{"product_id": 1, "quantity": 2}, ...]}
    Returns cost for each chain.
    """
    items_data = request.data.get("items", [])
    lat = request.data.get("lat")
    lon = request.data.get("lon")
    radius_km = float(request.data.get("radius", 5.0))

    if not isinstance(items_data, list):
        return Response(
            {"error": "items must be a list"}, status=status.HTTP_400_BAD_REQUEST
        )

    product_qties = {}
    for item in items_data:
        pid = item.get("product_id")
        if pid:
            product_qties[pid] = int(item.get("quantity", 1))

    if not product_qties:
        return Response({"total_requested": 0, "results": []})

    products = Product.objects.filter(id__in=product_qties.keys())

    from apps.core.models import Chain, Store

    results_data = []

    if lat and lon:
        import math

        def haversine(lon1, lat1, lon2, lat2):
            lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
            a = (
                math.sin((lat2 - lat1) / 2) ** 2
                + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
            )
            return 6371 * 2 * math.asin(math.sqrt(a))

        lat, lon = float(lat), float(lon)
        stores = []
        for store in Store.objects.filter(is_active=True).select_related("chain"):
            if store.latitude and store.longitude:
                d = haversine(lon, lat, store.longitude, store.latitude)
                if d <= radius_km:
                    store.distance = d
                    stores.append(store)

        for store in stores:
            store_total = 0.0
            items_found = 0
            missing = []

            for p in products:
                qty = product_qties[p.id]
                si = store.items.filter(product=p, in_stock=True).first()
                if si:
                    latest = si.prices.order_by("-recorded_at").first()
                    if latest:
                        store_total += float(latest.price) * qty
                        items_found += 1
                        continue
                missing.append(p.name)

            if items_found > 0:
                results_data.append(
                    {
                        "chain": f"{store.chain.name} ({round(store.distance, 1)} км)",
                        "chain_slug": store.chain.slug,
                        "total_price": store_total,
                        "items_found": items_found,
                        "missing": missing,
                    }
                )

        results_data.sort(key=lambda x: (-x["items_found"], x["total_price"]))

    else:
        chains_data = {}
        for chain in Chain.objects.filter(is_active=True):
            chains_data[chain.slug] = {
                "chain": chain.name,
                "chain_slug": chain.slug,
                "total_price": 0.0,
                "items_found": 0,
                "missing": [],
            }

        for p in products:
            qty = product_qties[p.id]
            store_items = StoreItem.objects.filter(
                product=p, in_stock=True
            ).select_related("store__chain")
            chain_best = {}
            for si in store_items:
                latest = si.prices.order_by("-recorded_at").first()
                if latest:
                    cslug = si.store.chain.slug
                    pval = float(latest.price)
                    if cslug not in chain_best or pval < chain_best[cslug]:
                        chain_best[cslug] = pval

            for c_slug, c_info in chains_data.items():
                if c_slug in chain_best:
                    c_info["total_price"] += chain_best[c_slug] * qty
                    c_info["items_found"] += 1
                else:
                    c_info["missing"].append(p.name)

        results_data = sorted(
            [c for c in chains_data.values() if c["items_found"] > 0],
            key=lambda x: (-x["items_found"], x["total_price"]),
        )

    return Response(
        {"total_requested": len(product_qties), "results": results_data[:15]}
    )


def get_ai_context(query, user=None):
    """Fetch relevant data from DB to provide context for AI."""
    context_parts = []

    # 1. Search for products and prices
    keywords = [k.strip() for k in query.split() if len(k) > 2]
    if keywords:
        q_obj = Q()
        for k in keywords:
            q_obj |= Q(normalized_name__icontains=k)

        # Get top 15 matching products with latest prices
        products = Product.objects.filter(q_obj)[:15]
        if products:
            context_parts.append("Знайдені товари та ціни:")
            for p in products:
                # Get latest price for each store item of this product
                items = p.store_items.all()
                for item in items:
                    latest_price = item.prices.order_by("-recorded_at").first()
                    if latest_price:
                        promo = "(АКЦІЯ!)" if latest_price.is_promo else ""
                        context_parts.append(
                            f"- {p.name} ({item.store.chain.name}): {latest_price.price} грн {promo}"
                        )

    # 2. User Shopping List (if authenticated)
    if user and user.is_authenticated:
        sl = user.shopping_lists.first()
        if sl:
            items = sl.items.all()
            if items:
                context_parts.append("\nСписок покупок користувача:")
                for i in items:
                    context_parts.append(
                        f"- {i.product.name} ({i.quantity} {i.product.unit})"
                    )

    # 3. User Personalization (Gemini-style)
    if user and user.is_authenticated:
        try:
            profile = user.profile
            person_info = []
            if profile.ai_custom_name:
                person_info.append(f"Ім'я користувача: {profile.ai_custom_name}")
            if profile.ai_allergies:
                person_info.append(f"Алергії/Обмеження: {profile.ai_allergies}")
            if profile.ai_instructions:
                person_info.append(f"Особисті побажання: {profile.ai_instructions}")

            if person_info:
                context_parts.append("\nПРОФІЛЬ КОРИСТУВАЧА:")
                context_parts.extend(person_info)
        except Exception:  # nosec B110
            pass

    return "\n".join(context_parts)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_chat_view(request):
    """
    POST /api/v1/ai/chat/
    Proxy for Gemini API — keeps key server-side.
    Body: { "message": str, "context": str (optional) }
    """
    profile = request.user.profile

    message = request.data.get("message", "").strip()
    context_extra = request.data.get(
        "context", ""
    )  # Renamed to avoid confusion with system prompt context
    api_key_groq = os.environ.get("GROQ_API_KEY", "")
    api_key_or = os.environ.get("OPENROUTER_API_KEY", "")
    api_key_gemini = os.environ.get("GEMINI_API_KEY", "")
    if not api_key_groq and not api_key_or and not api_key_gemini:
        return Response(
            {"error": "AI API keys not configured. Add GROQ_API_KEY to .env"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Fetch smart context from DB
    db_context = get_ai_context(message, request.user)

    system_prompt = f"""Ти — професійний та емпатичний фінансовий і дієтологічний консультант додатку Fiscus.
Твоє головне завдання: допомагати користувачеві приймати найкращі рішення щодо покупок, економії грошей та збалансованого харчування.
Ти ідеально орієнтуєшся в цінах мереж (АТБ, Сільпо, Ашан), знаєш усі акції та вмієш знаходити приховані можливості для заощаджень.

ПРАВИЛА ТВОЄЇ РОБОТИ:
1. Завжди звертайся до користувача з повагою, теплотою і як справжній експерт. Якщо є ім'я у профілі — використовуй його.
2. СУВОРО враховуй усі медичні та дієтичні обмеження (алергії, непереносимість): НІКОЛИ не рекомендуй те, що може зашкодити користувачу!
3. Завжди підкріплюй свої поради конкретними товарами з бази. Не кажи абстрактне "купіть макарони", а кажи "Ось макарони від ТМ Pasta у Сільпо за 34.00 ₴".
4. Якщо запит стосується здоров'я, спочатку перевіряй наявність дієти у налаштуваннях. Якщо її немає — делікатно порадь заповнити особистий профіль.
5. Розписуй свої відповіді структуровано: використовуй списки, короткі абзаци та виділяй головні цифри.
6. Будь проактивним: окрім відповіді на питання, порадь 1-2 додаткові хитрощі для заощадження!

{'[PRO РЕЖИМ АКТИВНИЙ: Ти повинен надати максимально глибокий та всебічний фінансовий аналіз.]' if profile.is_pro else ''}

ДАНІ ПРОФІЛЮ ТА ТОП ТОВАРИ (БАЗА ДАНИХ):
{db_context}

ПОТОЧНИЙ КОНТЕКСТ КОРИСТУВАЧА (ЕКРАН/КОШИК):
{context_extra}"""

    try:
        logger.info(f"AI Chat Request: {message[:100]}...")
        reply = call_ai_provider(system_prompt + "\n\nUser: " + message, max_tokens=512, temperature=0.4)
        if reply and not str(reply).startswith("Error:"):
            logger.info("AI Chat Response Success")
            return Response({"reply": reply})
        else:
            logger.warning(f"AI Chat Provider failed: {reply}")
            return Response(
                {"error": reply if reply else "AI тимчасово недоступний"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
    except Exception as e:
        logger.error(f"AI Chat Exception: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
