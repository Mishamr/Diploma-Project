"""
Silpo scraper (silpo.ua).

React SPA — requires explicit WebDriverWait for the product grid.
"""

import logging
import time
from typing import Dict, List

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

from .base import BaseScraper, register_scraper, clean_price

logger = logging.getLogger("fiscus.scrapers.silpo")


@register_scraper("silpo.ua", "www.silpo.ua", "shop.silpo.ua")
class SilpoScraper(BaseScraper):
    STORE_NAME = "Сільпо"
    BASE_URL = "https://silpo.ua"

    SEL_CARD = (
        ".products-list__item, "
        ".product-card, "
        "[data-test='product-card'], "
        ".product-list-item"
    )
    SEL_NAME = (
        ".product-card__title, "
        "[data-test='product-title'], "
        ".product-title"
    )
    SEL_PRICE = (
        ".product-card__price, "
        ".ft-product-price, "
        "[data-test='product-price'], "
        ".product-price__main"
    )

    def set_store_context(self, driver, store_metadata: dict) -> None:
        """
        Silpo: Set store location via LocalStorage + Cookies.
        
        Silpo is a React SPA that stores active store ID in browser storage.
        
        Workflow:
        1. Inject activeStoreId into LocalStorage
        2. Set cookie with store ID
        3. Refresh page to apply
        """
        try:
            external_store_id = store_metadata.get("external_store_id", "silpo-lviv-forum")
            address = store_metadata.get("address", "")
            
            logger.info(f"[Silpo] Setting store context: {address} (ID: {external_store_id})")
            
            # Extract numeric store ID from external_store_id or use default
            # Silpo uses numeric IDs like "2043" for their stores
            # external_store_id format: "silpo-lviv-forum" → need to map to actual store ID
            store_id_map = {
                "silpo-lviv-forum": "2043",
                "silpo-lviv-skymall": "2044",
                # Add more mappings as needed
            }
            numeric_store_id = store_id_map.get(external_store_id, "2043")
            
            # 1. Inject LocalStorage and Cookie
            script = f"""
                localStorage.setItem('activeStoreId', '{numeric_store_id}');
                localStorage.setItem('selectedStoreId', '{numeric_store_id}');
                document.cookie = "storeId={numeric_store_id}; path=/; domain=.silpo.ua";
            """
            driver.execute_script(script)
            logger.debug(f"[Silpo] Injected store ID: {numeric_store_id}")
            
            # 2. Refresh page to apply the store context
            driver.refresh()
            self._random_delay(2, 3)
            logger.info(f"[Silpo] Page refreshed with store context")
            
        except Exception as e:
            logger.error(f"[Silpo] Failed to set store context: {e}")

    def scrape_category(self, url: str, store_metadata: dict = None) -> List[Dict[str, object]]:
        """
        Scrape Silpo category page for a specific store.
        """
        logger.info(f"[Silpo] Scraping: {url}")
        results: List[Dict] = []

        with self._get_driver() as driver:
            driver.get(url)
            
            # Set store context BEFORE waiting for products
            if store_metadata:
                self.set_store_context(driver, store_metadata)

            try:
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located(
                        (By.CSS_SELECTOR, self.SEL_CARD.split(",")[0].strip())
                    )
                )
            except TimeoutException:
                logger.warning(f"[Silpo] Timed out waiting for products on {url}")
                return results

            self._random_delay(2, 4)
            self._scroll_page(driver, times=5, distance=600)

            soup = self._get_soup(driver)
            cards = soup.select(self.SEL_CARD)
            logger.debug(f"[Silpo] Found {len(cards)} product cards")

            for card in cards:
                try:
                    # Filter: Skip unavailable items
                    if card.select_one(".out-of-stock, .is-disabled") or "is-ended" in card.get("class", []):
                        continue

                    name_el = card.select_one(self.SEL_NAME)
                    name = name_el.get_text(strip=True) if name_el else None
                    if not name:
                        continue

                    price_el = card.select_one(self.SEL_PRICE)
                    raw_price = price_el.get_text(strip=True) if price_el else ""
                    price = clean_price(raw_price)
                    if price is None:
                        continue

                    link_el = card.select_one("a[href]")
                    href = link_el["href"] if link_el else ""
                    if href and not href.startswith("http"):
                        href = self.BASE_URL + href

                    img_el = card.select_one("img")
                    image_url = self._safe_img(img_el)

                    results.append({
                        "chain_name": self.STORE_NAME,
                        "external_store_id": store_metadata.get("external_store_id", "silpo-lviv-forum") if store_metadata else "silpo-lviv-forum",
                        "name": name,
                        "price": price,
                        "image_url": image_url,
                        "product_url": href or url,
                        "in_stock": True,
                    })
                except Exception as exc:
                    logger.warning(f"[Silpo] Skipping card: {exc}")

        logger.info(f"[Silpo] Scraped {len(results)} items")
