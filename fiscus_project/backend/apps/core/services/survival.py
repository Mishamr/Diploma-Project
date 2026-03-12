"""
Survival mode service — generates budget-optimized meal plans.
"""

from decimal import Decimal
import math
import os
import urllib.request
import json
from django.db.models import Min, F, Q
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


def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance in kilometers between two points on the earth."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 0.0
    R = 6371.0  # Radius of the earth in km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat / 2) * math.sin(dLat / 2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dLon / 2) * math.sin(dLon / 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def _analyze_basket_with_ai(basket_items, budget, days, total_cost):
    api_key = os.environ.get('GEMINI_API_KEY', '')
    if not api_key:
        return ["💡 Порада: Налаштуйте GEMINI_API_KEY на сервері для отримання розширеного аналізу."]

    GEMINI_URL = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}'

    basket_desc = "\n".join([f"- {i['product_name']} ({i['quantity']} шт, промо: {'Так' if i['is_promo'] else 'Ні'}) з {i['store']} ({i['distance_km']} км від користувача) за {i['total']} грн" for i in basket_items])

    system_prompt = f"""Ти — дієтолог і фінансовий консультант додатку Fiscus.
Користувач склав "кошик виживання" на {days} днів з бюджетом {budget} грн (реальна вартість {total_cost:.2f} грн).
Ось кошик:
{basket_desc}

Твоє завдання: коротко (2-3 речення) оцінити, наскільки збалансований цей кошик, чи вигідний він з точки зору знижок і відстані до магазину, і дати 1-2 практичні поради. 
Відповідай українською мовою. Кожен пункт з нового рядка, починай з емодзі (наприклад 🍏, 💡). Жодних зірочок markdown (*)."""

    payload = json.dumps({
        'contents': [
            {'role': 'user', 'parts': [{'text': system_prompt}]},
        ],
        'generationConfig': {'temperature': 0.7, 'maxOutputTokens': 300},
    }).encode('utf-8')

    try:
        req = urllib.request.Request(
            GEMINI_URL,
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
        reply = data['candidates'][0]['content']['parts'][0]['text']
        return [line.strip() for line in reply.split('\n') if line.strip()]
    except Exception as e:
        print(f"AI error: {e}")
        return ["💡 AI-аналіз зараз недоступний через помилку з'єднання."]


def generate_survival_basket(budget=5000, days=7, lat=None, lon=None):
    """
    Generate a budget-optimized food basket with location factors and AI verified properties.
    """
    budget_decimal = Decimal(str(budget))
    basket_items = []
    total_cost = Decimal('0.00')

    base_basket = []
    base_cost = Decimal('0.00')

    for cat_key, cat_info in SURVIVAL_CATEGORIES.items():
        needed_kg_1p = cat_info['daily_need_kg'] * days

        # Find best matched product optimization
        best_item = _find_cheapest_product(cat_info['keywords'], lat, lon)

        if best_item:
            quantity_1p = _calculate_quantity(needed_kg_1p, best_item.get('weight_kg', 1.0))
            item_cost = best_item['price'] * quantity_1p

            base_basket.append({
                'category': cat_info['name'],
                'product_name': best_item['name'],
                'store': best_item['store'],
                'store_id': best_item['store_id'],
                'lat': best_item['lat'],
                'lon': best_item['lon'],
                'chain': best_item['chain'],
                'price_per_unit': float(best_item['price']),
                'base_quantity': quantity_1p,
                'base_item_cost': item_cost,
                'needed_kg_1p': needed_kg_1p,
                'distance_km': best_item['distance_km'],
                'is_promo': best_item.get('is_promo', False)
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
            'store_id': item.get('store_id'),
            'lat': item.get('lat'),
            'lon': item.get('lon'),
            'chain': item['chain'],
            'price_per_unit': item['price_per_unit'],
            'quantity': final_quantity,
            'total': float(final_cost),
            'needed_kg': item['needed_kg_1p'] * portions,
            'distance_km': item['distance_km'],
            'is_promo': item['is_promo'],
        })
        total_cost += final_cost

    tips = _analyze_basket_with_ai(basket_items, budget, days, float(total_cost))

    return {
        'budget': budget,
        'days': days,
        'portions_afforded': portions,
        'items': basket_items,
        'total_cost': float(total_cost),
        'daily_cost': float(total_cost / days) if days > 0 else 0,
        'tips': tips
    }


def _find_cheapest_product(keywords, user_lat=None, user_lon=None):
    """Find the best available product matching keywords optimizing for price & proximity."""
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
    best_score = float('inf')

    for p in latest_prices[:100]:
        store_lat = p.store_item.store.latitude
        store_lon = p.store_item.store.longitude

        dist_km = 0.0
        if user_lat is not None and user_lon is not None and store_lat and store_lon:
            dist_km = haversine(float(user_lat), float(user_lon), float(store_lat), float(store_lon))

        price_val = float(p.price)
        distance_penalty = dist_km * 2.0
        promo_bonus = 5.0 if p.is_promo else 0.0

        score = price_val + distance_penalty - promo_bonus

        if score < best_score:
            best_score = score
            best = {
                'name': p.store_item.product.name,
                'price': p.price,
                'store': p.store_item.store.name,
                'store_id': p.store_item.store.id,
                'lat': store_lat,
                'lon': store_lon,
                'chain': p.store_item.store.chain.name,
                'weight_kg': p.store_item.product.weight_kg or 1.0,
                'distance_km': round(dist_km, 2),
                'is_promo': p.is_promo
            }

    return best


def _calculate_quantity(needed_kg, weight_per_unit_kg):
    """Calculate how many units needed to cover the required weight."""
    if weight_per_unit_kg <= 0:
        weight_per_unit_kg = 1.0
    return max(1, math.ceil(needed_kg / weight_per_unit_kg))
