"""
Utility functions for Fiscus scraper module.

This module provides helper functions for:
    - Price normalization and unit price calculation
    - Product name normalization (canonical form)
"""
import re
import logging
from decimal import Decimal, InvalidOperation
from typing import Optional, Union

logger = logging.getLogger(__name__)

# Regex patterns
WEIGHT_PATTERN = re.compile(
    r"(\d+(?:[.,]\d+)?)\s*(г|g|кг|kg|мл|ml|л|l)",
    re.IGNORECASE
)

NAME_WEIGHT_PATTERN = re.compile(
    r"\b\d+[.,]?\d*\s*(кг|г|л|мл|kg|g|l|ml)\b",
    re.IGNORECASE
)

SPECIAL_CHARS_PATTERN = re.compile(r"[^\w\s]")


def calculate_unit_price(
    price: Union[float, Decimal],
    weight_str: str
) -> Optional[Decimal]:
    """
    Calculate price per 100g/ml from total price and weight string.
    
    Supports multiple weight formats:
        - Grams: "150g", "150 г", "150г"
        - Kilograms: "1kg", "1.5 кг", "1,5кг"
        - Milliliters: "500ml", "500 мл"
        - Liters: "1l", "1 л", "0.5л"
    
    Args:
        price: Total price of the product.
        weight_str: Weight/volume string (e.g., "500g", "1 кг").
    
    Returns:
        Price per 100g/ml as Decimal, or None if parsing fails.
    
    Examples:
        >>> calculate_unit_price(50.0, "500g")
        Decimal('10.00')  # 50 / 500 * 100
        
        >>> calculate_unit_price(100.0, "1kg")
        Decimal('10.00')  # 100 / 1000 * 100
        
        >>> calculate_unit_price(25.0, "250ml")
        Decimal('10.00')  # 25 / 250 * 100
    """
    if not weight_str or price is None:
        return None

    # Normalize input
    weight_normalized = weight_str.lower().strip().replace(",", ".")

    # Extract number and unit
    match = WEIGHT_PATTERN.search(weight_normalized)
    
    if not match:
        logger.debug(f"Could not parse weight from: '{weight_str}'")
        return None

    value_str = match.group(1)
    unit = match.group(2).lower()

    try:
        value = float(value_str)
    except ValueError:
        logger.debug(f"Invalid numeric value in weight: '{weight_str}'")
        return None

    # Convert to base unit (grams or milliliters)
    weight_in_base_units = _convert_to_base_unit(value, unit)
    
    if weight_in_base_units <= 0:
        logger.debug(f"Zero or negative weight: '{weight_str}'")
        return None

    # Calculate price per 100 units
    try:
        price_decimal = Decimal(str(price)) if not isinstance(price, Decimal) else price
        price_per_100 = (price_decimal / Decimal(str(weight_in_base_units))) * Decimal("100")
        return price_per_100.quantize(Decimal("0.01"))
    except (InvalidOperation, ZeroDivisionError) as e:
        logger.debug(f"Calculation error for '{weight_str}': {e}")
        return None


def _convert_to_base_unit(value: float, unit: str) -> float:
    """
    Convert weight/volume to base unit (grams or milliliters).
    
    Args:
        value: Numeric value.
        unit: Unit string (г, g, кг, kg, мл, ml, л, l).
    
    Returns:
        Value in grams/milliliters.
    """
    # Base units (grams, milliliters)
    if unit in ("г", "g", "мл", "ml"):
        return value
    
    # Kilograms, liters -> multiply by 1000
    if unit in ("кг", "kg", "л", "l"):
        return value * 1000.0
    
    return 0.0


def normalize_product_name(raw_name: str) -> str:
    """
    Normalize product name to canonical form for deduplication.
    
    Normalization rules:
        1. Convert to lowercase
        2. Remove weight/volume suffixes (1kg, 500g, etc.)
        3. Remove special characters except spaces
        4. Collapse multiple spaces
        5. Strip leading/trailing whitespace
    
    Args:
        raw_name: Original product name from store.
    
    Returns:
        Normalized canonical name.
    
    Examples:
        >>> normalize_product_name("Гречка Ядриця 1кг")
        "гречка ядриця"
        
        >>> normalize_product_name("Молоко 2.5% 1л ТМ Lactel")
        "молоко 25 тм lactel"
        
        >>> normalize_product_name("Хліб 'Український' 500г")
        "хліб український"
    """
    if not raw_name:
        return ""

    name = raw_name.lower()

    # Remove weight patterns
    name = NAME_WEIGHT_PATTERN.sub("", name)

    # Remove special characters (keep letters, numbers, spaces)
    name = SPECIAL_CHARS_PATTERN.sub("", name)

    # Collapse multiple spaces and strip
    normalized = " ".join(name.split())

    logger.debug(f"Normalized: '{raw_name}' -> '{normalized}'")
    
    return normalized


def extract_weight_from_name(product_name: str) -> Optional[str]:
    """
    Extract weight/volume specification from product name.
    
    Args:
        product_name: Product name possibly containing weight.
    
    Returns:
        Weight string if found, None otherwise.
    
    Examples:
        >>> extract_weight_from_name("Молоко 2.5% 1л")
        "1л"
        
        >>> extract_weight_from_name("Сир кисломолочний 400г")
        "400г"
    """
    if not product_name:
        return None

    match = WEIGHT_PATTERN.search(product_name.lower())
    
    if match:
        return match.group(0)
    
    return None


def clean_price_string(raw_price: str) -> Optional[str]:
    """
    Clean price string by removing currency symbols and whitespace.
    
    Args:
        raw_price: Raw price string from webpage.
    
    Returns:
        Cleaned numeric string, or None if empty.
    
    Examples:
        >>> clean_price_string("42,50 грн")
        "42.50"
        
        >>> clean_price_string("₴ 100.00")
        "100.00"
    """
    if not raw_price:
        return None

    # Remove everything except digits, dots, commas
    cleaned = re.sub(r"[^\d.,]", "", raw_price)
    
    # Replace comma with dot
    cleaned = cleaned.replace(",", ".")
    
    # Handle multiple dots (thousands separator)
    parts = cleaned.split(".")
    if len(parts) > 2:
        cleaned = "".join(parts[:-1]) + "." + parts[-1]
    
    return cleaned if cleaned else None
