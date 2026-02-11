"""
Promotions Scraper for Ukrainian grocery stores.

Scrapes promotional/sale items from store websites.
Returns 20 promo products per store for display in the app.
"""
import logging
import random
from typing import List, Dict, Any
from decimal import Decimal

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException

logger = logging.getLogger(__name__)


# Store configurations with promo page URLs
STORE_CONFIGS = {
    'atb': {
        'name': 'АТБ',
        'promo_url': 'https://www.atbmarket.com/aktsii',
        'selectors': {
            'product_card': '.product-item, .product-card, [class*="product"]',
            'name': '.product-title, .product-name, h3',
            'price': '.product-price, .price',
            'old_price': '.old-price, .price-old, [class*="old"]',
            'image': 'img',
        }
    },
    'silpo': {
        'name': 'Сільпо',
        'promo_url': 'https://silpo.ua/uk/actions',
        'selectors': {
            'product_card': '.product-card, .action-item',
            'name': '.product-title, h3',
            'price': '.price-value, .product-price',
            'old_price': '.old-price',
            'image': 'img',
        }
    },
    'rukavychka': {
        'name': 'Рукавичка',
        'promo_url': 'https://market.rukavychka.ua/akcii/',
        'selectors': {}
    },
    'auchan': {
        'name': 'Ашан',
        'promo_url': 'https://auchan.zakaz.ua/uk/special_offers/',
        'selectors': {}
    },
    'metro': {
        'name': 'METRO',
        'promo_url': 'https://metro.zakaz.ua/uk/special_offers/',
        'selectors': {}
    },
    'fora': {
        'name': 'Фора',
        'promo_url': 'https://fora.ua/akcii',
        'selectors': {}
    },
    'novus': {
        'name': 'NOVUS',
        'promo_url': 'https://novus.zakaz.ua/uk/special_offers/',
        'selectors': {}
    },
    'varus': {
        'name': 'VARUS',
        'promo_url': 'https://varus.ua/akcii',
        'selectors': {}
    },
    'epicentr': {
        'name': 'Епіцентр',
        'promo_url': 'https://epicentrk.ua/actions/',
        'selectors': {}
    },
    'thrash': {
        'name': 'Tra\u0161!',
        'promo_url': 'https://thrash.ua/aktsii',
        'selectors': {}
    }
}


