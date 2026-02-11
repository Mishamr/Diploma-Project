import random
import time
from typing import List, Dict, Optional
from apps.core.models import Store, Product, StoreItem

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
    
    def get_comparison(self, product_name: str):
        # In a real app, this would call Celery tasks
        # For demo speed, we use the simulation scraper
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
