"""
Store scrapers package.
Auto-imports all scraper modules to trigger @register decorators.
"""

from .factory import ScraperFactory  # noqa: F401

# Import scrapers to register them
from . import atb  # noqa: F401
from . import silpo  # noqa: F401
from . import auchan  # noqa: F401

