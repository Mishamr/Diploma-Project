"""
Scraper app configuration.
"""

from django.apps import AppConfig


class ScraperConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.scraper"
    verbose_name = "Fiscus Scraper"
