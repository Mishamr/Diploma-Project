"""
Product matcher — fuzzy matching across chains.
Replaces unreliable EAN extraction with name + weight + brand matching.
"""

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Weight patterns in Ukrainian product names
_WEIGHT_PATTERNS = [
    (r'(\d+(?:[.,]\d+)?)\s*кг', 'kg', 1.0),
    (r'(\d+(?:[.,]\d+)?)\s*г(?:р)?', 'g', 0.001),
    (r'(\d+(?:[.,]\d+)?)\s*л', 'l', 1.0),
    (r'(\d+(?:[.,]\d+)?)\s*мл', 'ml', 0.001),
    (r'(\d+(?:[.,]\d+)?)\s*шт', 'pcs', 1.0),
]

# Words to remove during normalization
_STOP_WORDS = {
    'тм', 'пе', 'пет', 'ст', 'бут', 'пак', 'уп',
    'упаковка', 'штука', 'банка', 'пляшка',
}

# Chain-specific private labels to avoid cross-matching
PRIVATE_LABELS = {
    'atb': {'своя лінія', 'розумний вибір', 'de luxe', 'спецзамовлення', 'выгодная цена'},
    'silpo': {'повна чаша', 'премія', 'premiya', 'лавка традицій', 'власна кондитерська'},
    'auchan': {'ашан', 'pouce', 'кожен день', 'gold', 'actuel'},
}


class ProductMatcher:
    """Match scraped products across chains without EAN codes."""

    def normalize(self, name: str) -> str:
        """
        Normalize product name for matching.
        'Батон нарізний Хліб Київ 500г' → 'батон нарізний 0.5кг'
        """
        if not name:
            return ''

        text = name.lower().strip()

        # Remove special characters but keep Ukrainian letters
        text = re.sub(r'[^\w\sа-яіїєґ\d.,]', ' ', text)

        # Normalize weight to kg
        for pattern, unit, multiplier in _WEIGHT_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                value = float(match.group(1).replace(',', '.'))
                kg_value = value * multiplier
                text = re.sub(pattern, '', text, flags=re.IGNORECASE)
                if unit in ('kg', 'g'):
                    text += f' {kg_value}кг'
                elif unit in ('l', 'ml'):
                    text += f' {kg_value}л'
                break

        # Remove stop words
        words = text.split()
        words = [w for w in words if w not in _STOP_WORDS and len(w) > 1]

        return ' '.join(words).strip()

    def extract_features(self, name: str) -> dict:
        """
        Extract structured features from product name.
        Returns: {base_name, brand, weight_kg, unit}
        """
        if not name:
            return {'base_name': '', 'brand': '', 'weight_kg': None, 'unit': 'шт'}

        text = name.strip()

        # Extract weight
        weight_kg = None
        unit = 'шт'
        for pattern, u, multiplier in _WEIGHT_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                value = float(match.group(1).replace(',', '.'))
                weight_kg = value * multiplier
                unit = u
                text = re.sub(pattern, '', text, flags=re.IGNORECASE)
                break

        # Try to extract brand (usually in quotes or after keyword)
        brand = ''
        brand_match = re.search(r'["\«](.+?)["\»]', text)
        if brand_match:
            brand = brand_match.group(1).strip()
            text = text.replace(brand_match.group(0), '')

        base_name = re.sub(r'\s+', ' ', text).strip()

        return {
            'base_name': base_name,
            'brand': brand,
            'weight_kg': weight_kg,
            'unit': unit,
        }

    def find_match(self, scraped_name: str, store_chain: str) -> Optional['Product']:
        """
        Find matching Product in DB or create new one.

        Strategy:
        1. Normalize name
        2. Try exact match on normalized_name
        3. Fuzzy match (Levenshtein ratio > 0.85)
        4. Weight + brand cross-check
        5. Return best match or create new Product
        """
        from apps.core.models import Product

        normalized = self.normalize(scraped_name)
        features = self.extract_features(scraped_name)

        if not normalized:
            return None

        # 1. Exact match on normalized name
        exact = Product.objects.filter(normalized_name=normalized).first()
        if exact:
            return exact

        # 2. Fuzzy match
        try:
            from thefuzz import fuzz
            candidates = Product.objects.filter(
                normalized_name__icontains=normalized[:10]
            )[:50]

            best_match = None
            best_ratio = 0

            for candidate in candidates:
                # ── Symmetric Private Label Protection ────────────────
                # Calculate which private labels each side has
                incoming_labels = set()
                candidate_labels = set()
                
                for chain, labels in PRIVATE_LABELS.items():
                    for label in labels:
                        if label in normalized:
                            incoming_labels.add(chain)
                        if label in candidate.normalized_name:
                            candidate_labels.add(chain)
                
                # If either has private labels from DIFFERENT chains, skip
                if incoming_labels and candidate_labels:
                    if not (incoming_labels & candidate_labels): # No overlap
                        continue
                # If only one has private labels, and it's NOT the current chain's, skip
                # (e.g. Silpo product matching generic ATB product is okay ONLY if Silpo product is generic)
                elif candidate_labels and store_chain not in candidate_labels:
                    continue
                elif incoming_labels and store_chain not in incoming_labels:
                    # This shouldn't happen as incoming is from store_chain
                    pass

                ratio = fuzz.ratio(normalized, candidate.normalized_name) / 100.0

                # Bonus for matching weight (stricter: 0.005 instead of 0.01)
                if features['weight_kg'] and candidate.weight_kg:
                    if abs(features['weight_kg'] - candidate.weight_kg) < 0.005:
                        ratio += 0.1

                # Bonus for matching brand (only if not a private label brand)
                if features['brand'] and candidate.brand:
                    if features['brand'].lower() == candidate.brand.lower():
                        ratio += 0.05

                if ratio > best_ratio:
                    best_ratio = ratio
                    best_match = candidate

            # Higher threshold for cross-chain matching to avoid "Своя Марка" issues
            if best_match and best_ratio > 0.92:
                return best_match
        except ImportError:
            logger.warning("thefuzz not installed, skipping fuzzy matching")

        # 3. Create new product
        product = Product.objects.create(
            name=scraped_name,
            normalized_name=normalized,
            brand=features.get('brand') or '',
            weight=str(features.get('weight_kg')) if features.get('weight_kg') is not None else '',
            weight_kg=features.get('weight_kg'),
            unit=features.get('unit') or 'шт',
        )

        logger.info(f"[Matcher] Created new product: {product.name}")
        return product

    def similarity(self, name1: str, name2: str) -> float:
        """Calculate similarity between two product names."""
        n1 = self.normalize(name1)
        n2 = self.normalize(name2)

        if not n1 or not n2:
            return 0.0

        if n1 == n2:
            return 1.0

        try:
            from thefuzz import fuzz
            return fuzz.ratio(n1, n2) / 100.0
        except ImportError:
            # Fallback: simple word overlap
            words1 = set(n1.split())
            words2 = set(n2.split())
            if not words1 or not words2:
                return 0.0
            overlap = words1 & words2
            return len(overlap) / max(len(words1), len(words2))
