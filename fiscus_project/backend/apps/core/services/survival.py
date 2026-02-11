"""
Survival Mode service for Fiscus application.

This module implements the "Survival Mode" feature - generating
an optimal grocery list for a fixed budget and duration.

Algorithm:
    1. Define essential staple categories with utility scores (caloric value)
    2. Find cheapest items from all categories
    3. Apply Fractional Knapsack to maximize utility within budget
    4. Allocate remaining budget to highest-value items
"""
import logging
from decimal import Decimal
from typing import Dict, List, Any, Optional, Tuple

from django.db.models import Min

from apps.core.models import Product, StoreItem

logger = logging.getLogger(__name__)

# Staple food categories with search keywords and utility scores
# Utility score: approximate calories per 100g / price efficiency
STAPLE_CATEGORIES = {
    "carbs": {
        "keywords": [
            "buckwheat", "rice", "pasta", "oats", "bread",
            "гречка", "рис", "макарони", "вівсянка", "хліб"
        ],
        "default_quantity": 2,
        "priority": 1,  # Lower = higher priority
        "utility_score": 350,  # ~350 kcal/100g for grains
    },
    "protein": {
        "keywords": [
            "eggs", "chicken", "beans", "lentils",
            "яйця", "курка", "квасоля", "сочевиця"
        ],
        "default_quantity": 1,
        "priority": 2,
        "utility_score": 155,  # ~155 kcal/100g average for eggs/beans
    },
    "veggies": {
        "keywords": [
            "potatoes", "onions", "carrots", "cabbage",
            "картопля", "цибуля", "морква", "капуста"
        ],
        "default_quantity": 1,
        "priority": 3,
        "utility_score": 77,  # ~77 kcal/100g for potatoes
    },
    "fats": {
        "keywords": [
            "oil", "butter",
            "олія", "масло"
        ],
        "default_quantity": 1,
        "priority": 4,
        "utility_score": 884,  # ~884 kcal/100g for oils (high energy)
    }
}


def knapsack_optimize(items: List[Dict], budget: Decimal) -> List[Dict]:
    """
    Apply Fractional Knapsack algorithm to maximize utility within budget.
    
    Algorithm:
        1. Calculate value ratio (utility_score / price) for each item
        2. Sort by ratio descending (best value first)
        3. Select items greedily until budget exhausted
        4. For last item, take fractional amount if needed
    
    Args:
        items: List of dicts with 'utility_score', 'price', 'category', etc.
        budget: Total budget in UAH.
    
    Returns:
        Optimized list of items with adjusted quantities.
    """
    if not items or budget <= 0:
        return []
    
    # Calculate value ratio for each item
    for item in items:
        item['value_ratio'] = item['utility_score'] / float(item['price']) if item['price'] > 0 else 0
    
    # Sort by value ratio (highest first = best bang for buck)
    sorted_items = sorted(items, key=lambda x: x['value_ratio'], reverse=True)
    
    selected = []
    remaining_budget = budget
    
    for item in sorted_items:
        item_price = Decimal(str(item['price']))
        
        if item_price <= remaining_budget:
            # Can afford full item
            selected.append(item.copy())
            remaining_budget -= item_price
        elif remaining_budget > Decimal('0'):
            # Take fractional amount of last item (for display purposes, round to at least 1)
            # In practice, we skip partial items for grocery shopping
            continue
    
    logger.debug(f"Knapsack selected {len(selected)} items with remaining {remaining_budget}₴")
    return selected


def generate_survival_menu(budget: float, days: int = 7) -> Dict[str, Any]:
    """
    Generate a survival food menu within budget constraints.
    
    Algorithm:
        1. Calculate daily budget
        2. For each staple category, find cheapest available item
        3. Add items to menu while respecting budget
        4. Allocate remaining budget to extra quantities
    
    Args:
        budget: Total budget in UAH.
        days: Number of days to plan for (default: 7).
    
    Returns:
        Dict with format:
        {
            "budget": 500.0,
            "days": 7,
            "total_cost": 423.50,
            "items": [
                {
                    "category": "carbs",
                    "product_name": "Гречка",
                    "store_name": "ATB",
                    "price_per_unit": 45.00,
                    "quantity": 2,
                    "total_price": 90.00,
                    "image_url": "..."
                }
            ],
            "is_sufficient": true
        }
    
    Raises:
        ValueError: If budget or days are invalid.
    """
    # Validate inputs
    if budget <= 0:
        raise ValueError("Budget must be positive")
    if days <= 0 or days > 30:
        raise ValueError("Days must be between 1 and 30")

    budget_decimal = Decimal(str(budget))
    daily_budget = budget_decimal / Decimal(str(days))

    logger.info(
        f"Generating survival menu: {budget}₴ for {days} days "
        f"(~{daily_budget:.2f}₴/day)"
    )

    menu_items = []
    total_cost = Decimal("0.00")

    # Find cheapest item for each category
    for category, config in sorted(
        STAPLE_CATEGORIES.items(),
        key=lambda x: x[1]["priority"]
    ):
        best_item = _find_cheapest_in_category(config["keywords"])
        
        if not best_item:
            logger.debug(f"No items found for category: {category}")
            continue

        quantity = config["default_quantity"]
        item_cost = best_item.price * quantity

        # Check if we can afford it
        if total_cost + item_cost <= budget_decimal:
            menu_entry = {
                "category": category,
                "product_name": best_item.product.name,
                "store_name": best_item.store.name,
                "price_per_unit": float(best_item.price),
                "quantity": quantity,
                "total_price": float(item_cost),
                "image_url": best_item.product.image_url
            }
            menu_items.append(menu_entry)
            total_cost += item_cost
            
            logger.debug(
                f"Added to menu: {best_item.product.name} x{quantity} "
                f"= {item_cost}₴"
            )

    # Allocate remaining budget
    remaining = budget_decimal - total_cost
    
    if menu_items and remaining > Decimal("10"):
        menu_items, additional_cost = _allocate_remaining_budget(
            menu_items, remaining
        )
        total_cost += additional_cost

    is_sufficient = len(menu_items) >= 3 and total_cost > 0
    
    # Generate Monday-Sunday meal plan
    meal_plan = _generate_meal_plan(menu_items, days)

    return {
        "budget": float(budget),
        "days": days,
        "total_cost": float(total_cost),
        "items": menu_items,
        "is_sufficient": is_sufficient,
        "meal_plan": meal_plan,
        "daily_budget": float(daily_budget),
        "remaining_budget": float(budget_decimal - total_cost),
    }


