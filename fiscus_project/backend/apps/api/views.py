"""
Main API views — products, shopping lists, promotions, survival.
"""

from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
import os
import urllib.request
import json
from dotenv import load_dotenv
from pathlib import Path

# Load env variables from root .env
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(dotenv_path=PROJECT_ROOT / '.env')

from apps.core.models import (
    Product, StoreItem, Price, ShoppingList, ShoppingListItem, Category,
)
from apps.core.services.survival import generate_survival_basket, get_ai_substitutions
from apps.core.services.promotions import get_top_promotions, get_price_history
from .serializers import (
    ProductSerializer, ProductWithPricesSerializer,
    ShoppingListSerializer, ShoppingListItemSerializer,
    CategorySerializer,
)


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/v1/products/       — list all products
    GET /api/v1/products/{id}/  — product detail
    GET /api/v1/products/{id}/prices/ — price history
    """
    queryset = Product.objects.select_related('category').all()
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductWithPricesSerializer
        return ProductSerializer

    @action(detail=True, methods=['get'])
    def prices(self, request, pk=None):
        """Get price history for a product."""
        product = self.get_object()
        days = int(request.query_params.get('days', 30))
        history = get_price_history(product.id, days)
        return Response(history)

    def get_queryset(self):
        qs = super().get_queryset()
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__slug=category)
        # Search by name
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        
        # Filter by chain
        chain_slug = self.request.query_params.get('chain')
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
        chain = self.request.query_params.get('chain')
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
        return ShoppingList.objects.filter(user=self.request.user).prefetch_related('items')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        """Add item to shopping list."""
        shopping_list = self.get_object()
        product_id = request.data.get('product_id')
        custom_name = request.data.get('custom_name', '')
        quantity = int(request.data.get('quantity', 1))

        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            product_id=product_id if product_id else None,
            custom_name=custom_name,
            quantity=quantity,
        )
        return Response(ShoppingListItemSerializer(item).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='toggle-item/(?P<item_id>[^/.]+)')
    def toggle_item(self, request, pk=None, item_id=None):
        """Toggle checked status of a shopping list item."""
        shopping_list = self.get_object()
        try:
            item = shopping_list.items.get(id=item_id)
            item.is_checked = not item.is_checked
            item.save(update_fields=['is_checked'])
            return Response(ShoppingListItemSerializer(item).data)
        except ShoppingListItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['delete'], url_path='remove-item/(?P<item_id>[^/.]+)')
    def remove_item(self, request, pk=None, item_id=None):
        """Remove item from shopping list."""
        shopping_list = self.get_object()
        try:
            item = shopping_list.items.get(id=item_id)
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ShoppingListItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([AllowAny])
def promotions_view(request):
    """GET /api/v1/promotions/ — top promotions."""
    limit = int(request.query_params.get('limit', 20))
    chain = request.query_params.get('chain')
    promos = get_top_promotions(limit=limit, chain_slug=chain)
    return Response(promos)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def survival_basket_view(request):
    """GET /api/v1/survival/ — budget survival basket."""
    profile = request.user.profile
    if not profile.is_pro:
        if profile.tickets < 1:
            return Response({'error': 'Недостатньо тікетів'}, status=status.HTTP_402_PAYMENT_REQUIRED)
        profile.tickets -= 1
        profile.save(update_fields=['tickets'])

    budget = float(request.query_params.get('budget', 5000))
    days = int(request.query_params.get('days', 7))
    lat = request.query_params.get('lat')
    lon = request.query_params.get('lon')
    chain = request.query_params.get('chain')

    basket = generate_survival_basket(
        budget=budget,
        days=days,
        lat=float(lat) if lat else None,
        lon=float(lon) if lon else None,
        chain=chain,
    )
    return Response(basket)


@api_view(['POST'])
@permission_classes([AllowAny])
def survival_substitute_view(request):
    """POST /api/v1/survival/substitute/ — AI substitution recommendations."""
    item_name = request.data.get('item_name', '')
    item_price = float(request.data.get('item_price', 0))
    budget = float(request.data.get('budget', 5000))
    days = int(request.data.get('days', 7))
    lat = request.data.get('lat')
    lon = request.data.get('lon')
    chain = request.data.get('chain')

    if not item_name:
        return Response({'error': 'item_name required'}, status=status.HTTP_400_BAD_REQUEST)

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


@api_view(['GET'])
@permission_classes([AllowAny])
def compare_prices_view(request):
    """
    GET /api/v1/compare/?product_id=X
    Compare prices for a product across all stores.
    """
    product_id = request.query_params.get('product_id')
    if not product_id:
        return Response({'error': 'product_id required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    store_items = StoreItem.objects.filter(
        product=product, in_stock=True
    ).select_related('store__chain')

    prices = []
    for si in store_items:
        latest = si.prices.order_by('-recorded_at').first()
        if latest:
            prices.append({
                'chain': si.store.chain.name,
                'chain_slug': si.store.chain.slug,
                'store': si.store.name,
                'store_id': si.store.id,
                'price': float(latest.price),
                'old_price': float(latest.old_price) if latest.old_price else None,
                'is_promo': latest.is_promo,
                'recorded_at': latest.recorded_at.isoformat(),
            })

    return Response({
        'product': ProductSerializer(product).data,
        'prices': sorted(prices, key=lambda x: x['price']),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def compare_cart_view(request):
    """
    POST /api/v1/compare-cart/
    Body: {"items": [{"product_id": 1, "quantity": 2}, ...]}
    Returns cost for each chain.
    """
    items_data = request.data.get('items', [])
    if not isinstance(items_data, list):
        return Response({'error': 'items must be a list'}, status=status.HTTP_400_BAD_REQUEST)

    chains_data = {}
    from apps.core.models import Chain
    for chain in Chain.objects.filter(is_active=True):
        chains_data[chain.slug] = {
            'chain': chain.name,
            'chain_slug': chain.slug,
            'total_price': 0.0,
            'items_found': 0,
            'missing': [],
        }

    for item in items_data:
        product_id = item.get('product_id')
        qty = int(item.get('quantity', 1))

        if not product_id:
            continue

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            continue

        store_items = StoreItem.objects.filter(
            product=product, in_stock=True
        ).select_related('store__chain')

        chain_best_price = {}
        for si in store_items:
            latest = si.prices.order_by('-recorded_at').first()
            if latest:
                chain_slug = si.store.chain.slug
                price_val = float(latest.price)
                if chain_slug not in chain_best_price or price_val < chain_best_price[chain_slug]:
                    chain_best_price[chain_slug] = price_val

        for c_slug, c_info in chains_data.items():
            if c_slug in chain_best_price:
                c_info['total_price'] += chain_best_price[c_slug] * qty
                c_info['items_found'] += 1
            else:
                c_info['missing'].append(product.name)

    results = sorted(list(chains_data.values()), key=lambda x: (-x['items_found'], x['total_price']))
    
    return Response({
        'total_requested': len([i for i in items_data if i.get('product_id')]),
        'results': results
    })


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
                    latest_price = item.prices.order_by('-recorded_at').first()
                    if latest_price:
                        promo = "(АКЦІЯ!)" if latest_price.is_promo else ""
                        context_parts.append(f"- {p.name} ({item.store.chain.name}): {latest_price.price} грн {promo}")
    
    # 2. User Shopping List (if authenticated)
    if user and user.is_authenticated:
        sl = user.shopping_lists.first()
        if sl:
            items = sl.items.all()
            if items:
                context_parts.append("\nСписок покупок користувача:")
                for i in items:
                    context_parts.append(f"- {i.product.name} ({i.quantity} {i.product.unit})")

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
        except:
            pass

    return "\n".join(context_parts)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_chat_view(request):
    """
    POST /api/v1/ai/chat/
    Proxy for Gemini API — keeps key server-side.
    Body: { "message": str, "context": str (optional) }
    """
    profile = request.user.profile
    
    message = request.data.get('message', '').strip()
    context_extra = request.data.get('context', '') # Renamed to avoid confusion with system prompt context
    api_key = os.environ.get('OPENROUTER_API_KEY', '')
    if not api_key:
        return Response({'error': 'OpenRouter API key not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

    # Fetch smart context from DB
    db_context = get_ai_context(message, request.user)

    system_prompt = f"""Ти — професійний консультант магазину Fiscus.
