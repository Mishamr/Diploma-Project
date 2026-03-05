"""
Survival mode service — generates budget-optimized meal plans.
"""

from decimal import Decimal
from django.db.models import Min, F
from apps.core.models import Product, Price, StoreItem, Chain


# Категорії продуктів для "кошику виживання"
SURVIVAL_CATEGORIES = {
    'bread': {
        'name': 'Хліб',
        'keywords': ['хліб', 'батон', 'лаваш'],
        'daily_need_kg': 0.3,
    },
    'cereals': {
        'name': 'Крупи',
        'keywords': ['гречка', 'рис', 'вівсянка', 'пшено', 'макарони'],
        'daily_need_kg': 0.15,
    },
    'dairy': {
        'name': 'Молочні',
        'keywords': ['молоко', 'кефір', 'сметана', 'сир'],
        'daily_need_kg': 0.3,
    },
    'meat': {
        'name': "М'ясо",
        'keywords': ['курка', 'свинина', 'яловичина', 'фарш', 'ковбаса'],
        'daily_need_kg': 0.15,
    },
    'vegetables': {
        'name': 'Овочі',
        'keywords': ['картопля', 'морква', 'цибуля', 'капуста', 'буряк', 'помідор'],
        'daily_need_kg': 0.4,
    },
    'oil': {
        'name': 'Олія',
        'keywords': ['олія', 'соняшникова'],
        'daily_need_kg': 0.03,
    },
    'sugar': {
        'name': 'Цукор',
        'keywords': ['цукор'],
        'daily_need_kg': 0.05,
    },
    'eggs': {
        'name': 'Яйця',
        'keywords': ['яйця', 'яйце'],
        'daily_need_kg': 0.1,
    },
}


def generate_survival_basket(budget=5000, days=7, lat=None, lon=None):
    """
    Generate a budget-optimized food basket.
    
    Returns:
        dict with 'items' list and 'total_cost'
    """
    budget_decimal = Decimal(str(budget))
    basket_items = []
    total_cost = Decimal('0.00')

    base_basket = []
    base_cost = Decimal('0.00')

    for cat_key, cat_info in SURVIVAL_CATEGORIES.items():
        needed_kg_1p = cat_info['daily_need_kg'] * days

        # Find cheapest product matching this category
        best_item = _find_cheapest_product(cat_info['keywords'])

        if best_item:
            quantity_1p = _calculate_quantity(needed_kg_1p, best_item.get('weight_kg', 1.0))
            item_cost = best_item['price'] * quantity_1p

            base_basket.append({
                'category': cat_info['name'],
                'product_name': best_item['name'],
                'store': best_item['store'],
                'chain': best_item['chain'],
                'price_per_unit': float(best_item['price']),
                'base_quantity': quantity_1p,
                'base_item_cost': item_cost,
                'needed_kg_1p': needed_kg_1p,
            })
            base_cost += item_cost

    portions = 1
    if base_cost > 0 and budget_decimal >= base_cost:
        portions = int(budget_decimal / base_cost)
        
    for item in base_basket:
        final_quantity = item['base_quantity'] * portions
        final_cost = Decimal(str(item['price_per_unit'])) * final_quantity
        
        basket_items.append({
            'category': item['category'],
            'product_name': item['product_name'],
            'store': item['store'],
            'chain': item['chain'],
            'price_per_unit': item['price_per_unit'],
            'quantity': final_quantity,
            'total': float(final_cost),
            'needed_kg': item['needed_kg_1p'] * portions,
        })
        total_cost += final_cost

    return {
        'budget': budget,
        'days': days,
        'portions_afforded': portions,
        'items': basket_items,
        'total_cost': float(total_cost),
        'daily_cost': float(total_cost / days) if days > 0 else 0,
    }


def _find_cheapest_product(keywords):
    """Find the cheapest available product matching any of the keywords."""
    from django.db.models import Q

    query = Q()
    for kw in keywords:
        query |= Q(normalized_name__icontains=kw)

    latest_prices = (
        Price.objects
        .filter(store_item__product__in=Product.objects.filter(query))
        .filter(store_item__in_stock=True)
        .order_by('store_item', '-recorded_at')
        .distinct('store_item')
        .select_related('store_item__product', 'store_item__store', 'store_item__store__chain')
    )

    best = None
    for p in latest_prices[:50]:
        item_data = {
            'name': p.store_item.product.name,
            'price': p.price,
            'store': p.store_item.store.name,
            'chain': p.store_item.store.chain.name,
            'weight_kg': p.store_item.product.weight_kg or 1.0,
        }
        if best is None or p.price < best['price']:
            best = item_data

    return best


def _calculate_quantity(needed_kg, weight_per_unit_kg):
    """Calculate how many units needed to cover the required weight."""
    if weight_per_unit_kg <= 0:
        weight_per_unit_kg = 1.0
    import math
    return max(1, math.ceil(needed_kg / weight_per_unit_kg))
