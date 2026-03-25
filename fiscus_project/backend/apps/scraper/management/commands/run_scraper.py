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
        from apps.core.models import Chain, Store
        from apps.scraper.main import run_all, run_scraper

        shop_id_input = options.get('shop_id')

        if options['all_chains'] or not options['chain']:
            self.stdout.write(self.style.NOTICE('▶ Scraping ALL chains...'))
            # When scraping all, run_all needs to handle store mapping internally or we skip it for now
            # To be safe, we pass shop_id=1 as fallback
            run_all(shop_id=shop_id_input or 1)
            self.stdout.write(self.style.SUCCESS('✓ Done!'))
        else:
            chain_slug = options['chain']
            
            # Automatically find or create Chain and Store to avoid "not found" errors
            chain_obj, _ = Chain.objects.get_or_create(
                slug=chain_slug, 
                defaults={'name': chain_slug.capitalize(), 'scraper_type': 'light'}
            )
            store_obj = Store.objects.filter(chain=chain_obj).first()
            if not store_obj:
                store_obj = Store.objects.create(
                    chain=chain_obj, 
                    name=f'Головний {chain_obj.name}', 
                    city='Київ'
                )
            
            # Use the actual store ID for this chain
            actual_shop_id = store_obj.id
            if shop_id_input != '1': # If user explicitly provided a shop ID, respect it
                actual_shop_id = shop_id_input

            self.stdout.write(self.style.NOTICE(f'▶ Scraping: {chain_slug} (Store ID: {actual_shop_id})'))
            run_scraper(chain_slug, shop_id=actual_shop_id)
            self.stdout.write(self.style.SUCCESS(f'✓ Done: {chain_slug}'))