Твоє завдання: надавати ТОЧНІ та КОНКРЕТНІ відповіді про ціни, акції та товари.
Ти знаєш ситуацію в усіх мережах (АТБ, Сільпо та ін.).

ПРАВИЛА:
1. Звертайся до користувача так, як вказано в його профілі (якщо є ім'я).
2. ОБОВ'ЯЗКОВО враховуй алергії: якщо в контексті є продукт-алерген — ПОПЕРЕДЬ про це.
3. Будь професійним, але дружнім.
4. Якщо в контексті є ціни — використовуй їх як істину.
5. Відповідай коротко, по суті.

{'[PRO РЕЖИМ] Надавай ПРІОРИТЕТНІ ПОВНІ відповіді з найдетальніжим аналізом.' if profile.is_pro else ''}

КОНТЕКСТ З БАЗИ ДАНИХ:
{db_context}

ДОДАТКОВИЙ КОНТЕКСТ:
{context_extra}"""

    payload = json.dumps({
        "model": "google/gemini-2.0-flash-001",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ],
        "temperature": 0.4, # Lower temperature for more factual responses
        "max_tokens": 512,
    }).encode('utf-8')

    try:
        req = urllib.request.Request(
            OPENROUTER_URL,
            data=payload,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}',
                'HTTP-Referer': 'https://fiscus-project.local',
                'X-Title': 'Fiscus App'
            },
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        
        if 'choices' in data:
            reply = data['choices'][0]['message']['content']
            return Response({'reply': reply})
        else:
            return Response({'error': 'OpenRouter response error', 'details': data}, status=status.HTTP_502_BAD_GATEWAY)

    except urllib.error.HTTPError as e:
        try:
            error_body = e.read().decode()
            body = json.loads(error_body)
            return Response({'error': body.get('error', {}).get('message', str(e))}, status=e.code)
        except:
            return Response({'error': f'HTTP Error {e.code}'}, status=e.code)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
