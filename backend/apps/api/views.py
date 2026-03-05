"""
Main API views — products, shopping lists, promotions, survival.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
import os
import urllib.request
import json

from apps.core.models import (
    Product, StoreItem, Price, ShoppingList, ShoppingListItem, Category,
)
from apps.core.services.survival import generate_survival_basket
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
        return qs


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/v1/categories/ — list categories
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
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
@permission_classes([AllowAny])
def survival_basket_view(request):
    """GET /api/v1/survival/ — budget survival basket."""
    budget = float(request.query_params.get('budget', 5000))
    days = int(request.query_params.get('days', 7))
    lat = request.query_params.get('lat')
    lon = request.query_params.get('lon')

    basket = generate_survival_basket(
        budget=budget,
        days=days,
        lat=float(lat) if lat else None,
        lon=float(lon) if lon else None,
    )
    return Response(basket)


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
def ai_chat_view(request):
    """
    POST /api/v1/ai/chat/
    Proxy for Gemini API — keeps key server-side.
    Body: { "message": str, "context": str (optional) }
    """
    message = request.data.get('message', '').strip()
    context = request.data.get('context', '')

    if not message:
        return Response({'error': 'message required'}, status=status.HTTP_400_BAD_REQUEST)

    api_key = os.environ.get('GEMINI_API_KEY', '')
    if not api_key:
        return Response({'error': 'Gemini API key not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    GEMINI_URL = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}'

    system_prompt = f"""Ти — AI-помічник додатку Fiscus (розумний трекер цін, супермаркет АТБ, Україна).
Допомагаєш аналізувати ціни, знаходити знижки, оптимізувати кошик покупок.
Відповідай коротко, конкретно, по-українськи. Використовуй емодзі.
{context}"""

    payload = json.dumps({
        'contents': [
            {'role': 'user', 'parts': [{'text': system_prompt}]},
            {'role': 'model', 'parts': [{'text': 'Зрозумів! Готовий допомагати.'}]},
            {'role': 'user', 'parts': [{'text': message}]},
        ],
        'generationConfig': {'temperature': 0.7, 'maxOutputTokens': 512},
    }).encode('utf-8')

    try:
        req = urllib.request.Request(
            GEMINI_URL,
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        reply = data['candidates'][0]['content']['parts'][0]['text']
        return Response({'reply': reply})
    except urllib.error.HTTPError as e:
        body = json.loads(e.read().decode())
        return Response({'error': body.get('error', {}).get('message', str(e))}, status=e.code)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)
