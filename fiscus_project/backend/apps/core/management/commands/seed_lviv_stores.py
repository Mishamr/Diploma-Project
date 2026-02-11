from django.core.management.base import BaseCommand
from apps.core.models import Store

class Command(BaseCommand):
    help = 'Seeds the database with 10 Lviv retail chains'

    def handle(self, *args, **kwargs):
        # Coordinates around Lviv Opera House as base
        # Stores slightly scattered for demo purposes
        STORES_DATA = [
            # 1. ATB - Base
            {
                "name": "АТБ",
                "url_base": "https://atbmarket.com",
                "latitude": 49.844,
                "longitude": 24.025,
            },
            # 2. Rukavychka - Local
            {
                "name": "Рукавичка",
                "url_base": "https://market.rukavychka.ua",
                "latitude": 49.841,
                "longitude": 24.030,
            },
            # 3. Blyzenko - Near Home
            {
                "name": "Близенько",
                "url_base": "https://online.blyzenko.ua",
                "latitude": 49.838,
                "longitude": 24.022,
            },
            # 4. Silpo - Premium
            {
                "name": "Сільпо",
                "url_base": "https://shop.silpo.ua",
                "latitude": 49.849,
                "longitude": 24.022, # Forum Lviv
            },
            # 5. Auchan - Hypermarket
            {
                "name": "Ашан",
                "url_base": "https://auchan.zakaz.ua",
                "latitude": 49.773, # Auchan Sokilnyky (Far)
                "longitude": 24.012,
            },
            # 6. SiMi - Snacks
            {
                "name": "Сімі",
                "url_base": "https://sim23.ua",
                "latitude": 49.842,
                "longitude": 24.032,
            },
            # 7. SPAR - Franchise
            {
                "name": "SPAR",
                "url_base": "https://spar.ua",
                "latitude": 49.835,
                "longitude": 24.010,
            },
            # 8. Arsen - Old School
            {
                "name": "Арсен",
                "url_base": "https://arsen.zakaz.ua",
                "latitude": 49.824,
                "longitude": 24.035,
            },
            # 9. Metro - Wholesale
            {
                "name": "METRO",
                "url_base": "https://metro.zakaz.ua",
                "latitude": 49.850, # George Washington St (Far)
                "longitude": 24.080,
            },
            # 10. Thrash! - Discounter
            {
                "name": "Thrash! Траш!",
                "url_base": "https://thrash.ua",
                "latitude": 49.846,
                "longitude": 24.015,
            }
        ]

        self.stdout.write("Seeding Lviv stores...")
        
        for store_data in STORES_DATA:
            store, created = Store.objects.get_or_create(
                name=store_data['name'],
                defaults={
                    'url_base': store_data['url_base'],
                    'latitude': store_data['latitude'],
                    'longitude': store_data['longitude']
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created: {store.name}"))
            else:
                self.stdout.write(f"Exists: {store.name}")
        
        self.stdout.write(self.style.SUCCESS("Done!"))
