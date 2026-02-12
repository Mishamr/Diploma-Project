"""
ATB Market scraper (atbmarket.com).

Parses server-rendered category listing pages with lazy-loaded images.
"""

import logging
from typing import Dict, List

from apps.scraper.stores.base import BaseScraper, register_scraper, clean_price

logger = logging.getLogger("fiscus.scrapers.atb")


@register_scraper("atbmarket.com", "www.atbmarket.com")
class ATBScraper(BaseScraper):
    STORE_NAME = "ATB"
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

    def scrape_category(self, url: str) -> List[Dict[str, object]]:
        logger.info("Loading category: %s", url)
        results: List[Dict] = []

        with self._get_driver() as driver:
            driver.get(url)
            self._random_delay(2, 4)
            self._scroll_page(driver, times=3, distance=800)

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
