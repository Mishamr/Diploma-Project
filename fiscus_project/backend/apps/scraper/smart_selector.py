"""
Smart Selector algorithm for Fiscus application.

This module implements the "Fiscus Index" - a quality-to-price
ratio metric for finding the best value products.

The Fiscus Index Formula:
    Fiscus_Index = Quality_Score / Price_per_100g
    
    Higher index = Better value
    
Example:
    Product A: Quality 8, Price 20₴/100g -> Index 0.4
    Product B: Quality 8, Price 10₴/100g -> Index 0.8 (Winner!)
"""
import logging
from decimal import Decimal
from typing import Dict, List, Any, Optional

from django.db.models import Q

from apps.core.models import Product, StoreItem

logger = logging.getLogger(__name__)

# Quality scoring constants
DEFAULT_QUALITY_SCORE = 5
MAX_QUALITY_SCORE = 10
MIN_QUALITY_SCORE = 1

# Ingredient penalty keywords
NEGATIVE_INGREDIENTS = {
    "palm oil": -2,
    "пальмова олія": -2,
    "sugar": -1,
    "цукор": -1,
    "corn syrup": -2,
    "кукурудзяний сироп": -2,
}

# E-additive pattern penalty
E_ADDITIVE_PENALTY = -1
LONG_INGREDIENTS_THRESHOLD = 200
LONG_INGREDIENTS_PENALTY = -2


def mock_analyze_ingredients(candidates: List[StoreItem]) -> Dict[int, int]:
    """
    Analyze product ingredients and assign quality scores.
    
    This is a mock/heuristic implementation that simulates
    AI-based ingredient analysis. In production, this would
    call an actual ML model or external API.
    
    Scoring Logic:
        - Base score: 8/10
        - Penalties for:
            - Palm oil: -2
            - Added sugars: -1
            - E-additives: -1
            - Long ingredient lists (>200 chars): -2
        - Unknown ingredients: 5/10
    
    Args:
        candidates: List of StoreItem objects to analyze.
    
    Returns:
        Dict mapping StoreItem.id to quality score (1-10).
    """
    scores = {}

    for item in candidates:
        ingredients = (item.ingredients_text or "").lower()
        score = 8  # Start optimistic

        if not ingredients:
            # Unknown ingredients -> neutral score
            scores[item.id] = DEFAULT_QUALITY_SCORE
            continue

        # Apply penalties
        for keyword, penalty in NEGATIVE_INGREDIENTS.items():
            if keyword in ingredients:
                score += penalty
                logger.debug(
                    f"Item {item.id}: penalty {penalty} for '{keyword}'"
                )

        # E-additives check (naive: "e-" or "е" followed by number)
        if "e-" in ingredients or "е" in ingredients:
            score += E_ADDITIVE_PENALTY

        # Long ingredient list penalty
        if len(ingredients) > LONG_INGREDIENTS_THRESHOLD:
            score += LONG_INGREDIENTS_PENALTY

        # Clamp to valid range
        score = max(MIN_QUALITY_SCORE, min(MAX_QUALITY_SCORE, score))
        scores[item.id] = score

    return scores


def get_best_value_product(search_query: str) -> Dict[str, Any]:
    """
    Find the best value product using Fiscus Index algorithm.
    
    Algorithm Steps:
        1. Fetch candidate products matching query
        2. Filter to items with price_per_100g data
        3. Analyze ingredient quality
        4. Calculate Fiscus Index for each
        5. Rank and return results
    
    Fiscus Index = Quality_Score / Price_per_100g
    Higher is better: maximizes quality while minimizing price.
    
    Args:
        search_query: Product name to search for.
    
    Returns:
        Dict with format:
        {
            "query": "buckwheat",
            "winner": {...},      // Best value product
            "all_candidates": [...] // All analyzed products
        }
    
    Note:
        Requires Premium subscription in production.
    """
    if not search_query or not search_query.strip():
        return {"error": "Search query is required"}

    logger.info(f"Smart selector analyzing: '{search_query}'")

    # Find matching products
    products = Product.objects.filter(
        name__icontains=search_query.strip()
    )

    if not products.exists():
        return {
            "query": search_query,
            "error": "No products found matching query"
        }

    # Get store items with unit pricing
    candidates = StoreItem.objects.filter(
        product__in=products,
        price_per_100g__isnull=False,
        price_per_100g__gt=0
    ).select_related('product', 'store')

    if not candidates.exists():
        return {
            "query": search_query,
            "error": "No candidates found with unit pricing"
        }

    logger.debug(f"Found {candidates.count()} candidates for analysis")

    # Analyze quality
    quality_scores = mock_analyze_ingredients(list(candidates))

    # Calculate Fiscus Index and build ranked list
    ranked_list = _calculate_fiscus_index(candidates, quality_scores)

    # Update quality scores in database (batch update)
    _update_quality_scores(candidates, quality_scores)

    # Sort by Fiscus Index (descending)
    ranked_list.sort(key=lambda x: x["fiscus_index"], reverse=True)

    winner = ranked_list[0] if ranked_list else None

    return {
        "query": search_query,
        "winner": winner,
        "all_candidates": ranked_list
    }


def _calculate_fiscus_index(
    candidates,
    quality_scores: Dict[int, int]
) -> List[Dict[str, Any]]:
    """
    Calculate Fiscus Index for each candidate.
    
    Args:
        candidates: QuerySet of StoreItem objects.
        quality_scores: Dict of item_id -> quality_score.
    
    Returns:
        List of candidate dicts with calculated indices.
    """
    results = []

    for item in candidates:
        quality_score = quality_scores.get(item.id, DEFAULT_QUALITY_SCORE)
        price_per_100g = float(item.price_per_100g)

        # Calculate index (avoid division by zero)
        if price_per_100g > 0:
            fiscus_index = quality_score / price_per_100g
        else:
            fiscus_index = 0.0

        results.append({
            "item_id": item.id,
            "product_name": item.product.name,
            "store_name": item.store.name,
            "price": float(item.price),
            "price_per_100g": price_per_100g,
            "quality_score": quality_score,
            "fiscus_index": round(fiscus_index, 4),
            "ingredients": item.ingredients_text or ""
        })

    return results


def _update_quality_scores(
    candidates,
    quality_scores: Dict[int, int]
) -> None:
    """
    Bulk update quality scores in database.
    
    Args:
        candidates: QuerySet of StoreItem objects.
        quality_scores: Dict of item_id -> quality_score.
    """
    items_to_update = []
    
    for item in candidates:
        new_score = quality_scores.get(item.id)
        if new_score is not None and item.quality_score != new_score:
            item.quality_score = new_score
            items_to_update.append(item)

    if items_to_update:
        StoreItem.objects.bulk_update(
            items_to_update,
            ['quality_score'],
            batch_size=100
        )
        logger.debug(f"Updated quality scores for {len(items_to_update)} items")
