from django.core.management.base import BaseCommand
from apps.core.models import Store

class Command(BaseCommand):
    help = 'Seeds the database with Lviv retail stores (multiple locations per chain)'

    def handle(self, *args, **kwargs):
        """
        Creates Store objects for each physical location.
        external_store_id is crucial for scrapers to know which store to select on the retailer's site.
        """
        STORES_DATA = [
            # ━━━ АТБ ━━━
            {
                "chain_name": "АТБ",
                "address": "вул. Городоцька, 48",
                "external_store_id": "atb-lviv-gorodocka",
                "url_base": "https://atbmarket.com",
                "latitude": 49.844,
                "longitude": 24.025,
            },
            {
                "chain_name": "АТБ",
                "address": "вул. Сихів, 12",
                "external_store_id": "atb-lviv-syhiv",
                "url_base": "https://atbmarket.com",
                "latitude": 49.841,
                "longitude": 24.030,
            },
            {
                "chain_name": "АТБ",
                "address": "Пл. Ринок, 1",
                "external_store_id": "atb-lviv-rynok",
                "url_base": "https://atbmarket.com",
                "latitude": 49.843,
                "longitude": 24.019,
            },
            # ━━━ Сільпо ━━━
            {
                "chain_name": "Сільпо",
                "address": "Ул. Під Дубом, 7б (Forum Lviv)",
                "external_store_id": "silpo-lviv-forum", 
                "url_base": "https://silpo.ua",
                "latitude": 49.849,
                "longitude": 24.022,
            },
            {
                "chain_name": "Сільпо",
                "address": "вул. Богдана Хмельницького, 32 (Sky Mall)",
                "external_store_id": "silpo-lviv-skymall",
                "url_base": "https://silpo.ua",
                "latitude": 49.838,
                "longitude": 24.027,
            },
            # ━━━ Auchan (Ашан) ━━━
            {
                "chain_name": "Auchan",
                "address": "вул. Кульпарківська, 160 (Sokilnyky)",
                "external_store_id": "auchan-lviv-sokil",
                "url_base": "https://auchan.zakaz.ua",
                "latitude": 49.773,
                "longitude": 24.012,
            },
            # ━━━ Рукавичка ━━━
            {
                "chain_name": "Рукавичка",
                "address": "вул. Лісна, 7",
                "external_store_id": "rukavychka-lviv-lisna",
                "url_base": "https://market.rukavychka.ua",
                "latitude": 49.841,
                "longitude": 24.030,
            },
            # ━━━ SPAR ━━━
            {
                "chain_name": "SPAR",
                "address": "вул. Вільна, 25",
                "external_store_id": "spar-lviv-vilna",
                "url_base": "https://spar.ua",
                "latitude": 49.835,
                "longitude": 24.010,
            },
            # ━━━ Інші ━━━
            {
                "chain_name": "Близенько",
                "address": "вул. Деміївська, 10",
                "external_store_id": "blyzenko-lviv-demiivska",
                "url_base": "https://online.blyzenko.ua",
                "latitude": 49.838,
                "longitude": 24.022,
            },
        ]

        self.stdout.write("Seeding Lviv retail stores with external IDs...")
        
        for store_data in STORES_DATA:
            store, created = Store.objects.get_or_create(
                chain_name=store_data['chain_name'],
                address=store_data['address'],
                defaults={
                    'external_store_id': store_data['external_store_id'],
                    'url_base': store_data['url_base'],
                    'latitude': store_data['latitude'],
                    'longitude': store_data['longitude'],
                    'is_active': True,
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(
                    f"✓ Created: {store.chain_name} @ {store.address} "
                    f"(ID: {store.external_store_id})"
                ))
            else:
                self.stdout.write(f"✗ Exists: {store.chain_name} @ {store.address}")
        
        self.stdout.write(self.style.SUCCESS("\n✓ Seeding complete!"))
