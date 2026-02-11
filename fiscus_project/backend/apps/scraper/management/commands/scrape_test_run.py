from django.core.management.base import BaseCommand
from apps.scraper.engine import ATBScraper, SilpoScraper

class Command(BaseCommand):
    help = 'Test the scraper engine on a specific URL'

    def add_arguments(self, parser):
        parser.add_argument('url', type=str, help='Product URL to scrape')
        parser.add_argument('--store', type=str, default='atb', help='Store type (atb/silpo)')

    def handle(self, *args, **options):
        url = options['url']
        store = options['store'].lower()

        self.stdout.write(f"Starting scrape for {url} using {store} scraper...")

        if store == 'silpo':
            scraper = SilpoScraper(headless=True)
        else:
            scraper = ATBScraper(headless=True)

        try:
            result = scraper.scrape_product(url)
            if result.get('status') == 'success':
                self.stdout.write(self.style.SUCCESS(f"Successfully scraped: {result}"))
            else:
                self.stdout.write(self.style.ERROR(f"Failed to scrape: {result.get('error')}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Exception during scrape: {e}"))
