"""
Backward-compatibility shim for legacy imports.

All production logic lives in ``apps.scraper.stores.*``.
Import from here or directly from the stores package.
"""

# Re-export everything from the stores package.
# The stores __init__ auto-discovers and registers all scrapers,
# then re-exports their classes into the namespace.
from apps.scraper.stores import *  # noqa: F401,F403
