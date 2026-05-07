"""
Survival mode service — budget-optimized meal plans.
Uses AI to generate optimal shopping lists from real DB products
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


# ─── Survival categories (standard configuration) ───
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
    )[:5000]

    # Keep latest price per store_item
    seen = {}
    for p in all_prices:
        si_id = p.store_item_id
        if si_id not in seen:
            seen[si_id] = p

    def get_products(max_dist=None):
        data = []
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
                if max_dist and dist_km > max_dist:
                    continue

            data.append(
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
        return data

    # Try 2km first, then relax to 5km, then 15km if needed
    products_data = get_products(max_dist=2.0)
    if len(products_data) < 50:
        products_data = get_products(max_dist=5.0)
    if len(products_data) < 20:
        products_data = get_products(max_dist=15.0)

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


def call_ai_provider(prompt, max_tokens=1024, temperature=0.3):
    """
    Unified AI provider call.
    Uses configured API keys from environment.
    """
    api_key_groq = os.environ.get("GROQ_API_KEY", "")
    api_key_gemini = os.environ.get("GEMINI_API_KEY", "")
    api_key_or = os.environ.get("OPENROUTER_API_KEY", "")

    # ─── Primary Provider ───
    if api_key_groq:
        groq_models = [
            "llama3-70b-8192",  # найкращий безкоштовний
            "llama3-8b-8192",  # лайтовий failover
            "mixtral-8x7b-32768",  # ще один варіант
        ]
        for model in groq_models:
            url = "https://api.groq.com/openai/v1/chat/completions"
            payload_data = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            payload = json.dumps(payload_data).encode("utf-8")
            try:
                logger.info(f"Groq request with {model}...")
                req = urllib.request.Request(
                    url,
                    data=payload,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {api_key_groq}",
                    },
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=30) as resp:  # nosec B310
                    data = json.loads(resp.read())
                if "choices" in data and data["choices"]:
                    text = data["choices"][0]["message"]["content"]
                    if text:
                        logger.info(f"Groq success with {model}")
                        return text
            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8")
                logger.warning(f"Groq {model} failed: {e.code} - {err_body}")
            except Exception as e:
                logger.error(f"Groq {model} error: {e}")

    # ─── Secondary Provider ───
    if api_key_gemini:
        models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"]
        for model in models:
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model}:generateContent?key={api_key_gemini}"
            )
            payload_data = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                },
            }
            payload = json.dumps(payload_data).encode("utf-8")
            try:
                logger.info(f"Gemini request with {model}...")
                req = urllib.request.Request(
                    url, data=payload, headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=30) as resp:  # nosec B310
                    data = json.loads(resp.read())
                if "candidates" in data and data["candidates"]:
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    if text:
                        logger.info(f"Gemini success with {model}")
                        return text
            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8")
                logger.warning(f"Gemini {model} failed: {e.code} - {err_body}")
            except Exception as e:
                logger.error(f"Gemini {model} error: {e}")

    # ─── Tertiary Provider ───
    if api_key_or:
        url = "https://openrouter.ai/api/v1/chat/completions"
        payload_data = {
            "model": "google/gemini-2.0-flash-001",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        payload = json.dumps(payload_data).encode("utf-8")
        try:
            logger.info("OpenRouter request...")
            req = urllib.request.Request(
                url,
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key_or}",
                    "HTTP-Referer": "https://fiscus-project.local",
                    "X-Title": "Fiscus App",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:  # nosec B310
                data = json.loads(resp.read())
            if "choices" in data and data["choices"]:
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"OpenRouter error: {e}")

    # No working provider
    if not api_key_groq and not api_key_gemini and not api_key_or:
        return "Error: No AI API keys configured. Add GROQ_API_KEY to .env"
    return None


def _parse_json_from_response(text):
    """Extract JSON from AI response."""
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
def _ai_generate_shopping_list(budget, days, products_summary, meals_per_day=3):
    """
    Generate an optimal shopping list from available products.
    Returns list of {product_id, quantity, reason, buy_frequency}.
    """
    prompt = f"""Ти — помічник з планування харчування.

ЗАВДАННЯ: Склади оптимальний список покупок на {days} днів з бюджетом {budget} грн.
Людина їсть {meals_per_day} рази на день.

