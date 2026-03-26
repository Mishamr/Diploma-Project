"""
Survival mode service — AI-powered budget-optimized meal plans.
Uses Gemini to generate optimal shopping lists from real DB products
and recommend per-item substitutions in real time.
"""

import json
import logging
import math
import os
import re
import urllib.error
import urllib.request
from decimal import Decimal
from pathlib import Path

from django.db.models import Q

from apps.core.models import Price, Product
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")

logger = logging.getLogger(__name__)


# ─── Survival categories (fallback when AI unavailable) ───
SURVIVAL_CATEGORIES = {
    "bread": {
        "name": "Хліб",
        "keywords": ["хліб", "батон", "лаваш"],
        "daily_need_kg": 0.3,
    },
    "cereals": {
        "name": "Крупи",
        "keywords": ["гречка", "рис", "вівсянка", "пшено", "макарони"],
        "daily_need_kg": 0.15,
    },
    "dairy": {
        "name": "Молочні",
        "keywords": ["молоко", "кефір", "сметана", "сир"],
        "daily_need_kg": 0.3,
    },
    "meat": {
        "name": "М'ясо",
        "keywords": ["курка", "свинина", "яловичина", "фарш", "ковбаса"],
        "daily_need_kg": 0.15,
    },
    "vegetables": {
        "name": "Овочі",
        "keywords": ["картопля", "морква", "цибуля", "капуста", "буряк", "помідор"],
        "daily_need_kg": 0.4,
    },
    "oil": {
        "name": "Олія",
        "keywords": ["олія", "соняшникова"],
        "daily_need_kg": 0.03,
    },
    "sugar": {
        "name": "Цукор",
        "keywords": ["цукор"],
        "daily_need_kg": 0.05,
    },
    "eggs": {
        "name": "Яйця",
        "keywords": ["яйця", "яйце"],
        "daily_need_kg": 0.1,
    },
}


