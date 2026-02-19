"""
Base scraper class, shared utilities, and auto-registration registry.

Adding a new store
------------------
1. Create ``stores/newstore.py``
2. Decorate your class with ``@register_scraper("newstore.com", "www.newstore.com")``
3. Done — no other files need to change.

Example::

    from apps.scraper.stores.base import BaseScraper, register_scraper, clean_price

    @register_scraper("newstore.com", "www.newstore.com")
    class NewStoreScraper(BaseScraper):
        STORE_NAME = "NewStore"
        ...
"""

from __future__ import annotations

import abc
import logging
import os
import re
import time
import random
from contextlib import contextmanager
from typing import Dict, List, Optional, Type

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import WebDriverException

logger = logging.getLogger("fiscus.scrapers")

# ─── Global registry ─────────────────────────────────────────────────
_SCRAPER_REGISTRY: Dict[str, Type["BaseScraper"]] = {}


def register_scraper(*domains: str):
    """
    Class decorator that registers a scraper for one or more domains.

    Usage::

        @register_scraper("atbmarket.com", "www.atbmarket.com")
        class ATBScraper(BaseScraper):
            STORE_NAME = "ATB"
            ...

    After import, ``ScraperFactory`` will automatically know about it.
    """

    def wrapper(cls: Type[BaseScraper]) -> Type[BaseScraper]:
        for domain in domains:
            _SCRAPER_REGISTRY[domain.lower()] = cls
        return cls

    return wrapper


def get_registry() -> Dict[str, Type["BaseScraper"]]:
    """Return the current domain → scraper mapping (read-only copy)."""
    return dict(_SCRAPER_REGISTRY)


# ─── Helpers ──────────────────────────────────────────────────────────
# Matches one or more digit groups (with optional thousands separator)
# followed by optional decimal part.
# Examples: "39,90", "1234.56", "42", "1 234,56" (after space removal)
_PRICE_RE = re.compile(r"(\d[\d]*(?:[.,]\d+)?)")
PLACEHOLDER_IMAGE = "https://placehold.co/400x400/1a1a2e/4ecca3?text=No+Image"


def clean_price(raw: str) -> Optional[float]:
    """
    Convert Ukrainian price strings to float.

    '39,90 грн'  → 39.90
    '1 234,56'   → 1234.56
    '42.00 ₴'    → 42.00
    '1234'       → 1234.0
    """
    if not raw:
        return None
    # Remove all whitespace, non-breaking spaces, currency symbols
    text = re.sub(r"[\s\xa0₴грнuah]", "", raw, flags=re.IGNORECASE)
    if not text:
        return None

    match = _PRICE_RE.search(text)
    if not match:
        return None

    value = match.group(1).replace(",", ".")
    try:
        result = round(float(value), 2)
        if result <= 0:
            return None
        return result
    except (ValueError, TypeError):
        return None


