"""
Web scraping engine for Fiscus application.

This module provides Selenium-based scrapers for extracting
product prices from Ukrainian grocery store websites.

Supported Stores:
    - ATB (atbmarket.com)
    - Silpo (silpo.ua)
    - Mock scraper for testing

Note:
    Scrapers use Remote Selenium when SELENIUM_REMOTE_URL is set,
    otherwise fall back to local ChromeDriver.
"""
import logging
import os
import re
import random
from contextlib import contextmanager
from decimal import Decimal, InvalidOperation
from typing import Optional, Dict, Any

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    WebDriverException
)

logger = logging.getLogger(__name__)

# Regex for cleaning price strings
PRICE_CLEAN_PATTERN = re.compile(r"[^\d.,]")

# Default timeout for element waits
DEFAULT_TIMEOUT_SECONDS = 10


class BaseScraper:
    """
    Base Selenium scraper with common configuration and helpers.
    
    Provides:
        - Chrome driver setup (local or remote)
        - Price extraction utility
        - Context manager for safe driver cleanup
    
    Attributes:
        remote_url: URL of Remote Selenium Grid (from env).
        options: Chrome options for headless browsing.
    """

    def __init__(self, headless: bool = True):
        """
        Initialize scraper with Chrome options.
        
        Args:
            headless: Run browser in headless mode (default: True).
        """
        self.options = Options()
        
        if headless:
            self.options.add_argument("--headless")
        
        # Required arguments for containerized environments
        self.options.add_argument("--no-sandbox")
        self.options.add_argument("--disable-dev-shm-usage")
        self.options.add_argument("--disable-gpu")
        self.options.add_argument("--window-size=1920,1080")
        
        # User agent to avoid bot detection
        self.options.add_argument(
            "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
        
        self.remote_url = os.environ.get("SELENIUM_REMOTE_URL")
        self._service = None

    @contextmanager
    def get_driver(self):
        """
        Context manager for safe WebDriver lifecycle.
        
        Ensures driver is properly closed even on exceptions.
        
        Yields:
            WebDriver instance.
        
        Example:
            with self.get_driver() as driver:
                driver.get("https://example.com")
        """
        driver = None
        try:
            if self.remote_url:
                logger.info(f"Connecting to Remote Selenium: {self.remote_url}")
                driver = webdriver.Remote(
                    command_executor=self.remote_url,
                    options=self.options
                )
            else:
                # Local ChromeDriver (for development)
                try:
                    from webdriver_manager.chrome import ChromeDriverManager
                    self._service = Service(ChromeDriverManager().install())
                    driver = webdriver.Chrome(
                        service=self._service,
                        options=self.options
                    )
                except Exception as e:
                    logger.error(f"Failed to initialize local ChromeDriver: {e}")
                    raise
            
            yield driver
            
        finally:
            if driver:
                try:
                    driver.quit()
                except Exception as e:
                    logger.warning(f"Error closing driver: {e}")

    def extract_price(self, text: str) -> Optional[Decimal]:
        """
        Extract numeric price from raw text string.
        
        Handles various Ukrainian price formats:
            - "28,50 грн" -> 28.50
            - "42.00 ₴" -> 42.00
            - "1 234,56 UAH" -> 1234.56
        
        Args:
            text: Raw price string from webpage.
        
        Returns:
            Decimal price value or None if parsing fails.
        """
        if not text:
            return None

        # Remove non-numeric characters except . and ,
        clean_text = PRICE_CLEAN_PATTERN.sub("", text)
        
        # Replace comma with dot for decimal parsing
        clean_text = clean_text.replace(",", ".")
        
        # Handle thousands separator (e.g., "1.234.56" -> "1234.56")
        parts = clean_text.split(".")
        if len(parts) > 2:
            # Last part is decimal, rest are thousands
            clean_text = "".join(parts[:-1]) + "." + parts[-1]

        try:
            return Decimal(clean_text)
        except InvalidOperation:
            logger.debug(f"Failed to parse price from: '{text}'")
            return None


class ATBScraper(BaseScraper):
    """
    Scraper for ATB online store (atbmarket.com).
    
    CSS Selectors are based on ATB website structure
    as of 2024. May need updates if site changes.
    """

    PRICE_SELECTOR = ".product-price__top, .product-price"
    TITLE_SELECTOR = "h1.page-title, h1"

    def scrape_product(self, url: str) -> Dict[str, Any]:
        """
        Scrape product details from ATB product page.
        
        Args:
            url: Full URL of the product page.
        
        Returns:
            Dict with keys: price, name, status, error (if any).
        """
        logger.info(f"Scraping ATB product: {url}")
        
        try:
            with self.get_driver() as driver:
                driver.get(url)
                
                # Wait for price element
                price_element = WebDriverWait(driver, DEFAULT_TIMEOUT_SECONDS).until(
                    EC.presence_of_element_located(
                        (By.CSS_SELECTOR, self.PRICE_SELECTOR)
                    )
                )
                price_text = price_element.text
                price = self.extract_price(price_text)

                # Get product title
                title_element = driver.find_element(
                    By.CSS_SELECTOR,
                    self.TITLE_SELECTOR
                )
                title = title_element.text.strip()

                logger.info(f"ATB scraped: '{title}' = {price} UAH")
                
                return {
                    "price": price,
                    "name": title,
                    "status": "success"
                }

        except TimeoutException:
            logger.error(f"Timeout waiting for price element: {url}")
            return {"status": "error", "error": "Page load timeout"}
            
        except NoSuchElementException as e:
            logger.error(f"Element not found on ATB page: {url}")
            return {"status": "error", "error": "Product element not found"}
            
        except WebDriverException as e:
            logger.error(f"WebDriver error scraping ATB: {e}")
            return {"status": "error", "error": f"Browser error: {str(e)}"}
            
        except Exception as e:
            logger.exception(f"Unexpected error scraping ATB: {url}")
            return {"status": "error", "error": str(e)}


class SilpoScraper(BaseScraper):
    """
    Scraper for Silpo online store (silpo.ua).
    
    Note: Silpo may use dynamic content loading.
    Selectors may need adjustment.
    """

    PRICE_SELECTOR = ".product-price, .price__value, [data-price]"
    TITLE_SELECTOR = "h1.product-title, h1[class*='title']"

    def scrape_product(self, url: str) -> Dict[str, Any]:
        """
        Scrape product details from Silpo product page.
        
        Args:
            url: Full URL of the product page.
        
        Returns:
            Dict with keys: price, name, status, error (if any).
        """
        logger.info(f"Scraping Silpo product: {url}")
        
        try:
            with self.get_driver() as driver:
                driver.get(url)
                
                # Wait for price element
                price_element = WebDriverWait(driver, DEFAULT_TIMEOUT_SECONDS).until(
                    EC.presence_of_element_located(
                        (By.CSS_SELECTOR, self.PRICE_SELECTOR)
                    )
                )
                price_text = price_element.text
                price = self.extract_price(price_text)

                # Get product title
                title_element = driver.find_element(
                    By.CSS_SELECTOR,
                    self.TITLE_SELECTOR
                )
                title = title_element.text.strip()

                logger.info(f"Silpo scraped: '{title}' = {price} UAH")
                
                return {
                    "price": price,
                    "name": title,
                    "status": "success"
                }

        except TimeoutException:
            logger.error(f"Timeout waiting for Silpo page: {url}")
            return {"status": "error", "error": "Page load timeout"}
            
        except NoSuchElementException:
            logger.error(f"Element not found on Silpo page: {url}")
            return {"status": "error", "error": "Product element not found"}
            
        except WebDriverException as e:
            logger.error(f"WebDriver error scraping Silpo: {e}")
            return {"status": "error", "error": f"Browser error: {str(e)}"}
            
        except Exception as e:
            logger.exception(f"Unexpected error scraping Silpo: {url}")
            return {"status": "error", "error": str(e)}


class MockScraper(BaseScraper):
    """
    Mock scraper for testing comparison logic.
    
    Generates realistic price data without actual web scraping.
    Useful for development and testing.
    
    Attributes:
        store_name: Name of the mock store.
        base_price: Base price for variance calculation.
    """

    def __init__(self, store_name: str, base_price: float = 100.0):
        """
        Initialize mock scraper.
        
        Args:
            store_name: Display name for the store.
            base_price: Base price around which to generate variance.
        """
        super().__init__(headless=True)
        self.store_name = store_name
        self.base_price = base_price

    def scrape_product_by_name(self, product_name: str) -> Dict[str, Any]:
        """
        Simulate scraping by product name.
        
        Generates a price with ±20% variance from base price.
        
        Args:
            product_name: Name of the product to "scrape".
        
        Returns:
            Dict with store_name, product_name, price, currency.
        """
        # Simulate price variance (-20% to +20%)
        variance = random.uniform(-0.2, 0.2)
        price_value = self.base_price * (1 + variance)

        logger.debug(
            f"Mock scrape: {product_name} @ {self.store_name} = {price_value:.2f}"
        )

        return {
            "store_name": self.store_name,
            "product_name": product_name,
            "price": round(price_value, 2),
            "currency": "UAH"
        }
