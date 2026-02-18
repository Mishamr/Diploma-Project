import os
import sys
import logging
from apps.scraper.stores.silpo import SilpoScraper

# Setup Django (needed for logging config mostly)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_silpo")

def test_silpo():
    url = "https://silpo.ua/category/hlibobulochni-virobi-320" # Bread category
    logger.info(f"Testing Silpo Scraper on {url}...")
    
    scraper = SilpoScraper()
    try:
        products = scraper.scrape_category(url)
        logger.info(f"Success! Found {len(products)} products.")
        
        if products:
            logger.info("Sample product:")
            logger.info(products[0])
            
            # Verify data structure
            p = products[0]
            assert "name" in p
            assert "price" in p
            assert "product_url" in p
            assert p["store_name"] == "Silpo"
            print("Verification Passed: Data structure is correct.")
        else:
            logger.warning("No products found. Selector might be broken.")
            
    except Exception as e:
        logger.error(f"Scraper failed: {e}")

if __name__ == "__main__":
    test_silpo()
