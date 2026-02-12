"""
Novus scraper (novus.online).

Server-rendered catalog pages.
"""

import logging
from typing import Dict, List

from .base import BaseScraper, register_scraper, clean_price

logger = logging.getLogger("fiscus.scrapers.novus")


@register_scraper("novus.online", "www.novus.online")
class NovusScraper(BaseScraper):
    STORE_NAME = "Novus"
    BASE_URL = "https://novus.online"

    SEL_CARD = (
        ".product-card, "
        ".catalog-product, "
        ".product-item, "
        "[data-product]"
    )
    SEL_NAME = (
        ".product-card__name, "
        ".product-title, "
        ".catalog-product__name"
    )
    SEL_PRICE = (
        ".product-card__price, "
        ".price, "
        ".product-price"
    )

    def scrape_category(self, url: str) -> List[Dict[str, object]]:
        logger.info("Loading category: %s", url)
        results: List[Dict] = []

        with self._get_driver() as driver:
            driver.get(url)
            self._random_delay(2, 4)
            self._scroll_page(driver, times=4, distance=700)

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