# Demo promotional products for stores without working scrapers
DEMO_PROMOTIONS = [
    {'name': 'Молоко Галичина 2.5% 900мл', 'price': 32.90, 'old_price': 42.90, 'category': 'Молочні', 'discount': 23, 'image_url': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Хліб Київхліб Український 700г', 'price': 21.50, 'old_price': 28.50, 'category': 'Хлібобулочні', 'discount': 25, 'image_url': 'https://images.unsplash.com/photo-1598373182133-52452f7691f6?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Яйця курячі С1 10шт', 'price': 45.90, 'old_price': 59.90, 'category': 'Яйця', 'discount': 23, 'image_url': 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Олія Олейна соняшникова 1л', 'price': 52.90, 'old_price': 69.90, 'category': 'Олія', 'discount': 24, 'image_url': 'https://images.unsplash.com/photo-1474979266404-7eaacbcdbf41?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Цукор білий 1кг', 'price': 32.50, 'old_price': 41.90, 'category': 'Бакалія', 'discount': 22, 'image_url': 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Гречка Хуторок 800г', 'price': 38.90, 'old_price': 52.90, 'category': 'Крупи', 'discount': 26, 'image_url': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Макарони Чумак спагетті 400г', 'price': 24.90, 'old_price': 32.90, 'category': 'Бакалія', 'discount': 24, 'image_url': 'https://images.unsplash.com/photo-1551462147-37885acc36f1?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Курка філе охолоджене 1кг', 'price': 129.00, 'old_price': 169.00, 'category': "М'ясо", 'discount': 24, 'image_url': 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Свинина шия 1кг', 'price': 159.00, 'old_price': 199.00, 'category': "М'ясо", 'discount': 20, 'image_url': 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Сир Звени Гора 50% 200г', 'price': 79.90, 'old_price': 99.90, 'category': 'Молочні', 'discount': 20, 'image_url': 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Кефір Яготинський 2.5% 900г', 'price': 34.90, 'old_price': 44.90, 'category': 'Молочні', 'discount': 22, 'image_url': 'https://images.unsplash.com/photo-1626120032639-71f654b05a76?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Масло Президент 82.5% 200г', 'price': 74.90, 'old_price': 94.90, 'category': 'Молочні', 'discount': 21, 'image_url': 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Coca-Cola 1.5л', 'price': 28.90, 'old_price': 38.90, 'category': 'Напої', 'discount': 26, 'image_url': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Вода Моршинська 1.5л', 'price': 17.90, 'old_price': 23.90, 'category': 'Напої', 'discount': 25, 'image_url': 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Сік Sandora апельсин 1л', 'price': 42.90, 'old_price': 54.90, 'category': 'Напої', 'discount': 22, 'image_url': 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Кава Jacobs Monarch 100г', 'price': 89.90, 'old_price': 119.90, 'category': 'Кава/Чай', 'discount': 25, 'image_url': 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Чай Lipton чорний 100п', 'price': 79.90, 'old_price': 99.90, 'category': 'Кава/Чай', 'discount': 20, 'image_url': 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Шоколад Roshen молочний 90г', 'price': 32.90, 'old_price': 42.90, 'category': 'Солодощі', 'discount': 23, 'image_url': 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Печиво Oreo 154г', 'price': 44.90, 'old_price': 59.90, 'category': 'Солодощі', 'discount': 25, 'image_url': 'https://images.unsplash.com/photo-1499636138143-bd649025e811?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Чіпси Lay\'s сметана 120г', 'price': 39.90, 'old_price': 52.90, 'category': 'Снеки', 'discount': 25, 'image_url': 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Картопля Україна 1кг', 'price': 14.90, 'old_price': 22.90, 'category': 'Овочі', 'discount': 35, 'image_url': 'https://images.unsplash.com/photo-1518977676601-b53f82a6b69d?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Морква 1кг', 'price': 16.90, 'old_price': 24.90, 'category': 'Овочі', 'discount': 32, 'image_url': 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Яблука Голден 1кг', 'price': 32.90, 'old_price': 45.90, 'category': 'Фрукти', 'discount': 28, 'image_url': 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=300&q=80'},
    {'name': 'Банани 1кг', 'price': 42.90, 'old_price': 54.90, 'category': 'Фрукти', 'discount': 22, 'image_url': 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=300&q=80'},
]


class PromotionsScraper:
    """
    Scrapes promotional products from Ukrainian grocery store websites.
    Falls back to demo data if scraping fails.
    """
    
    def __init__(self, headless: bool = True):
        self.options = Options()
        if headless:
            self.options.add_argument("--headless")
        self.options.add_argument("--no-sandbox")
        self.options.add_argument("--disable-dev-shm-usage")
        self.options.add_argument("--disable-gpu")
        self.options.add_argument("--window-size=1920,1080")
        self.options.add_argument(
            "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
    
    def get_store_list(self) -> List[Dict[str, str]]:
        """Returns list of available stores."""
        return [
            {'id': key, 'name': config['name'], 'promo_url': config['promo_url']}
            for key, config in STORE_CONFIGS.items()
        ]
    
    def get_promotions(self, store_id: str, limit: int = 20) -> Dict[str, Any]:
        """
        Get promotional products from a specific store.
        
        Args:
            store_id: Store identifier (e.g., 'atb', 'silpo')
            limit: Maximum number of products to return
            
        Returns:
            Dict with store info and list of promotional products
        """
        if store_id not in STORE_CONFIGS:
            return {'error': f'Unknown store: {store_id}'}
        
        config = STORE_CONFIGS[store_id]
        
        # Try real scraping for stores with selectors
        if config.get('selectors'):
            try:
                products = self._scrape_store(config, limit)
                if products:
                    return {
                        'store': config['name'],
                        'store_id': store_id,
                        'source': 'live',
                        'products': products
                    }
            except Exception as e:
                logger.warning(f"Scraping failed for {store_id}: {e}")
        
        # Fall back to demo data
        return self._get_demo_promotions(store_id, config['name'], limit)
    
    def _scrape_store(self, config: Dict, limit: int) -> List[Dict]:
        """Actually scrape a store's promo page."""
        # This would use Selenium to scrape real data
        # For now, returning empty to trigger demo fallback
        logger.info(f"Would scrape: {config['promo_url']}")
        return []
    
    def _get_demo_promotions(self, store_id: str, store_name: str, limit: int) -> Dict[str, Any]:
        """Generate demo promotional data for a store."""
        # Shuffle and pick items
        products = random.sample(DEMO_PROMOTIONS, min(limit, len(DEMO_PROMOTIONS)))
        
        # Add unique IDs and store info
        result_products = []
        for idx, product in enumerate(products, 1):
            result_products.append({
                'id': f'{store_id}_{idx}',
                'name': product['name'],
                'price': product['price'],
                'old_price': product['old_price'],
                'discount': product['discount'],
                'category': product['category'],
                'store': store_name,
                'image_url': None,  # Would be scraped
            })
        
        return {
            'store': store_name,
            'store_id': store_id,
            'source': 'demo',
            'products': result_products
        }


# Singleton instance for use in views
promotions_scraper = PromotionsScraper()


def get_store_promotions(store_id: str, limit: int = 20) -> Dict[str, Any]:
    """
    Public API function to get store promotions.
    
    Args:
        store_id: Store identifier
        limit: Max products to return
        
    Returns:
        Dict with store info and promotional products
    """
    return promotions_scraper.get_promotions(store_id, limit)


def get_all_stores() -> List[Dict[str, str]]:
    """Returns list of all available stores."""
    return promotions_scraper.get_store_list()
