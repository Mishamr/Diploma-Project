"""
Management command: run_scraper

Usage:
    python manage.py run_scraper atb
    python manage.py run_scraper --all
"""

import logging
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Run product scraper for a chain (atb) or all chains'

    def add_arguments(self, parser):
        parser.add_argument(
            'chain',
            nargs='?',
            default=None,
            help='Chain slug to scrape (e.g. atb). Omit to scrape all.',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            dest='all_chains',
            help='Scrape all registered chains',
        )
        parser.add_argument(
            '--shop-id',
            default='1',
            dest='shop_id',
            help='Shop ID (default: 1)',
        )

    def handle(self, *args, **options):
        from apps.scraper.main import run_scraper, run_all

        shop_id = options['shop_id']

        if options['all_chains'] or not options['chain']:
            self.stdout.write(self.style.NOTICE('▶ Scraping ALL chains...'))
            run_all(shop_id=shop_id)
            self.stdout.write(self.style.SUCCESS('✓ Done!'))
        else:
            chain = options['chain']
            self.stdout.write(self.style.NOTICE(f'▶ Scraping: {chain}'))
            run_scraper(chain, shop_id=shop_id)
            self.stdout.write(self.style.SUCCESS(f'✓ Done: {chain}'))
