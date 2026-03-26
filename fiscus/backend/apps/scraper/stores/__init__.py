"""
Store scrapers package.
Auto-imports all scraper modules to trigger @register decorators.
"""

# Import scrapers to register them
from . import atb  # noqa: F401
from . import auchan  # noqa: F401
from . import silpo  # noqa: F401
from .factory import ScraperFactory  # noqa: F401
