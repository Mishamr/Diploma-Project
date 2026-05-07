"""
Scraper app configuration.
"""

from django.apps import AppConfig


class ScraperConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.scraper"
    verbose_name = "Fiscus Scraper"

    def ready(self):
        # Don't run scheduler during migrations or collectstatic
        import sys
        if 'manage.py' in sys.argv and ('migrate' in sys.argv or 'collectstatic' in sys.argv):
            return
            
        from . import scheduler
        scheduler.start_scheduler()
