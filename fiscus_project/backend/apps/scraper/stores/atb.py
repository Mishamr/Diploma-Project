"""
ATB Market scraper (atbmarket.com).

Parses server-rendered category listing pages with lazy-loaded images.
"""

import logging
import time
from typing import Dict, List

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from .base import BaseScraper, register_scraper, clean_price

logger = logging.getLogger("fiscus.scrapers.atb")


@register_scraper("atbmarket.com", "www.atbmarket.com")
class ATBScraper(BaseScraper):
    STORE_NAME = "АТБ"
    BASE_URL = "https://www.atbmarket.com"

    SEL_CARD = (
        ".catalog-item, "
        ".product-catalog__item, "
        ".product-list__item, "
        "[data-product-id]"
    )
    SEL_NAME = (
        ".catalog-item__title, "
        ".product-catalog__title, "
        ".product-title, "
        "a[title]"
    )
    SEL_PRICE = (
        ".product-price__top, "
        ".catalog-item__price, "
        ".price, "
        "[data-price]"
    )

    def set_store_context(self, driver, store_metadata: dict) -> None:
        """
        ATB: Set store location via Cookies + Region Selector Modal.
        
        Workflow:
        1. Inject cookie with store ID
        2. Wait for region selector to appear
        3. Select Lviv city
        4. Select specific store from dropdown
        5. Refresh to apply
        """
        try:
            external_store_id = store_metadata.get("external_store_id")
            address = store_metadata.get("address")
            
            logger.info(f"[ATB] Setting store context: {address} (ID: {external_store_id})")
            
            # 1. Inject store ID cookie
            driver.add_cookie({
                'name': 'selectedStore',
                'value': external_store_id,
                'domain': '.atbmarket.com',
                'path': '/',
            })
            
            # 2. Close any "Allow Cookies" modal
            try:
                cookie_btn = WebDriverWait(driver, 3).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, ".cookie-policy__button, .btn-cookies"))
                )
                cookie_btn.click()
                logger.debug("[ATB] Closed cookie modal")
            except:
                pass
            
            # 3. Click region/store selector
            try:
                loc_selector = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, ".region-selector, .header-geo, .city-selector"))
                )
                loc_selector.click()
                self._random_delay(0.5, 1.0)
            except Exception as e:
                logger.warning(f"[ATB] Region selector not found: {e}")
                return
            
            # 4. Type city name
            try:
                city_input = WebDriverWait(driver, 5).until(
                    EC.visibility_of_element_located((By.CSS_SELECTOR, "input[placeholder*='місто'], input[placeholder*='Введіть']"))
                )
                city_input.clear()
                city_input.send_keys("Львів")
                self._random_delay(1, 1.5)
            except Exception as e:
                logger.warning(f"[ATB] City input not found: {e}")
                return
            
            # 5. Click Lviv from dropdown (or use specific address if provided)
            try:
                city_option = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.XPATH, "//li[contains(text(), 'Львів')]"))
                )
                city_option.click()
                self._random_delay(1, 2)
            except Exception as e:
                logger.warning(f"[ATB] Lviv option not found: {e}")
                return
            
            # 6. Select specific store from list (or closest match to address)
            try:
                # Try to find store by address substring
                store_options = driver.find_elements(By.CSS_SELECTOR, ".store-item, [data-store-address]")
                selected = False
                
                for opt in store_options:
                    opt_text = opt.get_attribute("textContent") or opt.get_attribute("data-store-address") or ""
                    
                    # Match by external_store_id or address substring
                    if external_store_id in opt_text or address.split(",")[0] in opt_text:
                        opt.click()
                        selected = True
                        logger.info(f"[ATB] Selected store: {opt_text.strip()}")
                        break
                
                if not selected:
                    logger.warning(f"[ATB] Store {address} not found, using first available")
                    if store_options:
                        store_options[0].click()
                
                self._random_delay(2, 3)
                
            except Exception as e:
                logger.warning(f"[ATB] Store selection failed: {e}")
        
        except Exception as e:
            logger.error(f"[ATB] Failed to set store context: {e}")

    def scrape_category(self, url: str, store_metadata: dict = None) -> List[Dict[str, object]]:
        """
        Scrape ATB category page for a specific store location.
        """
        logger.info(f"[ATB] Scraping: {url}")
        results: List[Dict] = []

        with self._get_driver() as driver:
            driver.get(url)
            
            # CRITICAL: Set store context BEFORE scraping
            if store_metadata:
                self.set_store_context(driver, store_metadata)
            
            self._random_delay(2, 4)
            self._scroll_page(driver, times=3, distance=800)

            soup = self._get_soup(driver)
            cards = soup.select(self.SEL_CARD)
            logger.debug(f"[ATB] Found {len(cards)} product cards")

            for card in cards:
                try:
                    # Filter: Skip unavailable products
                    if "disabled" in card.get("class", []) or card.select_one(".product-unavailable"):
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
                        "external_store_id": store_metadata.get("external_store_id", "atb-default") if store_metadata else "atb-default",
                        "name": name,
                        "price": price,
                        "image_url": image_url,
                        "product_url": href or url,
                        "in_stock": True,
                    })
                except Exception as exc:
                    logger.warning(f"[ATB] Skipping card: {exc}")

        logger.info(f"[ATB] Scraped {len(results)} items")
        return results