КРИТИЧНІ ПРАВИЛА ЩОДО ТЕРМІНУ ПРИДАТНОСТІ:
1. Хліб, молочні продукти, м'ясо — ШВИДКОПСУВНІ. НЕ купуй 30 хлібин на місяць! Враховуй термін зберігання:
   - Хліб: зберігається 2-3 дні → купувати кожні 2-3 дні (на {days} днів = {max(1, days // 3)} покупок по 1-2 шт.)
   - Молоко, кефір, сметана: 5-7 днів → купувати раз на тиждень
   - Свіже м'ясо/курка: 2-3 дні в холодильнику → купувати 2 рази на тиждень або заморозити
   - Яйця: 2-3 тижні → купувати раз на 2 тижні
2. Крупи, макарони, олія, цукор, борошно — ДОВГОЗБЕРІГАЮЧІ, можна купити одразу на весь період
3. Овочі: картопля, цибуля, морква — 2-3 тижні; помідори, огірки — 3-5 днів

ВАЖЛИВО (РІЗНОМАНІТНІСТЬ): Кожен раз генеруй УНІКАЛЬНИЙ набір продуктів! Змінюй типи м'яса, гарніри та овочі, щоб користувач отримував НОВІ варіанти страв при кожній генерації.

ПРАВИЛА СКЛАДАННЯ СПИСКУ:
1. Обирай ТІЛЬКИ товари з наданого списку (використовуй їх ID)
2. На кожен прийом їжі має бути достатньо інгредієнтів для ПРОСТОЇ ДОМАШНЬОЇ СТРАВИ:
   - Сніданок: каша/яйця/бутерброди + напій
   - Обід: суп/борщ/паста + гарнір + напій
   - Вечеря: м'ясо/риба + гарнір з овочів + напій
3. Страви мають ЗМІНЮВАТИСЯ день від дня (різноманітність!). Плануй щоб інгредієнти дозволяли готувати різне: борщ, суп, пасту, кашу, смажену картоплю, салат, омлет тощо
4. Всі страви — з ПРОСТИХ інгредієнтів, які можна приготувати вдома
5. Не забудь про НАПОЇ: чай, кава або воду
6. Загальна вартість НЕ ПОВИННА перевищити {budget} грн
7. Обирай найдешевші варіанти з урахуванням якості
8. Враховуй акційні товари (позначені [АКЦІЯ])
9. Кількість — ціле число ≥ 1, але РЕАЛІСТИЧНЕ для терміну зберігання
10. СУВОРО: Тільки продукти харчування та напої. ЗАБОРОНЕНО: гігієна, косметика, побутова хімія

СУМІСНІСТЬ ПРОДУКТІВ (окремо нормальні, разом шкодять — уникай!):
- Огірки + помідори (одночасно блокують засвоєння вітамінів один одного)
- Огірки + молоко/кефір (розлад шлунку)
- Риба + молочні продукти (важке травлення, здуття)
- Селедка + молоко (класична несумісність)
- Дині/кавун — їсти ОКРЕМО від будь-якої іншої їжі (мінімум 30 хв)
- Яйця + риба (перевантаження білком, важко для шлунку)
- Банани + молоко (здуття, важкість)
- Мед — НЕ додавати в гарячі напої (вище 40°С руйнуються корисні речовини)
- Фрукти — краще їсти окремо, НЕ після важкої їжі (бродіння в шлунку)
- Кожна страва має бути логічною комбінацією: борщ (буряк+капуста+морква+м'ясо+картопля), паста (макарони+м'ясо/овочі), каша (крупа+масло) тощо

ДОСТУПНІ ТОВАРИ (формат: ID|Назва|Категорія|Ціна|Мережа|Відстань):
{products_summary}

Відповідай ТІЛЬКИ у форматі JSON (без markdown, без коментарів):
[
  {{"product_id": 123, "quantity": 2, "reason": "Гречка на весь період, довго зберігається", "buy_frequency": "раз на {days} днів"}},
  {{"product_id": 456, "quantity": 1, "reason": "Хліб на 2-3 дні, треба купувати свіжий", "buy_frequency": "кожні 2-3 дні"}},
  ...
]
ВАЖЛИВО: Quantity — це кількість на ОДНУ закупку (для швидкопсувних) або на весь період (для довгозберігаючих). Якщо бюджет малий — обери мінімальний набір.
"""

    try:
        response = call_ai_provider(prompt, max_tokens=2000, temperature=0.8)
        return _parse_json_from_response(response)
    except Exception as e:
        logger.error(f"Survival AI generation failed: {e}")
        return None


def _ai_analyze_basket(basket_items, budget, days, total_cost):
    """Analyze the basket and provide tips."""
    basket_desc = "\n".join(
        [
            f"- {i['product_name']} (×{i['quantity']}, {'АКЦІЯ' if i['is_promo'] else 'звич.'}) "
            f"з {i['chain']} — {i['total']:.2f} грн"
            for i in basket_items
        ]
    )

    prompt = f"""Ти — помічник з планування харчування.
Користувач склав кошик на {days} днів з бюджетом {budget} грн (сума: {total_cost:.2f} грн).

Кошик:
{basket_desc}

Дай 3-4 пункти корисних порад:
- Оціни збалансованість та вигідність.
- Порадь щодо зберігання швидкопсувних продуктів.
- НАЙГОЛОВНІШЕ: Напиши "Рекомендоване меню (що з цього приготувати):" і коротко перелічи 3-4 конкретні прості страви, які можна зготувати саме з цих продуктів.
Кожен пункт з нового рядка. Без смайликів та емодзі. Без зірочок markdown."""

    response = call_ai_provider(prompt, max_tokens=800, temperature=0.7)
    if response and not str(response).startswith("Error:"):
        tips = [line.strip() for line in response.split("\n") if line.strip()]
        return tips
    return ["AI-аналіз тимчасово недоступний (перевищено ліміти)."]


# ─── AI substitution recommendations ───
def get_ai_substitutions(
    item_name, item_price, budget, days, user_lat=None, user_lon=None, chain=None
):
    """
    Recommend alternative products from those available in DB.
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

    prompt = f"""Ти — асистент покупок.

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

    response = call_ai_provider(prompt, max_tokens=600, temperature=0.4)
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
def generate_survival_basket(
    budget=5000, days=7, lat=None, lon=None, chain=None, meals_per_day=3
):
    """
    Generate a budget-optimized food basket.
    Uses AI to select optimal products from real DB data.
    Falls back to standard algorithm if AI unavailable.
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

    # ── Initial state (DB empty) ──────────────────
    if not products_data:
        return _build_initial_basket(budget, days)

    # Try AI-powered generation first
    ai_picks = _ai_generate_shopping_list(budget, days, products_summary, meals_per_day)

    if ai_picks:
        basket_items = _build_basket_from_ai(ai_picks, products_data, budget_decimal)
        # If AI returned IDs that don't exist in DB — basket will be empty, use demo
        if not basket_items:
            logger.warning("AI picks resolved to 0 DB products — using demo basket")
            return _build_initial_basket(budget, days)
    else:
        # Fallback to keyword-based algorithm
        basket_items = _build_basket_fallback(budget_decimal, days, lat, lon, chain)

    basket_items = _cap_basket_to_budget(basket_items, budget_decimal)

    # If still empty — use demo
    if not basket_items:
        return _build_initial_basket(budget, days)

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
            "Сервіс тимчасово перевантажений, тому сформовано базовий раціон виживання.",
            "Список містить найнеобхідніше: хліб, крупи, молочні продукти та овочі.",
            "Спробуйте оновити список через хвилину для отримання детального аналізу.",
        ]

    # Add AI disclaimer to all tips
    disclaimer = "Увага: цей список складено штучним інтелектом і має рекомендаційний характер. AI не є професійним дієтологом — за потреби проконсультуйтеся з фахівцем. Відповідальність за вибір продуктів несе користувач."
    tips.append(disclaimer)

    return {
        "budget": budget,
        "days": days,
        "meals_per_day": meals_per_day,
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

    return _cap_basket_to_budget(basket_items, budget_decimal)


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

            # Enforce 5km strict limit for AI, but for fallback let's be more generous (1000km)
            # if user is far from stores in DB (e.g. Lviv user vs Kyiv stores).
            if dist_km > 1000.0:
                continue

        price_val = float(p.price)
        distance_penalty = dist_km * 0.5  # Reduced penalty for fallback
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


def _cap_basket_to_budget(items, budget_decimal):
    """Ensure the total cost of the basket does not exceed the budget."""
    running_total = Decimal("0.00")
    capped_items = []

    for item in items:
        item_price = Decimal(str(item.get("price_per_unit", item.get("price", 0))))
        item_qty = int(item.get("quantity", 1))

        if running_total + item_price * item_qty > budget_decimal:
            max_qty = int((budget_decimal - running_total) / item_price)
            if max_qty > 0:
                item["quantity"] = max_qty
                item["total"] = float(item_price * max_qty)
                capped_items.append(item)
                running_total += item_price * max_qty
            continue

        item["total"] = float(item_price * item_qty)
        capped_items.append(item)
        running_total += item_price * item_qty

    return capped_items


def _build_initial_basket(budget, days):
    """Fallback realistic data when database is completely empty."""
    budget_decimal = Decimal(str(budget))
    daily_budget = budget_decimal / max(1, days)

    # 3 categories of baskets based on daily budget
    if daily_budget < 200:
        # Minimal survival
        items = [
            {
                "product_id": 1,
                "name": "Хліб пшеничний половинка",
                "category": "Хлібобулочні",
                "quantity": days,
                "price": "18.50",
                "total": f"{18.5 * days:.2f}",
                "chain": "АТБ",
                "store": "АТБ №1",
                "distance_km": 0.5,
            },
            {
                "product_id": 2,
                "name": "Крупа гречана 1кг",
                "category": "Бакалія",
                "quantity": max(1, days // 3),
                "price": "34.90",
                "total": f"{34.9 * max(1, days // 3):.2f}",
                "chain": "АТБ",
                "store": "АТБ №1",
                "distance_km": 0.5,
            },
            {
                "product_id": 3,
                "name": "Макарони 1кг",
                "category": "Бакалія",
                "quantity": max(1, days // 4),
                "price": "29.40",
                "total": f"{29.4 * max(1, days // 4):.2f}",
                "chain": "Сільпо",
                "store": "Сільпо №3",
                "distance_km": 1.2,
            },
            {
                "product_id": 4,
                "name": "Картопля ваговий 1кг",
                "category": "Овочі",
                "quantity": days,
                "price": "14.20",
                "total": f"{14.2 * days:.2f}",
                "chain": "Ашан",
                "store": "Ашан",
                "distance_km": 2.5,
            },
            {
                "product_id": 5,
                "name": "Олія соняшникова 850мл",
                "category": "Бакалія",
                "quantity": 1,
                "price": "56.00",
                "total": "56.00",
                "chain": "АТБ",
                "store": "АТБ №1",
                "distance_km": 0.5,
            },
            {
                "product_id": 6,
                "name": "Яйця курячі 10шт С1",
                "category": "Молочні",
                "quantity": max(1, days // 5),
                "price": "45.00",
                "total": f"{45.0 * max(1, days // 5):.2f}",
                "chain": "Сільпо",
                "store": "Сільпо №3",
                "distance_km": 1.2,
            },
        ]
    elif daily_budget < 500:
        # Balanced
        items = [
            {
                "product_id": 1,
                "name": "Хліб тостовий 500г",
                "category": "Хлібобулочні",
                "quantity": max(1, days // 2),
                "price": "28.50",
                "total": f"{28.5 * max(1, days // 2):.2f}",
                "chain": "Сільпо",
                "store": "Сільпо №3",
                "distance_km": 1.2,
            },
            {
                "product_id": 2,
                "name": "Філе куряче охолоджене 1кг",
                "category": "М'ясо",
                "quantity": max(1, days // 3),
                "price": "165.00",
                "total": f"{165.0 * max(1, days // 3):.2f}",
                "chain": "Ашан",
                "store": "Ашан",
                "distance_km": 2.5,
            },
            {
                "product_id": 3,
                "name": "Макарони з твердих сортів пшениці",
                "category": "Бакалія",
                "quantity": max(1, days // 3),
                "price": "45.90",
                "total": f"{45.9 * max(1, days // 3):.2f}",
                "chain": "АТБ",
                "store": "АТБ №1",
                "distance_km": 0.5,
            },
            {
                "product_id": 4,
                "name": "Молоко 2.5% 900мл",
                "category": "Молочні",
                "quantity": days,
                "price": "38.50",
                "total": f"{38.5 * days:.2f}",
                "chain": "АТБ",
                "store": "АТБ №1",
                "distance_km": 0.5,
            },
            {
                "product_id": 5,
                "name": "Масло вершкове 72.5% 200г",
                "category": "Молочні",
                "quantity": max(1, days // 7),
                "price": "68.00",
                "total": f"{68.0 * max(1, days // 7):.2f}",
                "chain": "Сільпо",
                "store": "Сільпо №3",
                "distance_km": 1.2,
            },
            {
                "product_id": 6,
                "name": "Сир кисломолочний 5% 350г",
                "category": "Молочні",
                "quantity": max(1, days // 4),
                "price": "58.00",
                "total": f"{58.0 * max(1, days // 4):.2f}",
                "chain": "Сільпо",
                "store": "Сільпо №3",
                "distance_km": 1.2,
            },
            {
                "product_id": 7,
                "name": "Огірки тепличні 1кг",
                "category": "Овочі",
                "quantity": max(1, days // 3),
                "price": "85.00",
                "total": f"{85.0 * max(1, days // 3):.2f}",
                "chain": "Ашан",
                "store": "Ашан",
                "distance_km": 2.5,
            },
            {
                "product_id": 8,
                "name": "Яйця курячі 10шт С0",
                "category": "Молочні",
                "quantity": max(1, days // 3),
                "price": "52.00",
                "total": f"{52.0 * max(1, days // 3):.2f}",
                "chain": "АТБ",
                "store": "АТБ №1",
                "distance_km": 0.5,
            },
        ]
    else:
        # Premium
        items = [
            {
                "product_id": 1,
                "name": "Хліб крафтовий з насінням",
                "category": "Хлібобулочні",
                "quantity": max(1, days // 2),
                "price": "55.00",
                "total": f"{55.0 * max(1, days // 2):.2f}",
                "chain": "Сільпо",
                "store": "Сільпо №3",
                "distance_km": 1.2,
            },
            {
                "product_id": 2,
                "name": "Сьомга слабосолона 200г",
                "category": "Риба",
                "quantity": max(1, days // 4),
                "price": "249.00",
                "total": f"{249.0 * max(1, days // 4):.2f}",
                "chain": "Сільпо",
                "store": "Сільпо №3",
                "distance_km": 1.2,
            },
            {
                "product_id": 3,
                "name": "Яловичина стейк тібоун 500г",
                "category": "М'ясо",
                "quantity": max(1, days // 5),
                "price": "315.00",
                "total": f"{315.0 * max(1, days // 5):.2f}",
                "chain": "Ашан",
                "store": "Ашан",
                "distance_km": 2.5,
            },
            {
                "product_id": 4,
                "name": "Сир брі Président 200г",
                "category": "Молочні",
                "quantity": max(1, days // 4),
                "price": "105.00",
                "total": f"{105.0 * max(1, days // 4):.2f}",
                "chain": "Сільпо",
                "store": "Сільпо №3",
                "distance_km": 1.2,
            },
            {
                "product_id": 5,
                "name": "Томати чері 250г",
                "category": "Овочі",
                "quantity": days // 2,
                "price": "75.00",
                "total": f"{75.0 * (days // 2):.2f}",
                "chain": "Сільпо",
                "store": "Сільпо №3",
                "distance_km": 1.2,
            },
            {
                "product_id": 6,
                "name": "Авокадо хасс",
                "category": "Фрукти",
                "quantity": days,
                "price": "45.00",
                "total": f"{45.0 * days:.2f}",
                "chain": "АТБ",
                "store": "АТБ №1",
                "distance_km": 0.5,
            },
            {
                "product_id": 7,
                "name": "Оливкова олія Extra Virgin 500мл",
                "category": "Бакалія",
                "quantity": 1,
                "price": "285.00",
                "total": "285.00",
                "chain": "Ашан",
                "store": "Ашан",
                "distance_km": 2.5,
            },
            {
                "product_id": 8,
                "name": "Кава в зернах Lavazza 1кг",
                "category": "Бакалія",
                "quantity": 1,
                "price": "560.00",
                "total": "560.00",
                "chain": "АТБ",
                "store": "АТБ №1",
                "distance_km": 0.5,
            },
        ]

    current_total = sum(float(item["total"]) for item in items)
    budget_decimal = Decimal(str(budget))
    if current_total > 0:
        scale = float(budget) / current_total
        if scale > 1.1:
            for it in items:
                it["quantity"] = max(1, math.floor(it["quantity"] * scale))
                it["total"] = f"{float(it['price']) * it['quantity']:.2f}"

    items = _cap_basket_to_budget(items, budget_decimal)

    total_cost = sum(float(item["total"]) for item in items)

    return {
        "budget": budget,
        "days": days,
        "ai_generated": False,
        "items": items,
        "total_cost": round(total_cost, 2),
        "daily_cost": round(total_cost / max(1, days), 2),
        "tips": [
            "База даних товарів ще не заповнена. Запустіть скрапер магазинів для отримання актуальних цін вашого міста.",
            f"Розрахований кошик оптимізовано під бюджет {budget} ₴ на {days} днів.",
        ],
    }
