"""
Scraper Factory — auto-discovers registered scrapers.

Scrapers register themselves via ``@register_scraper(...)`` in base.py.
This factory simply reads the registry — **no manual imports needed**.

Adding a new store
------------------
1. Create ``stores/newstore.py``
2. Use ``@register_scraper("newstore.com")``
3. Done — factory picks it up automatically via auto-discovery.
"""

from __future__ import annotations

import logging
from typing import List
from urllib.parse import urlparse

from apps.scraper.stores.base import BaseScraper, get_registry

logger = logging.getLogger("fiscus.scrapers.factory")


class ScraperFactory:
    """
    Domain → Scraper resolver.

    Uses the global registry populated by ``@register_scraper`` decorators.
    No hardcoded domain map — fully driven by what's been imported.

    >>> factory = ScraperFactory()
    >>> scraper = factory.get_scraper("https://www.atbmarket.com/catalog/123")
    >>> type(scraper).__name__
    'ATBScraper'
    """

    def get_scraper(self, url: str, *, headless: bool = True) -> BaseScraper:
        """Return the appropriate scraper for *url*."""
        domain = urlparse(url).netloc.lower()
        if not domain:
            raise ValueError(f"Invalid URL (no domain): '{url}'")

        registry = get_registry()
        scraper_cls = registry.get(domain)
        if scraper_cls is None:
            # Try stripping www. prefix as fallback
            alt_domain = domain.removeprefix("www.")
            scraper_cls = registry.get(alt_domain)

        if scraper_cls is None:
            raise ValueError(
                f"No scraper for domain '{domain}'. "
                f"Registered: {', '.join(sorted(registry))}"
            )
        return scraper_cls(headless=headless)

    @staticmethod
    def supported_domains() -> List[str]:
        """List all domains that have a registered scraper."""
        return sorted(get_registry().keys())

    @staticmethod
    def supported_stores() -> List[str]:
        """List unique store names."""
        return sorted({cls.STORE_NAME for cls in get_registry().values()})
