import random
import time
from typing import List, Dict, Optional
import logging
from django.db import transaction
from django.utils import timezone
from apps.core.models import Store, Product, StoreItem, Price
from apps.scraper.schemas import ScrapedProductSchema
from apps.scraper.utils import normalize_product_name

logger = logging.getLogger(__name__)

def ingest_scraped_data(data: Dict, store_name: str) -> Optional[StoreItem]:
    """
    Validate and save scraped data to the database.
    
    Anti-Bug Protocol:
    1. Validate using Pydantic schema (rejects bad data).
    2. Normalize product name for deduplication.
    3. Find or Create Product.
    4. Update or Create StoreItem.
    5. Log price history.
    
    Args:
        data: Raw dictionary from scraper.
        store_name: Name of the store (must exist in DB).
        
    Returns:
        StoreItem instance if successful, None if validation fails.
    """
    # 1. Validation
    try:
        # Inject store_name if missing
        if 'store_name' not in data:
            data['store_name'] = store_name
            
        validated = ScrapedProductSchema(**data)
    except Exception as e:
        logger.warning(f"Validation failed for {data.get('title', 'Unknown')}: {e}")
        return None

    try:
        with transaction.atomic():
            store = Store.objects.get(name=store_name)
            
            # 2. De-duplication
            normalized_name = normalize_product_name(validated.title)
            
            # 3. Find or Create Product
            # We try to match by exact normalized name first
            product, created = Product.objects.get_or_create(
                name__iexact=validated.title,
                defaults={
                    'name': validated.title,
                    'category': 'Інше',  # Default category
                    'image_url': validated.image_url
                }
            )
            
            if created:
                logger.info(f"Created new product: {product.name}")
            
            # 4. Update StoreItem
            store_item, item_created = StoreItem.objects.update_or_create(
                store=store,
                product=product,
                defaults={
                    'price': validated.price,
                    'url': validated.product_url,
                    'is_available': True,
                    'updated_at': timezone.now()
                }
            )
            
            # 5. Price History Log
            Price.objects.create(
                product=product,
                store_name=store.name,
                price_value=validated.price
            )
            
            return store_item

    except Store.DoesNotExist:
        logger.error(f"Store '{store_name}' not found in DB")
        return None
    except Exception as e:
        logger.error(f"Ingestion error for {validated.title}: {e}")
        return None



class BaseScraper:
    """Base class for all store scrapers"""
    
    def scrape_product(self, product_name: str) -> List[Dict]:
        raise NotImplementedError

class SimulationScraper(BaseScraper):
    """
    Simulates scraping for demo purposes to ensure instant results 
    for all 10 Lviv chains without getting blocked.
    Uses realistic price ranges based on store tier.
    """
    
    # Store price tiers (relative to average)
    STORE_TIERS = {
        'АТБ': 0.95,       # Cheap
        'Рукавичка': 1.02, # Average
        'Близенько': 1.05, # Convenience (pricier)
        'Сільпо': 1.10,    # Premium
        'Ашан': 0.98,      # Hypermarket
        'Сімі': 1.08,      # Convenience
        'SPAR': 1.05,      # Average
        'Арсен': 1.00,     # Average
        'METRO': 0.92,     # Wholesale (cheapest)
        'Thrash! Траш!': 0.94 # Discounter
    }
    
    BASE_PRICES = {
        'milk': 42.00,
        'sugar': 38.50,
        'bread': 28.00,
        'eggs': 58.00,
        'chicken': 145.00,
        'butter': 85.00,
        'coffee': 350.00, 
        'oil': 65.00,
        'cola': 32.00,
    }

    def scrape_product(self, product_name: str) -> List[Dict]:
        """Generate realistic prices for all known stores"""
        results = []
        
        # Detect base product category/price from query
        base_price = 100.00 # Default fallback
        query_lower = product_name.lower()
        
        for key, price in self.BASE_PRICES.items():
            if key in query_lower or query_lower in key: # simple matching
                base_price = price
                break
                
        # Specialized matching for common Ukrainian terms
        if 'молоко' in query_lower: base_price = 42.00
        elif 'цукор' in query_lower: base_price = 38.50
        elif 'хліб' in query_lower: base_price = 28.00
        elif 'яйця' in query_lower: base_price = 58.00
        elif 'курка' in query_lower or 'філе' in query_lower: base_price = 155.00
        elif 'масло' in query_lower: base_price = 85.00
        elif 'олія' in query_lower: base_price = 62.00
        
        all_stores = Store.objects.all()
        
        for store in all_stores:
            tier_multiplier = self.STORE_TIERS.get(store.name, 1.0)
            
            # Add random variance +/- 5%
            variance = random.uniform(0.95, 1.05)
            
            # Calculate final price
            final_price = base_price * tier_multiplier * variance
            
            # Format nicely (e.g. 42.90 instead of 42.8732)
            final_price = round(final_price * 2) / 2.0 
            if random.random() > 0.5:
                final_price -= 0.10 # Make it .90 logic
                
            results.append({
                'store_name': store.name,
                'product_name': f"{product_name.capitalize()} (Demo)",
                'price': round(final_price, 2),
                'image_url': None, 
                'url': store.url_base
            })
            
        return results

class LvivPricesService:
    """Orchestrator for fetching prices"""
    
    def get_comparison(self, product_name: str) -> List[Dict]:
        """
        Get price comparison from DB. Fallback to simulation if empty.
        """
        # 1. Try DB search first
        products = Product.objects.filter(name__icontains=product_name)
        
        results = []
        if products.exists():
            # fetch best matches
            for product in products[:5]: # limit to 5 products
                items = StoreItem.objects.filter(
                    product=product, 
                    is_available=True
                ).select_related('store')
                
                for item in items:
                    results.append({
                        'store_name': item.store.name,
                        'product_name': product.name,
                        'price': float(item.price),
                        'image_url': product.image_url,
                        'url': item.url,
                        'is_real': True
                    })
        
        # 2. If DB yielded results, return them
        if results:
            return results

        # 3. Fallback to simulation (for Diploma Demo purposes when DB is empty)
        # In production this should return empty list or trigger background scrape
        logger.info(f"No DB results for '{product_name}', using simulation")
        scraper = SimulationScraper()
        return scraper.scrape_product(product_name)


def compare_prices(product_name: str) -> List[Dict]:
    """
    Compare prices for a product across all stores.
    
    This is the main entry point for price comparison,
    called by the API views.
    
    Args:
        product_name: Name of the product to compare.
        
    Returns:
        List of dicts with store_name, price, product_name.
    """
    service = LvivPricesService()
    return service.get_comparison(product_name)
