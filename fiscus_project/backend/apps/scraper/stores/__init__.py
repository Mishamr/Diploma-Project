"""
Store scraper package with **automatic discovery**.

How it works
------------
On import, this ``__init__`` scans the ``stores/`` directory for Python
modules, imports each one, which triggers their ``@register_scraper``
decorators and populates the global registry.

Adding a new store
------------------
1. Create ``stores/yourstore.py``
2. Decorate your class with ``@register_scraper("domain.com")``
3. **Done.** No other file needs to change — ever.
"""

import importlib
import logging
import pkgutil
from pathlib import Path

logger = logging.getLogger("fiscus.scrapers")

# ── Core exports ──────────────────────────────────────────────────────
from apps.scraper.stores.base import (    # noqa: F401
    BaseScraper,
    register_scraper,
    get_registry,
    clean_price,
    PLACEHOLDER_IMAGE,
)

# ── Auto-discover & import every sibling module ───────────────────────
_PACKAGE_DIR = str(Path(__file__).resolve().parent)
_SKIP = {"base", "factory", "__init__"}

for _finder, _name, _is_pkg in pkgutil.iter_modules([_PACKAGE_DIR]):
    if _name in _SKIP:
        continue
    try:
        importlib.import_module(f"apps.scraper.stores.{_name}")
    except Exception as exc:
        logger.warning("Failed to auto-import store module '%s': %s", _name, exc)

# ── Factory (reads the now-populated registry) ────────────────────────
from apps.scraper.stores.factory import ScraperFactory  # noqa: F401

# ── Re-export all discovered scraper classes by name ──────────────────
# This allows `from apps.scraper.stores import ATBScraper` etc.
_registry = get_registry()
_exported_classes = {}
for _cls in set(_registry.values()):
    _exported_classes[_cls.__name__] = _cls
    globals()[_cls.__name__] = _cls

__all__ = [
    "BaseScraper",
    "register_scraper",
    "get_registry",
    "clean_price",
    "PLACEHOLDER_IMAGE",
    "ScraperFactory",
    *_exported_classes.keys(),
]

logger.debug(
    "Auto-discovered %d store(s): %s",
    len(set(_registry.values())),
    ", ".join(sorted(_exported_classes.keys())),
)