# ─── Base Class ───────────────────────────────────────────────────────
class BaseScraper(abc.ABC):
    """
    Abstract base for every store scraper.

    Provides:
        • Chrome driver lifecycle via context manager
        • Anti-detection configuration
        • BeautifulSoup helper
        • Safe image extraction
        • Random delay between actions
        • Page scrolling

    Subclasses MUST set ``STORE_NAME`` and implement ``scrape_category``.
    """

    STORE_NAME: str = "Unknown"

    def __init__(self, headless: bool = True):
        self.headless = headless

    @contextmanager
    def _get_driver(self):
        """Context-managed headless Chrome with anti-detection."""
        opts = Options()
        if self.headless:
            opts.add_argument("--headless=new")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
        opts.add_argument("--disable-gpu")
        opts.add_argument("--disable-blink-features=AutomationControlled")
        opts.add_argument("--window-size=1920,1080")
        opts.add_argument(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        )
        opts.add_experimental_option("excludeSwitches", ["enable-logging", "enable-automation"])
        opts.add_experimental_option("useAutomationExtension", False)

        # Support remote Selenium Grid via env var
        remote_url = os.environ.get("SELENIUM_REMOTE_URL")
        driver = None

        try:
            if remote_url:
                driver = webdriver.Remote(
                    command_executor=remote_url,
                    options=opts,
                )
            else:
                try:
                    from webdriver_manager.chrome import ChromeDriverManager
                    service = Service(ChromeDriverManager().install())
                except Exception:
                    service = Service()
                driver = webdriver.Chrome(service=service, options=opts)

            driver.set_page_load_timeout(40)
            driver.implicitly_wait(5)
            driver.execute_cdp_cmd(
                "Page.addScriptToEvaluateOnNewDocument",
                {"source": "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"},
            )
            yield driver
        except WebDriverException as exc:
            logger.error("WebDriver failed: %s", exc)
            raise
        finally:
            if driver:
                try:
                    driver.quit()
                except Exception:
                    pass

    def _random_delay(self, lo: float = 1.0, hi: float = 3.0) -> None:
        """Sleep a random duration to mimic human behavior."""
        time.sleep(random.uniform(lo, hi))

    def _get_soup(self, driver) -> BeautifulSoup:
        """Return parsed page source."""
        return BeautifulSoup(driver.page_source, "html.parser")

    def _safe_img(self, tag, attr: str = "src") -> str:
        """Extract image URL from tag, return placeholder if invalid."""
        if not tag:
            return PLACEHOLDER_IMAGE
        url = tag.get(attr) or tag.get("data-src") or tag.get("data-lazy") or ""
        if not url or url.startswith("data:") or "placeholder" in url or "no-photo" in url:
            return PLACEHOLDER_IMAGE
        if url.startswith("//"):
            url = "https:" + url
        elif not url.startswith("http"):
            return PLACEHOLDER_IMAGE
        return url

    def _scroll_page(self, driver, times: int = 3, distance: int = 700) -> None:
        """Scroll down the page to trigger lazy-loading."""
        for _ in range(times):
            driver.execute_script(f"window.scrollBy(0, {distance});")
            self._random_delay(0.4, 0.8)

    @abc.abstractmethod
    def set_store_context(self, driver, store_metadata: dict) -> None:
        """
        CRITICAL: Set the physical store location BEFORE scraping.
        
        Must be implemented by every subclass (ATB, Silpo, Auchan, etc).
        Called at the start of scrape_category() to ensure products are fetched
        for the correct physical location, not a default/random store.
        
        Args:
            driver (selenium.WebDriver): Headless Chrome instance.
            store_metadata (dict): Retailer-specific store identification:
                {
                    "external_store_id": "atb-lviv-gorodocka",  # ID from DB
                    "chain_name": "АТБ",
                    "address": "вул. Городоцька, 48",
                    "latitude": 49.844,
                    "longitude": 24.025,
                }
        
        Implementation Guidelines:
        ──────────────────────────
        1. **Via Cookies** (stateless, fast):
           driver.add_cookie({'name': 'storeId', 'value': '123', 'domain': 'atbmarket.com'})
           
        2. **Via LocalStorage** (for SPA):
           driver.execute_script(f"localStorage.setItem('activeStore', '{store_id}');")
           
        3. **Via UI Click** (for dynamic dropdowns):
           - Wait for store selector button
           - Click it
           - Type region/city name
           - Select from dropdown
           - Confirm
           
        4. **Via Search Params** (if retailer uses URLs):
           driver.get(f"{self.BASE_URL}?store={store_id}&city=Lviv")
        
        IMPORTANT: After setting context, always call `driver.refresh()` or wait for new page load,
        so that the next scrape_category() call gets fresh prices for THIS specific store.
        
        Raises:
            Any exception during store selection should be logged as WARNING,
            not ERROR, because the scraper can fall back to defaults.
        
        Example Implementation (ATB):
        ───────────────────────────
            try:
                # Inject cookies for store selection
                store_id = store_metadata['external_store_id']
                driver.add_cookie({
                    'name': 'selectedStore',
                    'value': store_id,
                    'domain': '.atbmarket.com'
                })
                driver.refresh()
                time.sleep(2)
            except Exception as e:
                logger.warning(f"Store context failed: {e}. Using default.")
        """

    @abc.abstractmethod
    def scrape_category(self, url: str, store_metadata: dict = None) -> List[Dict[str, object]]:
        """
        Scrape a category page and extract product listings for a specific store.

        Args:
            url (str): Category page URL from the retailer.
            store_metadata (dict): Metadata for the store context:
                {
                    "external_store_id": "atb-lviv-gorodocka",
                    "chain_name": "АТБ",
                    "address": "вул. Городоцька, 48",
                    "latitude": 49.844,
                    "longitude": 24.025,
                }

        Returns:
            List[Dict[str, object]]: Each dict MUST have keys:
                - external_store_id: Retailer's store ID
                - chain_name: Chain name (АТБ, Сільпо, etc)
                - name: Product name
                - price: Price in UAH (float)
                - image_url: Product image URL
                - product_url: Link to product page
                - in_stock: Boolean, is product available
        
        Implementation flow:
        ───────────────────
        1. Initialize Selenium driver
        2. Load the category URL
        3. Call set_store_context(driver, store_metadata)
        4. Wait for products to load (especially for React/SPA)
        5. Extract product cards from HTML
        6. For each card:
           - Filter out unavailable products (out_of_stock, disabled, etc)
           - Parse name, price, image, URL
           - Append to results list
        7. Return results
        """

    def scrape_product(self, url: str, store_metadata: dict = None) -> Dict[str, object]:
        """
        Scrape a single product page (used by Celery tasks).

        Default implementation scrapes the page as a category of one.
        Override in subclasses for better single-product parsing.
        
        Args:
            url (str): Product page URL.
            store_metadata (dict): Store identification metadata.

        Returns:
            Dict with keys: status, price, image_url, name, error, external_store_id
        """
        try:
            results = self.scrape_category(url, store_metadata=store_metadata)
            if results:
                product = results[0]
                return {
                    "status": "success",
                    "price": product.get("price"),
                    "image_url": product.get("image_url"),
                    "name": product.get("name"),
                    "external_store_id": product.get("external_store_id"),
                }
            return {"status": "error", "error": "No products found on page"}
        except Exception as exc:
            return {"status": "error", "error": str(exc)}
