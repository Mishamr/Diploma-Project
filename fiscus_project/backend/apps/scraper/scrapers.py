"""
Re-export layer for backward compatibility.

All scraper logic lives in ``apps.scraper.stores.*``.
Import from here or directly from the stores package.
"""

from apps.scraper.stores import *  # noqa: F401,F403
