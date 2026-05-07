import logging
import os
from apscheduler.schedulers.background import BackgroundScheduler
from django_apscheduler.jobstores import DjangoJobStore
from django.core.management import call_command

logger = logging.getLogger(__name__)

def run_scrapers_task():
    """
    Автоматичний запуск скрапінгу для АТБ, Сільпо та Ашан.
    Працює прямо на Render.
    """
    logger.info("Starting autonomous cloud scraping task...")
    stores = ['atb', 'silpo', 'auchan']
    for store in stores:
        try:
            logger.info(f"Scraping {store}...")
            call_command('run_scraper', store)
        except Exception as e:
            logger.error(f"Error scraping {store}: {e}")
    logger.info("Autonomous scraping task finished.")

def start_scheduler():
    """
    Ініціалізація та запуск планувальника.
    """
    # Запускаємо тільки якщо це основний процес (щоб не було дублів при DEBUG=True або gunicorn workers)
    if os.environ.get('RUN_MAIN') == 'true' or os.environ.get('GUNICORN_WORKER') == 'true':
        return

    scheduler = BackgroundScheduler()
    scheduler.add_jobstore(DjangoJobStore(), "default")
    
    # Запуск кожні 24 години
    scheduler.add_job(
        run_scrapers_task,
        trigger="interval",
        hours=24,
        id="daily_scrape",
        max_instances=1,
        replace_existing=True,
    )
    
    scheduler.start()
    logger.info("Cloud Scraper Scheduler started (Interval: 24h)")