def _generate_meal_plan(menu_items: List[Dict], days: int) -> List[Dict]:
    """
    Generate a Monday-Sunday meal plan based on purchased items.
    
    Distributes items across days for breakfast, lunch, and dinner.
    
    Args:
        menu_items: List of purchased grocery items.
        days: Number of days to plan for.
    
    Returns:
        List of daily meal plans with format:
        [
            {
                "day": "Понеділок",
                "date": "2026-02-10",
                "meals": {
                    "breakfast": "Вівсянка",
                    "lunch": "Гречка з курятиною",
                    "dinner": "Макарони з овочами"
                },
                "estimated_cost": 65.00
            }
        ]
    """
    from datetime import datetime, timedelta
    
    DAY_NAMES = [
        "Понеділок", "Вівторок", "Середа", "Четвер",
        "П'ятниця", "Субота", "Неділя"
    ]
    
    # Map categories to meal types
    MEAL_SUGGESTIONS = {
        "carbs": {
            "breakfast": ["Вівсянка з медом", "Каша гречана", "Тости"],
            "lunch": ["Рис з овочами", "Макарони", "Гречка"],
            "dinner": ["Картопляне пюре", "Хліб з маслом", "Каша"]
        },
        "protein": {
            "breakfast": ["Яєчня", "Омлет"],
            "lunch": ["Курятина запечена", "Квасоля тушкована"],
            "dinner": ["Курячий суп", "Сочевиця"]
        },
        "veggies": {
            "breakfast": ["Салат овочевий"],
            "lunch": ["Борщ", "Овочеве рагу"],
            "dinner": ["Салат з капусти", "Тушкована морква"]
        },
        "fats": {
            "breakfast": ["Бутерброд з маслом"],
            "lunch": [],
            "dinner": []
        }
    }
    
    # Get available categories from menu
    available_categories = set(item.get("category") for item in menu_items)
    
    meal_plan = []
    start_date = datetime.now()
    
    for day_num in range(min(days, 7)):
        day_name = DAY_NAMES[day_num % 7]
        day_date = (start_date + timedelta(days=day_num)).strftime("%Y-%m-%d")
        
        meals = {
            "breakfast": "Сніданок",
            "lunch": "Обід",
            "dinner": "Вечеря"
        }
        
        # Assign meals based on available categories
        for meal_time in ["breakfast", "lunch", "dinner"]:
            for category in ["carbs", "protein", "veggies"]:
                if category in available_categories:
                    suggestions = MEAL_SUGGESTIONS.get(category, {}).get(meal_time, [])
                    if suggestions:
                        import random
                        meals[meal_time] = random.choice(suggestions)
                        break
        
        # Calculate estimated daily cost
        daily_cost = sum(item["total_price"] for item in menu_items) / days
        
        meal_plan.append({
            "day": day_name,
            "date": day_date,
            "meals": meals,
            "estimated_cost": round(daily_cost, 2)
        })
    
    return meal_plan


def _find_cheapest_in_category(keywords: List[str]) -> Optional[StoreItem]:
    """
    Find the cheapest StoreItem matching any of the keywords.
    
    Args:
        keywords: List of search keywords for the category.
    
    Returns:
        Cheapest StoreItem or None if not found.
    """
    best_item = None
    min_price = Decimal("999999.99")

    for keyword in keywords:
        item = StoreItem.objects.filter(
            product__name__icontains=keyword,
            price__gt=0
        ).select_related('product', 'store').order_by('price').first()

        if item and item.price < min_price:
            min_price = item.price
            best_item = item

    return best_item


def _allocate_remaining_budget(
    menu_items: List[Dict],
    remaining: Decimal
) -> tuple:
    """
    Allocate remaining budget by increasing quantities.
    
    Strategy: Buy more of the cheapest item in basket.
    
    Args:
        menu_items: Current menu items.
        remaining: Remaining budget in UAH.
    
    Returns:
        Tuple of (updated_menu_items, additional_cost).
    """
    if not menu_items:
        return menu_items, Decimal("0")

    # Find cheapest item in current basket
    cheapest = min(menu_items, key=lambda x: x["price_per_unit"])
    unit_price = Decimal(str(cheapest["price_per_unit"]))

    # Calculate how many more we can buy
    extra_units = int(remaining // unit_price)

    if extra_units > 0:
        cheapest["quantity"] += extra_units
        additional_cost = unit_price * extra_units
        cheapest["total_price"] = float(
            Decimal(str(cheapest["total_price"])) + additional_cost
        )
        
        logger.debug(
            f"Added {extra_units} extra units of {cheapest['product_name']}"
        )
        
        return menu_items, additional_cost

    return menu_items, Decimal("0")
