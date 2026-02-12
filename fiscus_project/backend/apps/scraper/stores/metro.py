"""
Metro scraper (metro.zakaz.ua).

Uses zakaz.ua platform — dynamic content, requires explicit waits.
"""

import logging
from typing import Dict, List

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

from apps.scraper.stores.base import BaseScraper, register_scraper, clean_price

logger = logging.getLogger("fiscus.scrapers.metro")


@register_scraper("metro.zakaz.ua")
class MetroScraper(BaseScraper):
    STORE_NAME = "Metro"
    BASE_URL = "https://metro.zakaz.ua"

    SEL_CARD = (
        ".product-tile, "
        ".CatalogTile, "
        "[data-marker='product'], "
        ".product-card"
    )
    SEL_NAME = (
        ".product-tile__title, "
        ".CatalogTile__title, "
        ".product-title, "
        "h3, h4"
    )
    SEL_PRICE = (
        ".product-tile__price, "
        ".Price, "
        ".product-price, "
        "[data-price]"
    )

    def scrape_category(self, url: str) -> List[Dict[str, object]]:
        logger.info("Loading category: %s", url)
        results: List[Dict] = []

        with self._get_driver() as driver:
            driver.get(url)

            try:
                WebDriverWait(driver, 12).until(
                    EC.presence_of_element_located(
                        (By.CSS_SELECTOR, ".product-tile, .CatalogTile, .product-card")
                    )
                )
            except TimeoutException:
                logger.warning("Timed out on %s", url)
                return results

            self._random_delay(2, 4)
            self._scroll_page(driver, times=4, distance=600)

            soup = self._get_soup(driver)
            cards = soup.select(self.SEL_CARD)
            logger.debug("Found %d raw cards", len(cards))

            for card in cards:
                try:
                    name_el = card.select_one(self.SEL_NAME)
                    name = name_el.get_text(strip=True) if name_el else None
                    if not name:
                        continue

                    price_el = card.select_one(self.SEL_PRICE)
                    price = clean_price(price_el.get_text(strip=True)) if price_el else None
                    if price is None:
                        continue

                    link_el = card.select_one("a[href]")
                    href = link_el["href"] if link_el else ""
                    if href and not href.startswith("http"):
                        href = self.BASE_URL + href

                    img_el = card.select_one("img")
                    image_url = self._safe_img(img_el)

                    results.append({
                        "store_name": self.STORE_NAME,
                        "name": name,
                        "price": price,
                        "image_url": image_url,
                        "product_url": href or url,
                    })
                except Exception as exc:
                    logger.warning("Skipping card: %s", exc)

        logger.info("Scraped %d items from %s", len(results), url)
        return results
