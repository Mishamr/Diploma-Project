#!/usr/bin/env python
"""
Standalone scheduler for Fiscus Scraper.

Run this script as a persistent service/daemon if you prefer
not to use system Cron or Celery Beat for scheduling.

Usage:
    python manage.py run_scheduler
"""

import time
import logging
import schedule
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.scraper.tasks import scrape_all_items_periodic

logger = logging.getLogger("fiscus.scheduler")

class Command(BaseCommand):
    help = 'Runs the standalone scheduler for scraping tasks'

    def handle(self, *args, **options):
        logger.info("Starting Fiscus Scheduler Service...")
        
        # Schedule the job
        schedule.every().day.at("23:50").do(self.run_scrape_job)
        
        logger.info("Scheduler started via `schedule` library.")
        logger.info("Job scheduled for: Daily at 23:50")

        try:
            while True:
                schedule.run_pending()
                time.sleep(60)
        except KeyboardInterrupt:
            logger.info("Scheduler stopped by user.")

    def run_scrape_job(self):
        """Wrapper to run the Celery task synchronously or async."""
        logger.info("⏰ Triggering scheduled scrape job...")
        try:
            # We call .delay() to offload to Celery workers if available
            # Or call directly if you want synchronous execution (not recommended for long tasks)
            task = scrape_all_items_periodic.delay()
            logger.info(f"✅ Scrape task dispatched. ID: {task.id}")
        except Exception as e:
            logger.error(f"❌ Failed to dispatch scrape task: {e}")
