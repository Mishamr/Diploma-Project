"""
Silpo scraper (silpo.ua).

React SPA — requires explicit WebDriverWait for the product grid.
"""

import logging
from typing import Dict, List

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

from apps.scraper.stores.base import BaseScraper, register_scraper, clean_price

logger = logging.getLogger("fiscus.scrapers.silpo")


@register_scraper("silpo.ua", "www.silpo.ua", "shop.silpo.ua")
class SilpoScraper(BaseScraper):
    STORE_NAME = "Silpo"
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

    def scrape_category(self, url: str) -> List[Dict[str, object]]:
        logger.info("Loading category: %s", url)
        results: List[Dict] = []

        with self._get_driver() as driver:
            driver.get(url)

            try:
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located(
                        (By.CSS_SELECTOR, self.SEL_CARD.split(",")[0].strip())
                    )
                )
            except TimeoutException:
                logger.warning("Timed out waiting for products on %s", url)
                return results

            self._random_delay(2, 4)
            self._scroll_page(driver, times=5, distance=600)

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