def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance in km between two points."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 0.0
    R = 6371.0
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (
        math.sin(dLat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dLon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# ─── Get available products summary for AI ───
def _get_available_products_summary(user_lat=None, user_lon=None, limit=200):
    """
    Collect available products with current prices from the DB.
    Returns a list of dicts and a text summary for Gemini prompt.
    """
    all_prices = (
        Price.objects.filter(store_item__in_stock=True)
        .order_by("-recorded_at")
        .select_related(
            "store_item__product",
            "store_item__product__category",
            "store_item__store",
            "store_item__store__chain",
        )
    )[:4000]

    # Keep latest price per store_item
    seen = {}
    for p in all_prices:
        si_id = p.store_item_id
        if si_id not in seen:
            seen[si_id] = p

    products_data = []
    for p in list(seen.values()):
        store = p.store_item.store
        product = p.store_item.product
        dist_km = 0.0
        if user_lat and user_lon and store.latitude and store.longitude:
            dist_km = haversine(
                float(user_lat),
                float(user_lon),
                float(store.latitude),
                float(store.longitude),
            )
            # Filter out products further than 5km if location is provided
            if dist_km > 5.0:
                continue

        products_data.append(
            {
                "id": product.id,
                "name": product.name,
                "category": product.category.name if product.category else "Інше",
                "price": float(p.price),
                "old_price": float(p.old_price) if p.old_price else None,
                "is_promo": p.is_promo,
                "store": store.name,
                "store_id": store.id,
                "chain": store.chain.name,
                "lat": store.latitude,
                "lon": store.longitude,
                "distance_km": round(dist_km, 2),
                "weight_kg": product.weight_kg or 1.0,
            }
        )

    # Sort by distance first if lat/lon provided, else by price
    if user_lat and user_lon:
        products_data.sort(key=lambda x: (x["distance_km"], x["price"]))
    else:
        products_data.sort(key=lambda x: x["price"])

    products_data = products_data[:limit]

    # Build text summary for Gemini (compact)
    lines = []
    for p in products_data:
        promo = " [АКЦІЯ]" if p["is_promo"] else ""
        lines.append(
            f"ID:{p['id']}|{p['name']}|{p['category']}|{p['price']}грн{promo}|{p['chain']}|{p['distance_km']}км"
        )
    text_summary = "\n".join(lines)

    return products_data, text_summary


def _call_ai_provider(prompt, max_tokens=1024, temperature=0.3):
    """Call OpenRouter API and return parsed text response."""
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        return None

    url = "https://openrouter.ai/api/v1/chat/completions"

    payload = json.dumps(
        {
            "model": "google/gemini-2.0-flash-001",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
    ).encode("utf-8")

    try:
        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "https://fiscus-project.local",
                "X-Title": "Fiscus App",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:  # nosec B310
            data = json.loads(resp.read())

        if "choices" in data:
            return data["choices"][0]["message"]["content"]
        return None
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except urllib.error.HTTPError as e:
        logger.error(f"Gemini API HTTP Error {e.code}: {e.read().decode('utf-8')}")
        return None
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return None


def _parse_json_from_response(text):
    """Extract JSON from Gemini response (may be wrapped in markdown code blocks)."""
    if not text:
        return None
    # Try to find JSON block in markdown
    match = re.search(r"```(?:json)?\s*\n?([\s\S]*?)\n?```", text)
    if match:
        text = match.group(1)
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find array or object
        for start_char, end_char in [("[", "]"), ("{", "}")]:
            s = text.find(start_char)
            e = text.rfind(end_char)
            if s != -1 and e != -1 and e > s:
                try:
                    return json.loads(text[s : e + 1])
                except json.JSONDecodeError:
                    continue
        return None


# ─── AI-powered shopping list generation ───
def _ai_generate_shopping_list(budget, days, products_summary):
    """
    Ask Gemini to generate an optimal shopping list from available products.
    Returns list of {product_id, quantity, reason}.
    """
    prompt = f"""Ти — AI-дієтолог та фінансовий оптимізатор в українському додатку для порівняння цін.

ЗАВДАННЯ: Склади оптимальний список покупок на {days} днів з бюджетом {budget} грн.

ПРАВИЛА:
1. Обирай ТІЛЬКИ товари з наданого списку (використовуй їх ID)
2. Забезпеч збалансоване харчування: крупи, хліб, молочка, м'ясо/риба, овочі, олія, яйця
3. Загальна вартість НЕ ПОВИННА перевищити {budget} грн
4. Для кожного товару вкажи кількість (скільки штук купити на {days} днів)
5. Обирай найдешевші варіанти, але з урахуванням якості
6. Враховуй акційні товари (позначені [АКЦІЯ]) — вони вигідніші
7. Кількість повинна бути цілим числом ≥ 1
8. СУВОРО: Відбирай ТІЛЬКИ продукти харчування та напої. ЗАБОРОНЕНО додавати гігієну, косметику, побутову хімію чи товари для дому (навіть якщо вони є в списку)!

ДОСТУПНІ ТОВАРИ (формат: ID|Назва|Категорія|Ціна|Мережа|Відстань):
{products_summary}

Відповідай ТІЛЬКИ у форматі JSON (без markdown, без коментарів):
[
  {{"product_id": 123, "quantity": 2, "reason": "Недорога основа раціону"}},
  ...
]
ВАЖЛИВО: Якщо бюджет занадто малий для такої кількості днів, обери хоча б мінімальний набір продуктів (хліб, крупи).
"""

    try:
        response = _call_ai_provider(prompt, max_tokens=1500, temperature=0.3)
        return _parse_json_from_response(response)
    except Exception as e:
        logger.error(f"Survival AI generation failed: {e}")
        return None


def _ai_analyze_basket(basket_items, budget, days, total_cost):
    """Ask Gemini to analyze the basket and provide tips."""
    basket_desc = "\n".join(
        [
            f"- {i['product_name']} (×{i['quantity']}, {'АКЦІЯ' if i['is_promo'] else 'звич.'}) "
            f"з {i['chain']} — {i['total']:.2f} грн"
            for i in basket_items
        ]
    )

    prompt = f"""Ти — дієтолог і фінансовий консультант додатку Fiscus.
Користувач склав кошик на {days} днів з бюджетом {budget} грн (сума: {total_cost:.2f} грн).

Кошик:
{basket_desc}

Дай 2-4 коротких поради (кожна — одне речення). 
Оціни збалансованість, вигідність, можливості заощадити.
Кожен пункт з нового рядка. Без смайликів та емодзі. Без зірочок markdown."""

    response = _call_ai_provider(prompt, max_tokens=400, temperature=0.7)
    if response:
        return [line.strip() for line in response.split("\n") if line.strip()]
    return ["Порада: Налаштуйте GEMINI_API_KEY для отримання AI-аналізу."]


# ─── AI substitution recommendations ───
def get_ai_substitutions(
    item_name, item_price, budget, days, user_lat=None, user_lon=None, chain=None
):
    """
    For a given item, ask Gemini to recommend 2-3 alternative products
    from those available in DB.
    """
    products_data, products_summary = _get_available_products_summary(
        user_lat, user_lon, limit=150
    )

    if chain:
        products_data = [
            p for p in products_data if p["chain"].lower() == chain.lower()
        ]
        # Update summary for AI
        lines = []
        for p in products_data:
            promo = " [АКЦІЯ]" if p["is_promo"] else ""
            lines.append(
                f"ID:{p['id']}|{p['name']}|{p['category']}|{p['price']}грн{promo}|{p['chain']}|{p['distance_km']}км"
            )
        products_summary = "\n".join(lines)

    prompt = f"""Ти — AI-асистент покупок в українському додатку Fiscus.

Користувач хоче замінити товар:
- Назва: {item_name}
- Ціна: {item_price} грн
- Бюджет на {days} днів: {budget} грн

Запропонуй 2-3 АЛЬТЕРНАТИВНИХ товари з наступного списку. 
Обирай товари тієї ж або суміжної категорії, але дешевші або кращі за співвідношенням ціна/якість.

ДОСТУПНІ ТОВАРИ:
{products_summary}

Відповідай ТІЛЬКИ JSON (без markdown):
[
  {{"product_id": 123, "reason": "Дешевший аналог з такою ж якістю"}},
  {{"product_id": 456, "reason": "Акційний товар, економія 30%"}},
  ...
]"""

    response = _call_ai_provider(prompt, max_tokens=600, temperature=0.4)
    ai_picks = _parse_json_from_response(response)

    if not ai_picks:
        return {"substitutions": [], "message": "AI не зміг знайти заміни"}

    # Enrich with DB data
    products_by_id = {p["id"]: p for p in products_data}
    substitutions = []
    for pick in ai_picks[:3]:
        pid = pick.get("product_id")
        if pid and pid in products_by_id:
            p = products_by_id[pid]
            substitutions.append(
                {
                    "product_id": p["id"],
                    "name": p["name"],
                    "price": p["price"],
                    "old_price": p["old_price"],
                    "is_promo": p["is_promo"],
                    "chain": p["chain"],
                    "store": p["store"],
                    "store_id": p["store_id"],
                    "distance_km": p["distance_km"],
                    "reason": pick.get("reason", ""),
                    "savings": (
                        round(item_price - p["price"], 2)
                        if p["price"] < item_price
                        else 0
                    ),
                }
            )

    return {
        "original_item": item_name,
        "original_price": item_price,
        "substitutions": substitutions,
    }


# ─── Main basket generation ───
def generate_survival_basket(budget=5000, days=7, lat=None, lon=None, chain=None):
    """
    Generate a budget-optimized food basket.
    Uses Gemini AI to select optimal products from real DB data.
    Falls back to keyword-based algorithm if AI unavailable.
    """
    budget_decimal = Decimal(str(budget))
    products_data, products_summary = _get_available_products_summary(lat, lon)

    if chain:
        products_data = [
            p for p in products_data if p["chain"].lower() == chain.lower()
        ]
        # Update summary for AI
        lines = []
        for p in products_data:
            promo = " [АКЦІЯ]" if p["is_promo"] else ""
            lines.append(
                f"ID:{p['id']}|{p['name']}|{p['category']}|{p['price']}грн{promo}|{p['chain']}|{p['distance_km']}км"
            )
        products_summary = "\n".join(lines)

    # Try AI-powered generation first
    ai_picks = _ai_generate_shopping_list(budget, days, products_summary)

    if ai_picks:
        basket_items = _build_basket_from_ai(ai_picks, products_data, budget_decimal)
    else:
        # Fallback to keyword-based algorithm
        basket_items = _build_basket_fallback(budget_decimal, days, lat, lon, chain)

    total_cost = sum(Decimal(str(item["total"])) for item in basket_items)

    # Get AI tips
    tips = []
    if ai_picks:
        try:
            tips = _ai_analyze_basket(basket_items, budget, days, float(total_cost))
        except Exception:
            tips = [
                "AI тимчасово недоступний для аналізу, але кошик сформовано за базовим алгоритмом."
            ]
    else:
        tips = [
            "⚠️ AI зараз перевантажений, тому ми сформували базовий раціон виживання.",
            "Цей список містить лише найнеобхідніше: хліб, крупи, молочні продукти та овочі.",
            "Спробуйте згенерувати AI-список через хвилину.",
        ]

    return {
        "budget": budget,
        "days": days,
        "ai_generated": bool(ai_picks),
        "items": basket_items,
        "total_cost": float(total_cost),
        "daily_cost": float(total_cost / days) if days > 0 else 0,
        "tips": tips,
    }


def _build_basket_from_ai(ai_picks, products_data, budget_decimal):
    """Build basket from AI-selected products, enriched with DB data."""
    products_by_id = {p["id"]: p for p in products_data}
    basket_items = []
    running_total = Decimal("0.00")

    for pick in ai_picks:
        pid = pick.get("product_id")
        qty = max(1, int(pick.get("quantity", 1)))

        if pid not in products_by_id:
            continue

        p = products_by_id[pid]
        item_total = Decimal(str(p["price"])) * qty

        if running_total + item_total > budget_decimal:
            # Try to fit with reduced quantity
            remaining = budget_decimal - running_total
            max_qty = int(remaining / Decimal(str(p["price"])))
            if max_qty < 1:
                continue
            qty = max_qty
            item_total = Decimal(str(p["price"])) * qty

        basket_items.append(
            {
                "product_id": p["id"],
                "category": p["category"],
                "product_name": p["name"],
                "store": p["store"],
                "store_id": p["store_id"],
                "lat": p["lat"],
                "lon": p["lon"],
                "chain": p["chain"],
                "price_per_unit": p["price"],
                "quantity": qty,
                "total": float(item_total),
                "distance_km": p["distance_km"],
                "is_promo": p["is_promo"],
                "ai_reason": pick.get("reason", ""),
            }
        )
        running_total += item_total

    return basket_items


def _build_basket_fallback(budget_decimal, days, lat, lon, chain=None):
    """Fallback: keyword-based basket generation when AI is unavailable."""
    base_basket = []
    base_cost = Decimal("0.00")

    for cat_key, cat_info in SURVIVAL_CATEGORIES.items():
        needed_kg = cat_info["daily_need_kg"] * days
        best_item = _find_cheapest_product(cat_info["keywords"], lat, lon, chain)

        if best_item:
            quantity = _calculate_quantity(needed_kg, best_item.get("weight_kg", 1.0))
            item_cost = best_item["price"] * quantity

            base_basket.append(
                {
                    "category": cat_info["name"],
                    "product_name": best_item["name"],
                    "store": best_item["store"],
                    "store_id": best_item["store_id"],
                    "lat": best_item["lat"],
                    "lon": best_item["lon"],
                    "chain": best_item["chain"],
                    "price_per_unit": float(best_item["price"]),
                    "base_quantity": quantity,
                    "base_cost": item_cost,
                    "needed_kg": needed_kg,
                    "distance_km": best_item["distance_km"],
                    "is_promo": best_item.get("is_promo", False),
                }
            )
            base_cost += item_cost

    # Do not scale just to fill budget.
    # Portions should be 1, because base_quantity is already calculated for the requested days.
    portions = 1

    basket_items = []
    for item in base_basket:
        qty = item["base_quantity"] * portions
        total = Decimal(str(item["price_per_unit"])) * qty
        basket_items.append(
            {
                "category": item["category"],
                "product_name": item["product_name"],
                "store": item["store"],
                "store_id": item.get("store_id"),
                "lat": item.get("lat"),
                "lon": item.get("lon"),
                "chain": item["chain"],
                "price_per_unit": item["price_per_unit"],
                "quantity": qty,
                "total": float(total),
                "distance_km": item["distance_km"],
                "is_promo": item["is_promo"],
                "ai_reason": "",
            }
        )

    return basket_items


def _find_cheapest_product(keywords, user_lat=None, user_lon=None, chain=None):
    """Find the best available product matching keywords (price + distance scoring)."""
    query = Q()
    for kw in keywords:
        query |= Q(normalized_name__icontains=kw)

    products_query = Product.objects.filter(query).exclude(
        normalized_name__icontains="батончик"
    )

    prices_query = Price.objects.filter(
        store_item__product__in=products_query, store_item__in_stock=True
    )

    if chain:
        prices_query = prices_query.filter(store_item__store__chain__name__iexact=chain)

    all_prices = prices_query.order_by("-recorded_at").select_related(
        "store_item__product", "store_item__store", "store_item__store__chain"
    )[:2000]

    seen_store_items = {}
    for p in all_prices:
        si_id = p.store_item_id
        if si_id not in seen_store_items:
            seen_store_items[si_id] = p

    best = None
    best_score = float("inf")

    for p in list(seen_store_items.values())[:100]:
        store_lat = p.store_item.store.latitude
        store_lon = p.store_item.store.longitude

        dist_km = 0.0
        if user_lat is not None and user_lon is not None and store_lat and store_lon:
            dist_km = haversine(
                float(user_lat), float(user_lon), float(store_lat), float(store_lon)
            )

            # Enforce 5km strict limit for fallback too
            if dist_km > 5.0:
                continue

        price_val = float(p.price)
        distance_penalty = dist_km * 2.0
        promo_bonus = 5.0 if p.is_promo else 0.0
        score = price_val + distance_penalty - promo_bonus

        if score < best_score:
            best_score = score
            best = {
                "name": p.store_item.product.name,
                "price": p.price,
                "store": p.store_item.store.name,
                "store_id": p.store_item.store.id,
                "lat": store_lat,
                "lon": store_lon,
                "chain": p.store_item.store.chain.name,
                "weight_kg": p.store_item.product.weight_kg or 1.0,
                "distance_km": round(dist_km, 2),
                "is_promo": p.is_promo,
            }

    return best


def _calculate_quantity(needed_kg, weight_per_unit_kg):
    """Calculate how many units needed to cover the required weight."""
    if weight_per_unit_kg <= 0:
        weight_per_unit_kg = 1.0
    return max(1, math.ceil(needed_kg / weight_per_unit_kg))
